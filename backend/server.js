const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { connectDB, getDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart_schedule_agent_secret_key_123';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database
connectDB();

// Helpers to get collections
const getLocalData = (col) => getDB().get(col);
const saveLocalData = (col, item) => getDB().save(col, item);
const deleteLocalData = (col, key, val) => getDB().delete(col, key, val);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ==========================================
// 1. AUTHENTICATION ROUTE
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ message: 'User ID and Role are required' });
  }

  const cleanId = userId.trim().toUpperCase();

  if (role === 'student') {
    const student = getLocalData('students').find(s => s.regNo === cleanId);
    if (!student) {
      return res.status(404).json({ message: `Student with Register Number ${cleanId} not found.` });
    }
    const token = jwt.sign({ regNo: student.regNo, role: 'student', name: student.name, dept: student.dept }, JWT_SECRET);
    return res.json({ token, user: student });
  } 
  
  if (role === 'staff') {
    const faculty = getLocalData('faculty').find(f => f.id === cleanId);
    if (!faculty) {
      return res.status(404).json({ message: `Staff with ID ${cleanId} not found.` });
    }
    const token = jwt.sign({ staffId: faculty.id, role: 'staff', name: faculty.name, dept: faculty.dept }, JWT_SECRET);
    const staffDuty = getLocalData('staffDuties')[faculty.id] || { meetings: [], invigilations: [], subjectAllocation: [] };
    return res.json({ token, user: { ...faculty, duty: staffDuty } });
  }

  if (role === 'admin') {
    if (cleanId === 'ADMIN001' || cleanId === 'ADMIN') {
      const token = jwt.sign({ username: 'Admin', role: 'admin' }, JWT_SECRET);
      return res.json({ token, user: { name: 'Administrator', role: 'admin', id: cleanId } });
    } else {
      return res.status(403).json({ message: 'Invalid Admin credentials.' });
    }
  }

  return res.status(400).json({ message: 'Invalid role specified.' });
});

// ==========================================
// 2. TIMETABLE ROUTES
// ==========================================

// Get timetable for a student (based on their department/year)
app.get('/api/timetable/student/:regNo', authenticateToken, (req, res) => {
  const student = getLocalData('students').find(s => s.regNo === req.params.regNo);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  
  // For demo, all students are Year 3 CSE Sec A. So we send studentTimetable
  const timetable = getLocalData('studentTimetable');
  res.json({ timetable });
});

// Get timetable for staff (classes they teach)
app.get('/api/timetable/staff/:staffId', authenticateToken, (req, res) => {
  const timetable = getLocalData('studentTimetable').filter(t => t.facultyId === req.params.staffId);
  const duties = getLocalData('staffDuties')[req.params.staffId] || { meetings: [], invigilations: [], subjectAllocation: [] };
  res.json({ timetable, duties });
});

// Get all timetable slots (Admin view)
app.get('/api/timetable/all', (req, res) => {
  res.json(getLocalData('studentTimetable'));
});

// Create/Add Timetable slot + Conflict detection
app.post('/api/timetable/add', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const newSlot = req.body; // { day, slot, startTime, endTime, subjectCode, subjectName, type, classroom, facultyId, facultyName }
  const currentTimetable = getLocalData('studentTimetable');

  // Conflict 1: Faculty booked at same day and slot
  const facultyConflict = currentTimetable.find(c => 
    c.day === newSlot.day && 
    c.slot === newSlot.slot && 
    c.facultyId === newSlot.facultyId &&
    newSlot.facultyId !== '-'
  );

  if (facultyConflict) {
    return res.status(400).json({ 
      errorType: 'FACULTY_CONFLICT',
      message: `Conflict detected: Faculty ${newSlot.facultyName} is already assigned to subject ${facultyConflict.subjectCode} in ${facultyConflict.classroom} at this time.`
    });
  }

  // Conflict 2: Classroom booked at same day and slot
  const classroomConflict = currentTimetable.find(c => 
    c.day === newSlot.day && 
    c.slot === newSlot.slot && 
    c.classroom === newSlot.classroom &&
    newSlot.classroom !== '-'
  );

  if (classroomConflict) {
    return res.status(400).json({ 
      errorType: 'ROOM_CONFLICT',
      message: `Conflict detected: Classroom ${newSlot.classroom} is already occupied by ${classroomConflict.subjectCode} taught by ${classroomConflict.facultyName} at this time.`
    });
  }

  // Save the slot
  saveLocalData('studentTimetable', newSlot);
  
  // Trigger system notification
  const notifications = getLocalData('notifications');
  const alert = {
    id: 'N' + (notifications.length + 1),
    role: 'all',
    title: 'Timetable Updated',
    message: `Timetable updated: ${newSlot.subjectName} (${newSlot.subjectCode}) added on ${newSlot.day} Period ${newSlot.slot} in ${newSlot.classroom}.`,
    timestamp: new Date().toISOString()
  };
  saveLocalData('notifications', alert);

  res.json({ message: 'Timetable slot added successfully', slot: newSlot });
});

// Delete Timetable slot
app.delete('/api/timetable/delete', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { day, slot, subjectCode } = req.body;
  
  const currentTimetable = getLocalData('studentTimetable');
  const index = currentTimetable.findIndex(c => c.day === day && c.slot === slot && c.subjectCode === subjectCode);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Timetable slot not found' });
  }

  currentTimetable.splice(index, 1);
  res.json({ message: 'Timetable slot removed successfully' });
});

// ==========================================
// 3. ENTITY ROUTES (CRUD)
// ==========================================
app.get('/api/entities/classrooms', (req, res) => res.json(getLocalData('classrooms')));
app.post('/api/entities/classrooms', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const item = req.body;
  saveLocalData('classrooms', item);
  res.json({ message: 'Classroom added successfully', item });
});

app.get('/api/entities/faculty', (req, res) => res.json(getLocalData('faculty')));
app.post('/api/entities/faculty', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const item = req.body;
  saveLocalData('faculty', item);
  res.json({ message: 'Faculty added successfully', item });
});

app.get('/api/entities/subjects', (req, res) => res.json(getLocalData('subjects')));
app.post('/api/entities/subjects', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const item = req.body;
  saveLocalData('subjects', item);
  res.json({ message: 'Subject added successfully', item });
});

app.get('/api/entities/departments', (req, res) => res.json(getLocalData('departments')));

// ==========================================
// 4. EVENTS & HOLIDAYS ROUTES
// ==========================================
app.get('/api/events', (req, res) => {
  res.json({
    holidays: getLocalData('holidays'),
    events: getLocalData('events')
  });
});

app.post('/api/events/holiday', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const holiday = req.body;
  holiday.id = 'H' + (getLocalData('holidays').length + 1);
  saveLocalData('holidays', holiday);

  // Trigger system notification
  const alert = {
    id: 'N' + (getLocalData('notifications').length + 1),
    role: 'all',
    title: 'New Holiday Announced',
    message: `${holiday.name} has been declared a holiday on ${holiday.date}.`,
    timestamp: new Date().toISOString()
  };
  saveLocalData('notifications', alert);

  res.json({ message: 'Holiday added successfully', holiday });
});

app.post('/api/events/event', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const event = req.body;
  event.id = 'EV' + (getLocalData('events').length + 1);
  saveLocalData('events', event);

  // Trigger system notification
  const alert = {
    id: 'N' + (getLocalData('notifications').length + 1),
    role: 'all',
    title: 'New Event Announced',
    message: `Event: "${event.title}" is scheduled at ${event.venue} on ${event.date}.`,
    timestamp: new Date().toISOString()
  };
  saveLocalData('notifications', alert);

  res.json({ message: 'Event added successfully', event });
});

// ==========================================
// 5. STUDENT & STAFF EXTRA INTERACTION
// ==========================================
app.get('/api/student/assignments/:regNo', authenticateToken, (req, res) => {
  res.json(getLocalData('assignments'));
});

app.get('/api/student/exams/:regNo', authenticateToken, (req, res) => {
  res.json(getLocalData('exams'));
});

app.post('/api/staff/mark-attendance', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ message: 'Forbidden' });
  const { studentRegNo, subjectCode, present } = req.body;

  const students = getLocalData('students');
  const student = students.find(s => s.regNo === studentRegNo);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  // Update attendance
  if (!student.attendance.bySubject[subjectCode]) {
    student.attendance.bySubject[subjectCode] = { total: 0, attended: 0 };
  }
  student.attendance.bySubject[subjectCode].total += 1;
  if (present) {
    student.attendance.bySubject[subjectCode].attended += 1;
    student.attendance.attended += 1;
  }
  student.attendance.totalClasses += 1;

  saveLocalData('students', student);
  res.json({ message: 'Attendance entered successfully', student });
});

// ==========================================
// 6. NOTIFICATIONS
// ==========================================
app.get('/api/notifications', (req, res) => {
  res.json(getLocalData('notifications'));
});

app.post('/api/notifications/publish', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { title, message, role } = req.body;

  const notifications = getLocalData('notifications');
  const alert = {
    id: 'N' + (notifications.length + 1),
    role: role || 'all',
    title,
    message,
    timestamp: new Date().toISOString()
  };
  saveLocalData('notifications', alert);
  res.json({ message: 'Notification published successfully', alert });
});

// ==========================================
// 7. AI SCHEDULE ASSISTANT (NLP Core Router)
// ==========================================
app.post('/api/ai/chat', authenticateToken, (req, res) => {
  const { message } = req.body;
  const user = req.user; // contains role, name, regNo / staffId, dept
  
  if (!message) return res.status(400).json({ message: 'Message is required' });

  const query = message.toLowerCase();
  let reply = "";
  
  const timetable = getLocalData('studentTimetable');
  const assignments = getLocalData('assignments');
  const exams = getLocalData('exams');
  const holidays = getLocalData('holidays');
  const events = getLocalData('events');

  // Simple Context Helper
  const isStudent = user.role === 'student';
  const isStaff = user.role === 'staff';

  if (query.includes('next class') || query.includes('when is my next') || query.includes('what class is next')) {
    if (isStudent) {
      // Find today's classes
      const todayName = "Monday"; // For simulation, assume today is Monday
      const todayClasses = timetable.filter(c => c.day === todayName && c.slot !== 'Break' && c.slot !== 'Lunch' && c.subjectCode !== 'FREE');
      
      // Let's suggest next class based on period
      // Simulating time at Period 2 (10:15 AM)
      const next = todayClasses.find(c => c.slot === 3);
      if (next) {
        reply = `Your next class is **${next.subjectName} (${next.subjectCode})** at **${next.startTime}** in room **${next.classroom}**, taught by ${next.facultyName}.`;
      } else {
        reply = `You have no more classes scheduled for the rest of today!`;
      }
    } else if (isStaff) {
      const todayName = "Monday";
      const staffClasses = timetable.filter(c => c.day === todayName && c.facultyId === user.staffId && c.slot !== 'Break' && c.slot !== 'Lunch');
      const next = staffClasses[0]; // First class of staff
      if (next) {
        reply = `Your next lecture is **${next.subjectName}** for Year 3 CSE in **${next.classroom}** starting at **${next.startTime}**.`;
      } else {
        reply = `You do not have any teaching classes scheduled for today.`;
      }
    }
  } 
  
  else if (query.includes('free slot') || query.includes('when am i free') || query.includes('leisure') || query.includes('free period')) {
    if (isStudent) {
      const freeSlots = timetable.filter(c => c.subjectCode === 'FREE');
      if (freeSlots.length > 0) {
        const slotsDesc = freeSlots.map(s => `${s.day} Period ${s.slot} (${s.startTime} - ${s.endTime})`).join(', ');
        reply = `You have free slots scheduled for: ${slotsDesc}. You can use these for self-study or lab work.`;
      } else {
        reply = `You do not have any scheduled free periods this week. Your timetable is fully booked.`;
      }
    } else if (isStaff) {
      // Find slots (1 to 6) where staff has no class allocated
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const freeList = [];
      
      days.forEach(day => {
        const slotsOccupied = timetable.filter(c => c.day === day && c.facultyId === user.staffId).map(c => c.slot);
        const dayFree = [];
        for(let s = 1; s <= 6; s++) {
          if (!slotsOccupied.includes(s)) {
            dayFree.push(`Period ${s}`);
          }
        }
        if (dayFree.length > 0) {
          freeList.push(`**${day}**: ${dayFree.join(', ')}`);
        }
      });
      reply = `Here are your free teaching periods where you can schedule research, mentoring or meetings:\n\n` + freeList.slice(0, 3).join('\n');
    }
  } 
  
  else if (query.includes('assignment') || query.includes('homework') || query.includes('due')) {
    if (isStudent) {
      const pending = assignments.filter(a => a.status === 'Pending');
      if (pending.length > 0) {
        reply = `You have **${pending.length} pending assignments**:\n` + pending.map(a => `- **${a.title}** (${a.subjectCode}) is due on **${a.dueDate}**`).join('\n');
      } else {
        reply = `Great job! You have submitted all your assignments. No pending deadlines.`;
      }
    } else {
      reply = `Staff can view and grade student assignments via the Faculty Dashboard panel. You have assigned 3 projects currently.`;
    }
  } 
  
  else if (query.includes('meeting') || query.includes('invigilation') || query.includes('duty')) {
    if (isStaff) {
      const duties = getLocalData('staffDuties')[user.staffId];
      if (duties) {
        const meetRep = duties.meetings.map(m => `- **${m.title}** on ${m.date} at ${m.time} in ${m.venue}`).join('\n');
        const invRep = duties.invigilations.map(i => `- **${i.examName}** on ${i.date} at ${i.time} in room ${i.room}`).join('\n');
        reply = `Here are your scheduled duties and meetings:\n\n**Meetings:**\n${meetRep || 'No meetings'}\n\n**Exam Duties:**\n${invRep || 'No invigilation duties'}`;
      } else {
        reply = `You have no scheduled meetings or exam invigilations.`;
      }
    } else {
      reply = `Meetings are staff-only information. Students can view exam schedules instead by asking "When is my exam?".`;
    }
  } 
  
  else if (query.includes('exam') || query.includes('test') || query.includes('midterm')) {
    if (exams.length > 0) {
      reply = `Here is the upcoming Semester Exam Schedule:\n` + exams.map(e => `- **${e.subjectName} (${e.subjectCode})**: ${e.date} at ${e.time} in Room **${e.room}**`).join('\n');
    } else {
      reply = `No exam schedules have been announced or published yet.`;
    }
  } 
  
  else if (query.includes('holiday') || query.includes('vacation')) {
    if (holidays.length > 0) {
      reply = `Here are the upcoming holidays:\n` + holidays.map(h => `- **${h.name}**: ${h.date} (${h.description})`).join('\n');
    } else {
      reply = `No upcoming holidays listed on the academic calendar.`;
    }
  } 
  
  else if (query.includes('conflict') || query.includes('overlap')) {
    // Check conflicts automatically
    const conflictList = [];
    const tempTable = {}; // key: day-slot-classroom or day-slot-facultyId
    
    timetable.forEach(slot => {
      if (slot.subjectCode === 'BREAK' || slot.subjectCode === 'LUNCH' || slot.subjectCode === 'FREE') return;
      
      const roomKey = `${slot.day}-${slot.slot}-${slot.classroom}`;
      const facultyKey = `${slot.day}-${slot.slot}-${slot.facultyId}`;
      
      if (tempTable[roomKey]) {
        conflictList.push(`Room conflict: **${slot.classroom}** is double-booked on ${slot.day} Period ${slot.slot} (Subjects: ${slot.subjectCode} and ${tempTable[roomKey].subjectCode})`);
      } else {
        tempTable[roomKey] = slot;
      }
      
      if (slot.facultyId !== '-' && tempTable[facultyKey]) {
        conflictList.push(`Faculty conflict: **${slot.facultyName}** is double-booked on ${slot.day} Period ${slot.slot} (Subjects: ${slot.subjectCode} and ${tempTable[facultyKey].subjectCode})`);
      } else if (slot.facultyId !== '-') {
        tempTable[facultyKey] = slot;
      }
    });

    if (conflictList.length > 0) {
      reply = `🚨 **Timetable Conflicts Detected!**\n\n` + conflictList.join('\n\n') + `\n\n*Please request the Admin to reschedule one of the slots to prevent overlaps.*`;
    } else {
      reply = `✅ No schedule overlaps or conflicts detected. The timetable allocation is fully consistent and conflict-free!`;
    }
  } 
  
  else if (query.includes('optimize') || query.includes('suggest') || query.includes('improve')) {
    reply = `💡 **AI Schedule Optimization Recommendation:**\n\n1. **Lab Scheduling**: Group multi-hour Data Structures Lab sessions consecutively (currently Wednesday Period 1-2 & Monday Period 5-6) to maximize setup and coding time.\n2. **Theory-Lab Balance**: Tuesday afternoon has consecutive Theory classes followed by sports. Consider swapping Tuesday Period 5 and Period 6 to maintain student focus during key algorithms discussion.\n3. **Room Capacity**: LH-101 is used for CSE Year 3 with a strength of 60, but capacity is exactly 60. To avoid crowding, consider allocating ECE exams to LH-201 instead.`;
  }
  
  else {
    reply = `Hello ${user.name || 'User'}, I am your **Smart Schedule Agent AI**. I can assist you with:\n\n- Showing your **next class** ("When is my next class?")\n- Listing pending **assignments** or **exams**\n- Highlighting **free periods** ("When am I free?")\n- Checking for **duties / meetings** (Staff)\n- Scanning for schedule **conflicts** ("Detect conflicts")\n- Requesting timetable **optimizations** ("Optimize schedule")\n\nHow can I help you today?`;
  }

  res.json({ reply });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Smart Schedule Agent API running on http://localhost:${PORT}`);
});
