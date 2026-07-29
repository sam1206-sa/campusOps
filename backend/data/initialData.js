// Seed data for Smart Schedule Agent (Student & Staff Portals)

const initialData = {
  departments: [
    { id: "CSE", name: "Computer Science & Engineering" },
    { id: "ECE", name: "Electronics & Communication Engineering" },
    { id: "MECH", name: "Mechanical Engineering" },
    { id: "IT", name: "Information Technology" }
  ],
  
  classrooms: [
    { id: "LH-101", name: "Lecture Hall 101", type: "Theory", capacity: 60, equipment: ["Projector", "AC"] },
    { id: "LH-102", name: "Lecture Hall 102", type: "Theory", capacity: 60, equipment: ["Projector"] },
    { id: "LAB-1", name: "Computer Lab 1", type: "Lab", capacity: 45, equipment: ["PCs", "Projector", "AC"] },
    { id: "LAB-2", name: "Data Structures Lab", type: "Lab", capacity: 40, equipment: ["PCs", "AC"] },
    { id: "LAB-3", name: "Networks & IoT Lab", type: "Lab", capacity: 45, equipment: ["PCs", "IoT Kits", "AC"] },
    { id: "LH-201", name: "Lecture Hall 201", type: "Theory", capacity: 60, equipment: ["Projector"] }
  ],

  subjects: [
    { code: "CS301", name: "Data Structures & Algorithms", type: "Theory", dept: "CSE" },
    { code: "CS302", name: "Database Management Systems", type: "Theory", dept: "CSE" },
    { code: "CS303", name: "Computer Networks", type: "Theory", dept: "CSE" },
    { code: "CS304", name: "Operating Systems", type: "Theory", dept: "CSE" },
    { code: "CS305", name: "Object Oriented Programming", type: "Theory", dept: "CSE" },
    { code: "CS311", name: "Data Structures Lab", type: "Lab", dept: "CSE" },
    { code: "CS312", name: "DBMS Lab", type: "Lab", dept: "CSE" },
    { code: "EC101", name: "Basic Electronics", type: "Theory", dept: "ECE" }
  ],

  faculty: [
    { id: "STAFF201", name: "Dr. Aris Vance", email: "aris.vance@college.edu", dept: "CSE", designation: "Professor" },
    { id: "STAFF202", name: "Prof. Sarah Connor", email: "sarah.connor@college.edu", dept: "CSE", designation: "Assistant Professor" },
    { id: "STAFF203", name: "Dr. Alan Turing", email: "alan.turing@college.edu", dept: "CSE", designation: "Associate Professor" },
    { id: "STAFF204", name: "Prof. Grace Hopper", email: "grace.hopper@college.edu", dept: "CSE", designation: "Professor" },
    { id: "STAFF205", name: "Dr. Richard Feynman", email: "richard.feynman@college.edu", dept: "ECE", designation: "Professor" }
  ],

  students: [
    {
      regNo: "STU1001",
      name: "Alex Mercer",
      dept: "CSE",
      year: 3,
      semester: 5,
      section: "A",
      attendance: {
        totalClasses: 120,
        attended: 104, // 86.6%
        bySubject: {
          "CS301": { total: 24, attended: 22 },
          "CS302": { total: 24, attended: 20 },
          "CS303": { total: 24, attended: 21 },
          "CS304": { total: 24, attended: 19 },
          "CS305": { total: 24, attended: 22 }
        }
      }
    },
    {
      regNo: "STU1002",
      name: "Emma Watson",
      dept: "CSE",
      year: 3,
      semester: 5,
      section: "A",
      attendance: {
        totalClasses: 120,
        attended: 88, // 73.3% - Warning state!
        bySubject: {
          "CS301": { total: 24, attended: 17 },
          "CS302": { total: 24, attended: 18 },
          "CS303": { total: 24, attended: 16 },
          "CS304": { total: 24, attended: 18 },
          "CS305": { total: 24, attended: 19 }
        }
      }
    }
  ],

  // Student Timetable Schedule (For Year 3, Sem 5, Section A)
  // Time Slots:
  // Period 1: 09:00 AM - 10:00 AM
  // Period 2: 10:00 AM - 11:00 AM
  // Break: 11:00 AM - 11:15 AM
  // Period 3: 11:15 AM - 12:15 PM
  // Period 4: 12:15 PM - 01:15 PM
  // Lunch: 01:15 PM - 02:00 PM
  // Period 5: 02:00 PM - 03:00 PM
  // Period 6: 03:00 PM - 04:00 PM
  studentTimetable: [
    // Monday
    { day: "Monday", slot: 1, startTime: "09:00 AM", endTime: "10:00 AM", subjectCode: "CS301", subjectName: "Data Structures & Algorithms", type: "Theory", classroom: "LH-101", facultyId: "STAFF201", facultyName: "Dr. Aris Vance" },
    { day: "Monday", slot: 2, startTime: "10:00 AM", endTime: "11:00 AM", subjectCode: "CS302", subjectName: "Database Management Systems", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Monday", slot: "Break", startTime: "11:00 AM", endTime: "11:15 AM", subjectCode: "BREAK", subjectName: "Morning Break", type: "Break", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Monday", slot: 3, startTime: "11:15 AM", endTime: "12:15 PM", subjectCode: "CS303", subjectName: "Computer Networks", type: "Theory", classroom: "LH-101", facultyId: "STAFF203", facultyName: "Dr. Alan Turing" },
    { day: "Monday", slot: 4, startTime: "12:15 PM", endTime: "01:15 PM", subjectCode: "CS304", subjectName: "Operating Systems", type: "Theory", classroom: "LH-102", facultyId: "STAFF204", facultyName: "Prof. Grace Hopper" },
    { day: "Monday", slot: "Lunch", startTime: "01:15 PM", endTime: "02:00 PM", subjectCode: "LUNCH", subjectName: "Lunch Break", type: "Lunch", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Monday", slot: 5, startTime: "02:00 PM", endTime: "04:00 PM", subjectCode: "CS311", subjectName: "Data Structures Lab", type: "Lab", classroom: "LAB-1", facultyId: "STAFF201", facultyName: "Dr. Aris Vance" }, // Lab covers Slot 5 & 6

    // Tuesday
    { day: "Tuesday", slot: 1, startTime: "09:00 AM", endTime: "10:00 AM", subjectCode: "CS303", subjectName: "Computer Networks", type: "Theory", classroom: "LH-101", facultyId: "STAFF203", facultyName: "Dr. Alan Turing" },
    { day: "Tuesday", slot: 2, startTime: "10:00 AM", endTime: "11:00 AM", subjectCode: "CS304", subjectName: "Operating Systems", type: "Theory", classroom: "LH-101", facultyId: "STAFF204", facultyName: "Prof. Grace Hopper" },
    { day: "Tuesday", slot: "Break", startTime: "11:00 AM", endTime: "11:15 AM", subjectCode: "BREAK", subjectName: "Morning Break", type: "Break", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Tuesday", slot: 3, startTime: "11:15 AM", endTime: "12:15 PM", subjectCode: "CS305", subjectName: "Object Oriented Programming", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Tuesday", slot: 4, startTime: "12:15 PM", endTime: "01:15 PM", subjectCode: "EC101", subjectName: "Basic Electronics", type: "Theory", classroom: "LH-201", facultyId: "STAFF205", facultyName: "Dr. Richard Feynman" },
    { day: "Tuesday", slot: "Lunch", startTime: "01:15 PM", endTime: "02:00 PM", subjectCode: "LUNCH", subjectName: "Lunch Break", type: "Lunch", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Tuesday", slot: 5, startTime: "02:00 PM", endTime: "03:00 PM", subjectCode: "CS301", subjectName: "Data Structures & Algorithms", type: "Theory", classroom: "LH-101", facultyId: "STAFF201", facultyName: "Dr. Aris Vance" },
    { day: "Tuesday", slot: 6, startTime: "03:00 PM", endTime: "04:00 PM", subjectCode: "FREE", subjectName: "Self Study / Library", type: "Free", classroom: "-", facultyId: "-", facultyName: "-" },

    // Wednesday
    { day: "Wednesday", slot: 1, startTime: "09:00 AM", endTime: "11:00 AM", subjectCode: "CS312", subjectName: "DBMS Lab", type: "Lab", classroom: "LAB-2", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Wednesday", slot: "Break", startTime: "11:00 AM", endTime: "11:15 AM", subjectCode: "BREAK", subjectName: "Morning Break", type: "Break", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Wednesday", slot: 3, startTime: "11:15 AM", endTime: "12:15 PM", subjectCode: "CS302", subjectName: "Database Management Systems", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Wednesday", slot: 4, startTime: "12:15 PM", endTime: "01:15 PM", subjectCode: "CS305", subjectName: "Object Oriented Programming", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Wednesday", slot: "Lunch", startTime: "01:15 PM", endTime: "02:00 PM", subjectCode: "LUNCH", subjectName: "Lunch Break", type: "Lunch", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Wednesday", slot: 5, startTime: "02:00 PM", endTime: "03:00 PM", subjectCode: "CS304", subjectName: "Operating Systems", type: "Theory", classroom: "LH-102", facultyId: "STAFF204", facultyName: "Prof. Grace Hopper" },
    { day: "Wednesday", slot: 6, startTime: "03:00 PM", endTime: "04:00 PM", subjectCode: "FREE", subjectName: "Sports / Club Activity", type: "Free", classroom: "-", facultyId: "-", facultyName: "-" },

    // Thursday
    { day: "Thursday", slot: 1, startTime: "09:00 AM", endTime: "10:00 AM", subjectCode: "CS305", subjectName: "Object Oriented Programming", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Thursday", slot: 2, startTime: "10:00 AM", endTime: "11:00 AM", subjectCode: "CS301", subjectName: "Data Structures & Algorithms", type: "Theory", classroom: "LH-101", facultyId: "STAFF201", facultyName: "Dr. Aris Vance" },
    { day: "Thursday", slot: "Break", startTime: "11:00 AM", endTime: "11:15 AM", subjectCode: "BREAK", subjectName: "Morning Break", type: "Break", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Thursday", slot: 3, startTime: "11:15 AM", endTime: "01:15 PM", subjectCode: "CS311", subjectName: "Data Structures Lab", type: "Lab", classroom: "LAB-1", facultyId: "STAFF201", facultyName: "Dr. Aris Vance" },
    { day: "Thursday", slot: "Lunch", startTime: "01:15 PM", endTime: "02:00 PM", subjectCode: "LUNCH", subjectName: "Lunch Break", type: "Lunch", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Thursday", slot: 5, startTime: "02:00 PM", endTime: "03:00 PM", subjectCode: "CS302", subjectName: "Database Management Systems", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Thursday", slot: 6, startTime: "03:00 PM", endTime: "04:00 PM", subjectCode: "CS303", subjectName: "Computer Networks", type: "Theory", classroom: "LH-101", facultyId: "STAFF203", facultyName: "Dr. Alan Turing" },

    // Friday
    { day: "Friday", slot: 1, startTime: "09:00 AM", endTime: "10:00 AM", subjectCode: "CS304", subjectName: "Operating Systems", type: "Theory", classroom: "LH-102", facultyId: "STAFF204", facultyName: "Prof. Grace Hopper" },
    { day: "Friday", slot: 2, startTime: "10:00 AM", endTime: "11:00 AM", subjectCode: "EC101", subjectName: "Basic Electronics", type: "Theory", classroom: "LH-201", facultyId: "STAFF205", facultyName: "Dr. Richard Feynman" },
    { day: "Friday", slot: "Break", startTime: "11:00 AM", endTime: "11:15 AM", subjectCode: "BREAK", subjectName: "Morning Break", type: "Break", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Friday", slot: 3, startTime: "11:15 AM", endTime: "12:15 PM", subjectCode: "CS301", subjectName: "Data Structures & Algorithms", type: "Theory", classroom: "LH-101", facultyId: "STAFF201", facultyName: "Dr. Aris Vance" },
    { day: "Friday", slot: 4, startTime: "12:15 PM", endTime: "01:15 PM", subjectCode: "CS302", subjectName: "Database Management Systems", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Friday", slot: "Lunch", startTime: "01:15 PM", endTime: "02:00 PM", subjectCode: "LUNCH", subjectName: "Lunch Break", type: "Lunch", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Friday", slot: 5, startTime: "02:00 PM", endTime: "04:00 PM", subjectCode: "CS312", subjectName: "DBMS Lab", type: "Lab", classroom: "LAB-2", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },

    // Saturday
    { day: "Saturday", slot: 1, startTime: "09:00 AM", endTime: "10:00 AM", subjectCode: "CS303", subjectName: "Computer Networks", type: "Theory", classroom: "LH-101", facultyId: "STAFF203", facultyName: "Dr. Alan Turing" },
    { day: "Saturday", slot: 2, startTime: "10:00 AM", endTime: "11:00 AM", subjectCode: "CS305", subjectName: "Object Oriented Programming", type: "Theory", classroom: "LH-101", facultyId: "STAFF202", facultyName: "Prof. Sarah Connor" },
    { day: "Saturday", slot: "Break", startTime: "11:00 AM", endTime: "11:15 AM", subjectCode: "BREAK", subjectName: "Morning Break", type: "Break", classroom: "-", facultyId: "-", facultyName: "-" },
    { day: "Saturday", slot: 3, startTime: "11:15 AM", endTime: "01:15 PM", subjectCode: "FREE", subjectName: "Placement Training", type: "Free", classroom: "LH-101", facultyId: "STAFF201", facultyName: "Dr. Aris Vance" }
  ],

  assignments: [
    { id: "A1", title: "Red-Black Trees Implementation", subjectCode: "CS301", dueDate: "2026-08-02", points: 100, status: "Pending", description: "Implement insertion, deletion and balance operations on Red-Black Trees in C++ or Java." },
    { id: "A2", title: "SQL Schema Design & Normalization", subjectCode: "CS302", dueDate: "2026-08-05", points: 50, status: "Submitted", description: "Design a university database schema and normalize it to 3NF/BCNF." },
    { id: "A3", title: "TCP Socket Programming Project", subjectCode: "CS303", dueDate: "2026-08-10", points: 100, status: "Pending", description: "Build a multithreaded chat client-server application using TCP sockets." }
  ],

  exams: [
    { id: "E1", subjectCode: "CS301", subjectName: "Data Structures & Algorithms", date: "2026-08-15", time: "10:00 AM - 01:00 PM", room: "LH-101", type: "Theory" },
    { id: "E2", subjectCode: "CS302", subjectName: "Database Management Systems", date: "2026-08-17", time: "10:00 AM - 01:00 PM", room: "LH-101", type: "Theory" },
    { id: "E3", subjectCode: "CS303", subjectName: "Computer Networks", date: "2026-08-19", time: "10:00 AM - 01:00 PM", room: "LH-102", type: "Theory" },
    { id: "E4", subjectCode: "CS311", subjectName: "Data Structures Lab Practical", date: "2026-08-22", time: "09:00 AM - 12:00 PM", room: "LAB-1", type: "Lab" }
  ],

  holidays: [
    { id: "H1", name: "Independence Day", date: "2026-08-15", description: "National Holiday - College closed" },
    { id: "H2", name: "Ganesh Chaturthi", date: "2026-09-15", description: "Festival Holiday" },
    { id: "H3", name: "Gandhi Jayanti", date: "2026-10-02", description: "National Holiday - College closed" }
  ],

  events: [
    { id: "EV1", title: "National Level Tech Fest (Hack-O-Mania)", date: "2026-08-08", time: "09:00 AM onwards", venue: "College Auditorium", dept: "CSE" },
    { id: "EV2", title: "Seminar on Quantum Computing & AI", date: "2026-08-12", time: "02:00 PM", venue: "Seminar Hall 2", dept: "CSE" },
    { id: "EV3", title: "Inter-Department Cricket Tournament", date: "2026-08-20", time: "08:30 AM", venue: "Main Sports Ground", dept: "ALL" }
  ],

  // Staff Schedules (duty details, meetings, invigilations)
  staffDuties: {
    "STAFF201": {
      meetings: [
        { id: "M1", title: "Department Syllabus Review", date: "2026-07-29", time: "04:15 PM", venue: "CSE Conference Room" },
        { id: "M2", title: "Academic Council Board Meeting", date: "2026-08-04", time: "11:30 AM", venue: "Principal's Office" }
      ],
      invigilations: [
        { id: "I1", examName: "Midterm Test - Basic ECE", date: "2026-08-14", time: "10:00 AM - 12:00 PM", room: "LH-201" }
      ],
      subjectAllocation: [
        { code: "CS301", subjectName: "Data Structures & Algorithms", class: "Year 3 CSE - Sec A", strength: 60 },
        { code: "CS311", subjectName: "Data Structures Lab", class: "Year 3 CSE - Sec A", strength: 60 }
      ]
    },
    "STAFF202": {
      meetings: [
        { id: "M1", title: "Department Syllabus Review", date: "2026-07-29", time: "04:15 PM", venue: "CSE Conference Room" },
        { id: "M3", title: "Lab Modernization Committee", date: "2026-08-01", time: "03:00 PM", venue: "LAB-2 Office" }
      ],
      invigilations: [
        { id: "I2", examName: "Midterm Test - Operating Systems", date: "2026-08-14", time: "02:00 PM - 04:00 PM", room: "LH-102" }
      ],
      subjectAllocation: [
        { code: "CS302", subjectName: "Database Management Systems", class: "Year 3 CSE - Sec A", strength: 60 },
        { code: "CS305", subjectName: "Object Oriented Programming", class: "Year 3 CSE - Sec A", strength: 60 },
        { code: "CS312", subjectName: "DBMS Lab", class: "Year 3 CSE - Sec A", strength: 60 }
      ]
    }
  },

  notifications: [
    { id: "N1", role: "all", title: "Timetable Published", message: "The timetable for Odd Semester 2026 has been published and finalized by the Admin panel.", timestamp: "2026-07-28T09:00:00" },
    { id: "N2", role: "student", title: "Assignment Due Soon", message: "Reminder: Red-Black Trees assignment is due on 2026-08-02.", timestamp: "2026-07-28T10:30:00" },
    { id: "N3", role: "staff", title: "Staff Meeting Today", message: "Urgent meeting for all CSE faculty at 04:15 PM in Conference Room.", timestamp: "2026-07-28T11:00:00" }
  ]
};

module.exports = initialData;
