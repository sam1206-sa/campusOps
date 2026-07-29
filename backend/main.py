import jwt
import datetime
from flask import Flask, request, jsonify, make_response
from database import db

app = Flask(__name__)

JWT_SECRET = "smart_schedule_agent_secret_key_123"

# Manual CORS Handler
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Authentication Helper
def get_current_user():
    # Handle preflight options requests
    if request.method == 'OPTIONS':
        return None
        
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

def login_required(f):
    import functools
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return make_response('', 204)
        user = get_current_user()
        if not user:
            return jsonify({"message": "Invalid or expired token"}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated

# Handle OPTIONS request globally
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return make_response('', 204)

# ==========================================
# AUTHENTICATION ROUTE
# ==========================================
@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return make_response('', 204)
        
    data = request.get_json()
    if not data or 'userId' not in data or 'role' not in data:
        return jsonify({"message": "User ID and Role are required"}), 400

    clean_id = data['userId'].strip().upper()
    role = data['role'].strip().lower()

    if role == "student":
        students = db.get("students")
        student = next((s for s in students if s["regNo"] == clean_id), None)
        if not student:
            return jsonify({"message": f"Student with Register Number {clean_id} not found."}), 404
        
        token = jwt.encode({
            "regNo": student["regNo"],
            "role": "student",
            "name": student["name"],
            "dept": student["dept"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        return jsonify({"token": token, "user": student})

    elif role == "staff":
        faculties = db.get("faculty")
        faculty = next((f for f in faculties if f["id"] == clean_id), None)
        if not faculty:
            return jsonify({"message": f"Staff with ID {clean_id} not found."}), 404
        
        token = jwt.encode({
            "staffId": faculty["id"],
            "role": "staff",
            "name": faculty["name"],
            "dept": faculty["dept"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        duties = db.get("staffDuties").get(faculty["id"], {"meetings": [], "invigilations": [], "subjectAllocation": []})
        return jsonify({"token": token, "user": {**faculty, "duty": duties}})

    elif role == "admin":
        if clean_id in ["ADMIN001", "ADMIN"]:
            token = jwt.encode({
                "username": "Admin",
                "role": "admin",
                "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
            }, JWT_SECRET, algorithm="HS256")
            return jsonify({"token": token, "user": {"name": "Administrator", "role": "admin", "id": clean_id}})
        else:
            return jsonify({"message": "Invalid Admin credentials."}), 403

    return jsonify({"message": "Invalid role specified."}), 400


# ==========================================
# TIMETABLE ROUTES
# ==========================================
@app.route('/api/timetable/student/<reg_no>', methods=['GET'])
@login_required
def get_student_timetable(reg_no):
    students = db.get("students")
    student = next((s for s in students if s["regNo"] == reg_no), None)
    if not student:
        return jsonify({"message": "Student not found"}), 404
    
    return jsonify({"timetable": db.get("studentTimetable")})

@app.route('/api/timetable/staff/<staff_id>', methods=['GET'])
@login_required
def get_staff_timetable(staff_id):
    timetable = [t for t in db.get("studentTimetable") if t.get("facultyId") == staff_id]
    duties = db.get("staffDuties").get(staff_id, {"meetings": [], "invigilations": [], "subjectAllocation": []})
    return jsonify({"timetable": timetable, "duties": duties})

@app.route('/api/timetable/all', methods=['GET'])
def get_all_timetable():
    return jsonify(db.get("studentTimetable"))

@app.route('/api/timetable/add', methods=['POST'])
@login_required
def add_timetable_slot():
    if request.user.get("role") != "admin":
        return jsonify({"message": "Forbidden"}), 403

    new_slot = request.get_json()
    current_timetable = db.get("studentTimetable")

    # Conflict 1: Faculty booked at same day and slot
    faculty_conflict = next((c for c in current_timetable if 
                             c["day"] == new_slot["day"] and 
                             str(c["slot"]) == str(new_slot["slot"]) and 
                             c["facultyId"] == new_slot["facultyId"] and
                             new_slot["facultyId"] != "-"), None)

    if faculty_conflict:
        return jsonify({
            "message": f"Conflict detected: Faculty {new_slot['facultyName']} is already assigned to subject {faculty_conflict['subjectCode']} in {faculty_conflict['classroom']} at this time."
        }), 400

    # Conflict 2: Classroom booked at same day and slot
    classroom_conflict = next((c for c in current_timetable if 
                               c["day"] == new_slot["day"] and 
                               str(c["slot"]) == str(new_slot["slot"]) and 
                               c["classroom"] == new_slot["classroom"] and
                               new_slot["classroom"] != "-"), None)

    if classroom_conflict:
        return jsonify({
            "message": f"Conflict detected: Classroom {new_slot['classroom']} is already occupied by {classroom_conflict['subjectCode']} taught by {classroom_conflict['facultyName']} at this time."
        }), 400

    # Clean slot representation
    if new_slot.get("slot") not in ["Break", "Lunch"] and str(new_slot.get("slot")).isdigit():
        new_slot["slot"] = int(new_slot["slot"])
        
    db.save("studentTimetable", new_slot)
    
    # Trigger system notification
    notifications = db.get("notifications")
    alert = {
        "id": "N" + str(len(notifications) + 1),
        "role": "all",
        "title": "Timetable Updated",
        "message": f"Timetable updated: {new_slot['subjectName']} ({new_slot['subjectCode']}) added on {new_slot['day']} Period {new_slot['slot']} in {new_slot['classroom']}.",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    db.save("notifications", alert)

    return jsonify({"message": "Timetable slot added successfully", "slot": new_slot})

@app.route('/api/timetable/delete', methods=['POST'])
@login_required
def delete_timetable_slot():
    if request.user.get("role") != "admin":
        return jsonify({"message": "Forbidden"}), 403
    
    req_data = request.get_json()
    day = req_data.get("day")
    slot = req_data.get("slot")
    subjectCode = req_data.get("subjectCode")
    
    current_timetable = db.get("studentTimetable")
    index = -1
    for idx, s in enumerate(current_timetable):
        if s["day"] == day and str(s["slot"]) == str(slot) and s["subjectCode"] == subjectCode:
            index = idx
            break
            
    if index == -1:
        return jsonify({"message": "Timetable slot not found"}), 404

    current_timetable.pop(index)
    db.data["studentTimetable"] = current_timetable
    db.save_to_file()
    
    return jsonify({"message": "Timetable slot removed successfully"})


# ==========================================
# ENTITY ROUTES
# ==========================================
@app.route('/api/entities/classrooms', methods=['GET', 'POST'])
@login_required
def handle_classrooms():
    if request.method == 'POST':
        if request.user.get("role") != "admin":
            return jsonify({"message": "Forbidden"}), 403
        item = request.get_json()
        db.save("classrooms", item)
        return jsonify({"message": "Classroom added successfully", "item": item})
    return jsonify(db.get("classrooms"))

@app.route('/api/entities/faculty', methods=['GET', 'POST'])
@login_required
def handle_faculty():
    if request.method == 'POST':
        if request.user.get("role") != "admin":
            return jsonify({"message": "Forbidden"}), 403
        item = request.get_json()
        db.save("faculty", item)
        return jsonify({"message": "Faculty added successfully", "item": item})
    return jsonify(db.get("faculty"))

@app.route('/api/entities/subjects', methods=['GET', 'POST'])
@login_required
def handle_subjects():
    if request.method == 'POST':
        if request.user.get("role") != "admin":
            return jsonify({"message": "Forbidden"}), 403
        item = request.get_json()
        db.save("subjects", item)
        return jsonify({"message": "Subject added successfully", "item": item})
    return jsonify(db.get("subjects"))

@app.route('/api/entities/departments', methods=['GET'])
def get_departments():
    return jsonify(db.get("departments"))


# ==========================================
# EVENTS & HOLIDAYS ROUTES
# ==========================================
@app.route('/api/events', methods=['GET'])
def get_events_holidays():
    return jsonify({
        "holidays": db.get("holidays"),
        "events": db.get("events")
    })

@app.route('/api/events/holiday', methods=['POST'])
@login_required
def add_holiday():
    if request.user.get("role") != "admin":
        return jsonify({"message": "Forbidden"}), 403
    
    holiday = request.get_json()
    holiday["id"] = "H" + str(len(db.get("holidays")) + 1)
    db.save("holidays", holiday)

    # Publish notification
    alert = {
        "id": "N" + str(len(db.get("notifications")) + 1),
        "role": "all",
        "title": "New Holiday Announced",
        "message": f"{holiday['name']} has been declared a holiday on {holiday['date']}.",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    db.save("notifications", alert)
    return jsonify({"message": "Holiday added successfully", "holiday": holiday})

@app.route('/api/events/event', methods=['POST'])
@login_required
def add_event():
    if request.user.get("role") != "admin":
        return jsonify({"message": "Forbidden"}), 403
    
    event = request.get_json()
    event["id"] = "EV" + str(len(db.get("events")) + 1)
    db.save("events", event)

    # Publish notification
    alert = {
        "id": "N" + str(len(db.get("notifications")) + 1),
        "role": "all",
        "title": "New Event Announced",
        "message": f"Event: '{event['title']}' is scheduled at {event['venue']} on {event['date']}.",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    db.save("notifications", alert)
    return jsonify({"message": "Event added successfully", "event": event})


# ==========================================
# STUDENT & STAFF INTERACTIVE
# ==========================================
@app.route('/api/student/assignments/<reg_no>', methods=['GET'])
@login_required
def get_student_assignments(reg_no):
    return jsonify(db.get("assignments"))

@app.route('/api/student/exams/<reg_no>', methods=['GET'])
@login_required
def get_student_exams(reg_no):
    return jsonify(db.get("exams"))

@app.route('/api/staff/mark-attendance', methods=['POST'])
@login_required
def mark_attendance():
    if request.user.get("role") != "staff":
        return jsonify({"message": "Forbidden"}), 403
    
    data = request.get_json()
    student_reg = data.get("studentRegNo")
    sub_code = data.get("subjectCode")
    present = data.get("present")
    
    students = db.get("students")
    student = next((s for s in students if s["regNo"] == student_reg), None)
    if not student:
        return jsonify({"message": "Student not found"}), 404

    by_subject = student["attendance"]["bySubject"]
    if sub_code not in by_subject:
        by_subject[sub_code] = {"total": 0, "attended": 0}
        
    by_subject[sub_code]["total"] += 1
    if present:
        by_subject[sub_code]["attended"] += 1
        student["attendance"]["attended"] += 1
    
    student["attendance"]["totalClasses"] += 1
    db.save("students", student)
    return jsonify({"message": "Attendance marked successfully", "student": student})


# ==========================================
# NOTIFICATIONS
# ==========================================
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    return jsonify(db.get("notifications"))

@app.route('/api/notifications/publish', methods=['POST'])
@login_required
def publish_notification():
    if request.user.get("role") != "admin":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json()
    alert = {
        "id": "N" + str(len(db.get("notifications")) + 1),
        "role": data.get("role", "all"),
        "title": data.get("title"),
        "message": data.get("message"),
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    db.save("notifications", alert)
    return jsonify({"message": "Notification published successfully", "alert": alert})


# ==========================================
# AI SCHEDULE ASSISTANT (NLP Engine Router)
# ==========================================
@app.route('/api/ai/chat', methods=['POST'])
@login_required
def ai_chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"message": "Message is required"}), 400
        
    query = data['message'].lower()
    user = request.user
    role = user.get("role")
    
    timetable = db.get("studentTimetable")
    assignments = db.get("assignments")
    exams = db.get("exams")
    holidays = db.get("holidays")
    events = db.get("events")
    
    reply = ""
    is_student = (role == "student")
    is_staff = (role == "staff")
    
    # 1. Next class query
    if any(k in query for k in ["next class", "when is my next", "what class is next"]):
        if is_student:
            today_classes = [c for c in timetable if c["day"] == "Monday" and c["slot"] not in ["Break", "Lunch"] and c["subjectCode"] != "FREE"]
            next_class = next((c for c in today_classes if c["slot"] == 3), None)
            if next_class:
                reply = f"Your next class is **{next_class['subjectName']} ({next_class['subjectCode']})** at **{next_class['startTime']}** in room **{next_class['classroom']}**, taught by {next_class['facultyName']}."
            else:
                reply = "You don't have any more classes scheduled for the rest of today!"
        elif is_staff:
            staff_classes = [c for c in timetable if c["day"] == "Monday" and c.get("facultyId") == user.get("staffId")]
            next_class = staff_classes[0] if staff_classes else None
            if next_class:
                reply = f"Your next lecture is **{next_class['subjectName']}** for Year 3 CSE in **{next_class['classroom']}** starting at **{next_class['startTime']}**."
            else:
                reply = "You do not have any classes scheduled to teach today."
        else:
            reply = "Administrators do not have a teaching schedule, but you can inspect timetables in the Admin Panel."

    # 2. Free Slots query
    elif any(k in query for k in ["free slot", "when am i free", "leisure", "free period"]):
        if is_student:
            free_slots = [c for c in timetable if c["subjectCode"] == "FREE"]
            if free_slots:
                desc = ", ".join([f"{s['day']} Period {s['slot']} ({s['startTime']} - {s['endTime']})" for s in free_slots])
                reply = f"You have free slots scheduled for: {desc}. You can use these for self-study or lab work."
            else:
                reply = "You do not have any scheduled free periods this week. Your timetable is fully booked."
        elif is_staff:
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            free_list = []
            for d in days:
                slots_occupied = [c["slot"] for c in timetable if c["day"] == d and c.get("facultyId") == user.get("staffId")]
                free_slots = [s for s in range(1, 7) if s not in slots_occupied]
                if free_slots:
                    free_list.append(f"**{d}**: Period " + ", ".join(map(str, free_slots)))
            reply = "Here are your free teaching periods where you can schedule research, mentoring or meetings:\n\n" + "\n".join(free_list[:3])
            
    # 3. Assignments query
    elif any(k in query for k in ["assignment", "homework", "due"]):
        if is_student:
            pending = [a for a in assignments if a["status"] == "Pending"]
            if pending:
                lst = "\n".join([f"- **{a['title']}** ({a['subjectCode']}) is due on **{a['dueDate']}**" for a in pending])
                reply = f"You have **{len(pending)} pending assignments**:\n{lst}"
            else:
                reply = "Great job! You have submitted all your assignments. No pending deadlines."
        else:
            reply = "You have assigned 3 projects currently. You can view, collect, and grade student submissions under the teaching portal."

    # 4. Meetings and Duties query
    elif any(k in query for k in ["meeting", "invigilation", "duty"]):
        if is_staff:
            duties = db.get("staffDuties").get(user.get("staffId"))
            if duties:
                meet_rep = "\n".join([f"- **{m['title']}** on {m['date']} at {m['time']} in {m['venue']}" for m in duties.get("meetings", [])])
                inv_rep = "\n".join([f"- **{i['examName']}** on {i['date']} at {i['time']} in room {i['room']}" for i in duties.get("invigilations", [])])
                reply = f"Here are your scheduled duties and meetings:\n\n**Meetings:**\n{meet_rep or 'No meetings'}\n\n**Exam Duties:**\n{inv_rep or 'No invigilation duties'}"
            else:
                reply = "You have no scheduled meetings or exam invigilations."
        else:
            reply = "Meetings and duty details are staff-only information. Students can query exam schedules by asking 'When are my exams?'."

    # 5. Exam Schedules
    elif any(k in query for k in ["exam", "test", "midterm"]):
        if exams:
            lst = "\n".join([f"- **{e['subjectName']} ({e['subjectCode']})**: {e['date']} at {e['time']} in Room **{e['room']}**" for e in exams])
            reply = f"Here is the upcoming Semester Exam Schedule:\n{lst}"
        else:
            reply = "No exam schedules have been announced or published yet."

    # 6. Holidays
    elif any(k in query for k in ["holiday", "vacation"]):
        if holidays:
            lst = "\n".join([f"- **{h['name']}**: {h['date']} ({h['description']})" for h in holidays])
            reply = f"Here are the upcoming holidays:\n{lst}"
        else:
            reply = "No upcoming holidays listed on the academic calendar."

    # 7. Timetable conflict detection
    elif any(k in query for k in ["conflict", "overlap"]):
        conflict_list = []
        temp_room = {}
        temp_faculty = {}
        for s in timetable:
            if s["subjectCode"] in ["BREAK", "LUNCH", "FREE"]:
                continue
            r_key = f"{s['day']}-{s['slot']}-{s['classroom']}"
            f_key = f"{s['day']}-{s['slot']}-{s['facultyId']}"
            
            if r_key in temp_room:
                conflict_list.append(f"Room conflict: **{s['classroom']}** is double-booked on {s['day']} Period {s['slot']} (Subjects: {s['subjectCode']} and {temp_room[r_key]['subjectCode']})")
            else:
                temp_room[r_key] = s
                
            if s["facultyId"] != "-" and f_key in temp_faculty:
                conflict_list.append(f"Faculty conflict: **{s['facultyName']}** is double-booked on {s['day']} Period {s['slot']} (Subjects: {s['subjectCode']} and {temp_faculty[f_key]['subjectCode']})")
            elif s["facultyId"] != "-":
                temp_faculty[f_key] = s
                
        if conflict_list:
            reply = "🚨 **Timetable Conflicts Detected!**\n\n" + "\n\n".join(conflict_list) + "\n\n*Please request the Admin to reschedule one of the slots to prevent overlaps.*"
        else:
            reply = "✅ No schedule overlaps or conflicts detected. The timetable allocation is fully consistent and conflict-free!"

    # 8. Schedule Optimization Recommendations
    elif any(k in query for k in ["optimize", "suggest", "improve"]):
        reply = (
            "💡 **AI Schedule Optimization Recommendation:**\n\n"
            "1. **Lab Scheduling**: Group multi-hour Data Structures Lab sessions consecutively (currently Wednesday Period 1-2 & Monday Period 5-6) to maximize setup and coding time.\n"
            "2. **Theory-Lab Balance**: Tuesday afternoon has consecutive Theory classes followed by sports. Consider swapping Tuesday Period 5 and Period 6 to maintain student focus during key algorithms discussion.\n"
            "3. **Room Capacity**: LH-101 is used for CSE Year 3 with a strength of 60, but capacity is exactly 60. To avoid crowding, consider allocating ECE exams to LH-201 instead."
        )
    else:
        name = user.get("name", "User")
        reply = (
            f"Hello {name}, I am your **Smart Schedule Agent AI**. I can assist you with:\n\n"
            "- Showing your **next class** (\"When is my next class?\")\n"
            "- Listing pending **assignments** or **exams**\n"
            "- Highlighting **free periods** (\"When am I free?\")\n"
            "- Checking for **duties / meetings** (Staff)\n"
            "- Scanning for schedule **conflicts** (\"Detect conflicts\")\n"
            "- Requesting timetable **optimizations** (\"Optimize schedule\")\n\n"
            "How can I help you today?"
        )

    return jsonify({"reply": reply})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
