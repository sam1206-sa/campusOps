const BASE_URL = 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Timetable
  getStudentTimetable: async (regNo) => {
    const res = await fetch(`${BASE_URL}/timetable/student/${regNo}`, { headers: getHeaders() });
    return res.json();
  },
  
  getStaffTimetable: async (staffId) => {
    const res = await fetch(`${BASE_URL}/timetable/staff/${staffId}`, { headers: getHeaders() });
    return res.json();
  },

  getAllTimetable: async () => {
    const res = await fetch(`${BASE_URL}/timetable/all`, { headers: getHeaders() });
    return res.json();
  },

  addTimetableSlot: async (slot) => {
    const res = await fetch(`${BASE_URL}/timetable/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(slot)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Conflict or reservation error');
    return data;
  },

  deleteTimetableSlot: async (day, slot, subjectCode) => {
    const res = await fetch(`${BASE_URL}/timetable/delete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ day, slot, subjectCode })
    });
    return res.json();
  },

  // Entities
  getClassrooms: async () => {
    const res = await fetch(`${BASE_URL}/entities/classrooms`, { headers: getHeaders() });
    return res.json();
  },

  addClassroom: async (classroom) => {
    const res = await fetch(`${BASE_URL}/entities/classrooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(classroom)
    });
    return res.json();
  },

  getFaculty: async () => {
    const res = await fetch(`${BASE_URL}/entities/faculty`, { headers: getHeaders() });
    return res.json();
  },

  addFaculty: async (faculty) => {
    const res = await fetch(`${BASE_URL}/entities/faculty`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(faculty)
    });
    return res.json();
  },

  getSubjects: async () => {
    const res = await fetch(`${BASE_URL}/entities/subjects`, { headers: getHeaders() });
    return res.json();
  },

  addSubject: async (subject) => {
    const res = await fetch(`${BASE_URL}/entities/subjects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(subject)
    });
    return res.json();
  },

  getDepartments: async () => {
    const res = await fetch(`${BASE_URL}/entities/departments`, { headers: getHeaders() });
    return res.json();
  },

  // Events & Holidays
  getEvents: async () => {
    const res = await fetch(`${BASE_URL}/events`, { headers: getHeaders() });
    return res.json();
  },

  addHoliday: async (holiday) => {
    const res = await fetch(`${BASE_URL}/events/holiday`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(holiday)
    });
    return res.json();
  },

  addEvent: async (event) => {
    const res = await fetch(`${BASE_URL}/events/event`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(event)
    });
    return res.json();
  },

  // Student specific
  getAssignments: async (regNo) => {
    const res = await fetch(`${BASE_URL}/student/assignments/${regNo}`, { headers: getHeaders() });
    return res.json();
  },

  getExams: async (regNo) => {
    const res = await fetch(`${BASE_URL}/student/exams/${regNo}`, { headers: getHeaders() });
    return res.json();
  },

  // Staff specific
  markAttendance: async (studentRegNo, subjectCode, present) => {
    const res = await fetch(`${BASE_URL}/staff/mark-attendance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ studentRegNo, subjectCode, present })
    });
    return res.json();
  },

  // Notifications
  getNotifications: async () => {
    const res = await fetch(`${BASE_URL}/notifications`, { headers: getHeaders() });
    return res.json();
  },

  publishNotification: async (title, message, role = 'all') => {
    const res = await fetch(`${BASE_URL}/notifications/publish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, message, role })
    });
    return res.json();
  },

  // AI Assistant Chat
  aiChat: async (message) => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message })
    });
    return res.json();
  }
};
