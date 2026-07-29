import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  FileText, 
  Percent, 
  MapPin, 
  Briefcase, 
  User, 
  CheckSquare, 
  AlertCircle, 
  Layers,
  Compass
} from 'lucide-react';

const CollegeScheduleDashboard = () => {
  const [activePortal, setActivePortal] = useState('student'); // 'student' or 'staff'

  // Standard Mock Placeholders (minimalistic)
  const studentData = {
    todayTimetable: [
      { id: 1, subject: 'Data Structures & Algorithms', code: 'CS301', time: '09:00 AM - 10:00 AM', room: 'LH-101', faculty: 'Dr. Aris Vance' },
      { id: 2, subject: 'Database Management Systems', code: 'CS302', time: '10:00 AM - 11:00 AM', room: 'LH-101', faculty: 'Prof. Sarah Connor' },
      { id: 3, subject: 'Computer Networks', code: 'CS303', time: '11:15 AM - 12:15 PM', room: 'LH-102', faculty: 'Dr. Alan Turing' }
    ],
    weeklyTimetable: [
      { day: 'Mon', periods: ['CS301', 'CS302', 'CS303', 'Lab'] },
      { day: 'Tue', periods: ['CS304', 'CS305', 'CS301', 'Free'] },
      { day: 'Wed', periods: ['CS302', 'CS303', 'CS305', 'Lab'] },
      { day: 'Thu', periods: ['CS301', 'CS304', 'Free', 'CS302'] },
      { day: 'Fri', periods: ['CS303', 'CS305', 'CS304', 'Free'] }
    ],
    nextClass: { subject: 'Operating Systems', code: 'CS304', time: '02:00 PM', room: 'LH-102', faculty: 'Prof. Grace Hopper' },
    exams: [
      { id: 1, subject: 'Computer Networks', date: 'Aug 12, 2026', time: '10:00 AM', room: 'Exam Hall A' },
      { id: 2, subject: 'Operating Systems', date: 'Aug 14, 2026', time: '10:00 AM', room: 'Exam Hall B' }
    ],
    assignments: [
      { id: 1, title: 'Network Socket Programming', subject: 'CS303', due: 'In 2 days', status: 'Pending' },
      { id: 2, title: 'ER Diagram Design Document', subject: 'CS302', due: 'In 5 days', status: 'Submitted' }
    ],
    events: [
      { id: 1, title: 'Annual Tech Hackathon 2026', date: 'Aug 05', type: 'Hackathon' },
      { id: 2, title: 'AI & Robotics Guest Lecture', date: 'Aug 08', type: 'Seminar' }
    ],
    holidays: [
      { id: 1, name: 'Independence Day', date: 'Aug 15, 2026' },
      { id: 2, name: 'Ganesh Chaturthi', date: 'Sep 04, 2026' }
    ],
    attendance: {
      percentage: 84,
      classesAttended: 42,
      totalClasses: 50
    }
  };

  const staffData = {
    todayClasses: [
      { id: 1, subject: 'Data Structures & Algorithms', code: 'CS301', time: '09:00 AM - 10:00 AM', room: 'LH-101', batch: 'CSE Year 3 A' },
      { id: 2, subject: 'Advanced Algorithms Lab', code: 'CS311', time: '02:00 PM - 04:00 PM', room: 'LAB-1', batch: 'CSE Year 3 B' }
    ],
    weeklyTimetable: [
      { day: 'Mon', periods: ['CS301 (A)', 'Lab (B)', 'Free', 'Free'] },
      { day: 'Tue', periods: ['Free', 'CS301 (A)', 'CS301 (C)', 'Free'] },
      { day: 'Wed', periods: ['Lab (B)', 'Free', 'CS301 (A)', 'Free'] },
      { day: 'Thu', periods: ['CS301 (C)', 'Free', 'Free', 'CS301 (A)'] },
      { day: 'Fri', periods: ['Free', 'CS301 (C)', 'Lab (A)', 'Free'] }
    ],
    nextClass: { subject: 'Advanced Algorithms Lab', code: 'CS311', time: '02:00 PM', room: 'LAB-1', batch: 'CSE Year 3 B' },
    freeHours: [
      { day: 'Today', slot: '11:00 AM - 01:00 PM', duration: '2 Hours' },
      { day: 'Today', slot: '04:00 PM - 05:00 PM', duration: '1 Hour' }
    ],
    meetings: [
      { id: 1, title: 'Department Faculty Sync', time: '11:30 AM', room: 'HOD Cabin' },
      { id: 2, title: 'Curriculum Review Board', time: '03:30 PM', room: 'Conference Hall' }
    ],
    examDuty: [
      { id: 1, subject: 'Basic Electronics (EC101)', date: 'Aug 12, 2026', time: '10:00 AM - 01:00 PM', room: 'LH-201' },
      { id: 2, subject: 'Database Systems (CS302)', date: 'Aug 17, 2026', time: '10:00 AM - 01:00 PM', room: 'LH-101' }
    ],
    events: [
      { id: 1, title: 'Research Methodology Workshop', date: 'Aug 06', organizer: 'CSE Dept' },
      { id: 2, title: 'Board of Studies Board Meeting', date: 'Aug 10', organizer: 'Dean Office' }
    ],
    allocations: [
      { room: 'LH-101', status: 'Occupied', current: 'CS301 (Dr. Vance)' },
      { room: 'LH-102', status: 'Available', current: 'Free' },
      { room: 'LAB-1', status: 'Occupied', current: 'CS311 Lab' }
    ]
  };

  // Color Palette Definitions:
  // Light Sky Blue: #A0D2EB (Lighter variant: #E6F3FA)
  // Lavender Tint: #E5EAF5 (Lighter variant: #F5F7FB)
  // Light Pastel Purple: #D0BDF4 (Lighter variant: #F2ECFC)
  // Medium Purple: #8458B3 (Text/Primary variant)
  // Dark Slate Gray: #494D5F (Base Text color)

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#494D5F] font-sans pb-12 transition-colors duration-300">
      {/* Header and Navigation Tabs */}
      <header className="bg-white border-b border-[#E5EAF5] sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#494D5F] tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#A0D2EB] rounded-full inline-block"></span>
                Academix Schedule Dashboard
              </h1>
              <p className="text-xs text-[#8458B3]/80 font-semibold mt-0.5">Clean, minimal campus organization & timing portal</p>
            </div>
            
            {/* Simple Navigation Tabs */}
            <div className="flex bg-[#E5EAF5] p-1 rounded-xl border border-[#E5EAF5]">
              <button
                onClick={() => setActivePortal('student')}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activePortal === 'student'
                    ? 'bg-[#8458B3] text-white shadow-md'
                    : 'text-[#494D5F] hover:text-[#8458B3]'
                }`}
              >
                🎓 Student Dashboard
              </button>
              <button
                onClick={() => setActivePortal('staff')}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activePortal === 'staff'
                    ? 'bg-[#8458B3] text-white shadow-md'
                    : 'text-[#494D5F] hover:text-[#8458B3]'
                }`}
              >
                🏫 Staff Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* STUDENT PORTAL */}
        {activePortal === 'student' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5EAF5] pb-3">
              <h2 className="text-sm font-bold text-[#8458B3] uppercase tracking-wider">Student Portal</h2>
              <span className="text-xs font-bold text-[#494D5F]/60">Term: Fall 2026</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 1. Next Class (Light sky-blue to lavender-tint header card) */}
              <div className="bg-gradient-to-br from-[#E6F3FA] to-[#F2ECFC] text-[#494D5F] rounded-2xl p-6 border border-[#A0D2EB]/30 shadow-sm flex flex-col justify-between min-h-[190px]">
                <div className="flex justify-between items-start">
                  <div className="bg-white/90 p-2.5 rounded-xl shadow-sm border border-[#A0D2EB]/20">
                    <Clock className="w-5 h-5 text-[#8458B3]" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-[#A0D2EB]/40 text-[#494D5F] px-2.5 py-1 rounded-full border border-[#A0D2EB]/30">
                    Next Class
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] text-[#8458B3] font-extrabold uppercase tracking-wider">{studentData.nextClass.code}</span>
                  <h3 className="text-lg font-bold text-[#494D5F] mt-0.5">{studentData.nextClass.subject}</h3>
                  <div className="flex items-center gap-4 text-xs text-[#494D5F]/80 mt-2 font-semibold">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#8458B3]" /> {studentData.nextClass.room}</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#8458B3]" /> {studentData.nextClass.faculty}</span>
                  </div>
                </div>
                <div className="text-right text-xs font-bold text-[#8458B3] mt-3">
                  Starts at {studentData.nextClass.time}
                </div>
              </div>

              {/* 2. Today's Timetable */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                    <BookOpen className="w-4 h-4 text-[#8458B3]" />
                    <h3 className="font-bold text-sm text-[#494D5F]">Today's Timetable</h3>
                  </div>
                  <div className="space-y-3">
                    {studentData.todayTimetable.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-[#494D5F]">{item.subject}</p>
                          <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.time} | Room {item.room}</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#8458B3] bg-[#F2ECFC] px-2 py-0.5 rounded border border-[#D0BDF4]/30">
                          {item.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Attendance */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                    <Percent className="w-4 h-4 text-[#8458B3]" />
                    <h3 className="font-bold text-sm text-[#494D5F]">Attendance Overview</h3>
                  </div>
                  <div className="flex items-center gap-6 py-2">
                    <div className="relative w-18 h-18 shrink-0 flex items-center justify-center rounded-full border-4 border-[#F5F7FB]">
                      <div className="absolute inset-0 rounded-full border-4 border-[#A0D2EB] border-r-transparent"></div>
                      <span className="text-base font-bold text-[#494D5F]">{studentData.attendance.percentage}%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-[#494D5F]/50 font-bold uppercase tracking-wider">Status</p>
                      <p className="text-sm font-bold text-[#8458B3]">Excellent Attendance</p>
                      <p className="text-xs text-[#494D5F]/75 font-medium">{studentData.attendance.classesAttended}/{studentData.attendance.totalClasses} classes attended</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Weekly Timetable */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-4 border-b border-[#F5F7FB] pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8458B3]" />
                    <h3 className="font-bold text-sm text-[#494D5F]">Weekly Schedule</h3>
                  </div>
                  <span className="text-[10px] text-[#494D5F]/50 font-bold uppercase">Mon - Fri</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {studentData.weeklyTimetable.map((day, idx) => (
                    <div key={idx} className="bg-[#F5F7FB] rounded-xl p-2.5 border border-[#E5EAF5]">
                      <p className="font-bold text-[#8458B3] mb-2">{day.day}</p>
                      <div className="space-y-1.5">
                        {day.periods.map((p, i) => (
                          <div key={i} className={`p-1 rounded text-[9px] font-bold ${
                            p === 'Free' 
                              ? 'bg-white text-[#494D5F]/50 border border-[#E5EAF5]' 
                              : p === 'Lab' 
                                ? 'bg-[#F2ECFC] text-[#8458B3] border border-[#D0BDF4]/30' 
                                : 'bg-[#E6F3FA] text-[#8458B3] border border-[#A0D2EB]/30'
                          }`}>
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Assignment Deadlines */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <CheckSquare className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Assignment Deadlines</h3>
                </div>
                <div className="space-y-3">
                  {studentData.assignments.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.title}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.subject} | Due {item.due}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        item.status === 'Submitted'
                          ? 'bg-[#E6F3FA] text-[#494D5F] border-[#A0D2EB]/30'
                          : 'bg-[#F2ECFC] text-[#8458B3] border-[#D0BDF4]/30'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Upcoming Exams */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <FileText className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Upcoming Exams</h3>
                </div>
                <div className="space-y-3">
                  {studentData.exams.map(item => (
                    <div key={item.id} className="text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-[#494D5F]">{item.subject}</p>
                        <span className="text-[10px] font-bold text-[#8458B3]">{item.date}</span>
                      </div>
                      <p className="text-[10px] text-[#494D5F]/60 font-semibold mt-0.5">{item.time} | Room {item.room}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. College Events */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <Compass className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">College Events</h3>
                </div>
                <div className="space-y-3">
                  {studentData.events.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.title}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.type}</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#494D5F] bg-[#E5EAF5] px-2 py-0.5 rounded border border-[#E5EAF5]">
                        {item.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Holidays */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <Calendar className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Upcoming Holidays</h3>
                </div>
                <div className="space-y-3">
                  {studentData.holidays.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <p className="font-bold text-[#494D5F]">{item.name}</p>
                      <span className="text-[10px] font-semibold text-[#494D5F]/60">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STAFF PORTAL */}
        {activePortal === 'staff' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5EAF5] pb-3">
              <h2 className="text-sm font-bold text-[#8458B3] uppercase tracking-wider">Staff Portal</h2>
              <span className="text-xs font-bold text-[#494D5F]/60">Role: Senior Professor</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 1. Next Class */}
              <div className="bg-gradient-to-br from-[#E6F3FA] to-[#F2ECFC] text-[#494D5F] rounded-2xl p-6 border border-[#A0D2EB]/30 shadow-sm flex flex-col justify-between min-h-[190px]">
                <div className="flex justify-between items-start">
                  <div className="bg-white/90 p-2.5 rounded-xl shadow-sm border border-[#A0D2EB]/20">
                    <Clock className="w-5 h-5 text-[#8458B3]" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-[#A0D2EB]/40 text-[#494D5F] px-2.5 py-1 rounded-full border border-[#A0D2EB]/30">
                    Next Class
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] text-[#8458B3] font-extrabold uppercase tracking-wider">{staffData.nextClass.code}</span>
                  <h3 className="text-lg font-bold text-[#494D5F] mt-0.5">{staffData.nextClass.subject}</h3>
                  <div className="flex items-center gap-4 text-xs text-[#494D5F]/80 mt-2 font-semibold">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#8458B3]" /> Room {staffData.nextClass.room}</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#8458B3]" /> {staffData.nextClass.batch}</span>
                  </div>
                </div>
                <div className="text-right text-xs font-bold text-[#8458B3] mt-3">
                  Starts at {staffData.nextClass.time}
                </div>
              </div>

              {/* 2. Today's Classes */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <BookOpen className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Today's Classes</h3>
                </div>
                <div className="space-y-3">
                  {staffData.todayClasses.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.subject}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.time} | Room {item.room}</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#8458B3] bg-[#F2ECFC] px-2 py-0.5 rounded border border-[#D0BDF4]/30">
                        {item.batch}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Free Hours */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <Layers className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Free Hours Today</h3>
                </div>
                <div className="space-y-3">
                  {staffData.freeHours.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.slot}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.day}</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#8458B3] bg-[#E6F3FA] px-2 py-0.5 rounded border border-[#A0D2EB]/30">
                        {item.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Weekly Timetable */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-4 border-b border-[#F5F7FB] pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8458B3]" />
                    <h3 className="font-bold text-sm text-[#494D5F]">Weekly Lecture Plan</h3>
                  </div>
                  <span className="text-[10px] text-[#494D5F]/50 font-bold uppercase">Weekly Slots</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {staffData.weeklyTimetable.map((day, idx) => (
                    <div key={idx} className="bg-[#F5F7FB] rounded-xl p-2.5 border border-[#E5EAF5]">
                      <p className="font-bold text-[#8458B3] mb-2">{day.day}</p>
                      <div className="space-y-1.5">
                        {day.periods.map((p, i) => (
                          <div key={i} className={`p-1 rounded text-[9px] font-bold ${
                            p.includes('Free') 
                              ? 'bg-white text-[#494D5F]/40 border border-[#E5EAF5]' 
                              : p.includes('Lab') 
                                ? 'bg-[#F2ECFC] text-[#8458B3] border border-[#D0BDF4]/30' 
                                : 'bg-[#E6F3FA] text-[#8458B3] border border-[#A0D2EB]/30'
                          }`}>
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Meeting Schedule */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <Briefcase className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Meetings Schedule</h3>
                </div>
                <div className="space-y-3">
                  {staffData.meetings.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.title}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">Room: {item.room}</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#8458B3] bg-[#F2ECFC] px-2 py-0.5 rounded border border-[#D0BDF4]/30">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Exam Duty */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <AlertCircle className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Exam Invigilations</h3>
                </div>
                <div className="space-y-3">
                  {staffData.examDuty.map(item => (
                    <div key={item.id} className="text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-[#494D5F]">{item.subject}</p>
                        <span className="text-[10px] font-bold text-[#8458B3]">{item.date}</span>
                      </div>
                      <p className="text-[10px] text-[#494D5F]/60 font-semibold mt-0.5">{item.time} | Room {item.room}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Department Events */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <Compass className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Department Events</h3>
                </div>
                <div className="space-y-3">
                  {staffData.events.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.title}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">By {item.organizer}</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#494D5F] bg-[#E5EAF5] px-2 py-0.5 rounded border border-[#E5EAF5]">
                        {item.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Classroom Allocation */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <MapPin className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Classroom Status</h3>
                </div>
                <div className="space-y-3">
                  {staffData.allocations.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.room}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.current}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        item.status === 'Available'
                          ? 'bg-[#E6F3FA] text-[#494D5F]/80 border-[#A0D2EB]/30'
                          : 'bg-[#F2ECFC] text-[#8458B3] border-[#D0BDF4]/30'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CollegeScheduleDashboard;
