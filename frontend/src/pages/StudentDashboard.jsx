import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  FileText, 
  Percent, 
  MapPin, 
  User, 
  CheckSquare, 
  AlertCircle, 
  Compass,
  Trash2,
  Plus
} from 'lucide-react';

const StudentDashboard = ({ activeTab, searchTerm }) => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom planner local storage state
  const [customSchedules, setCustomSchedules] = useState(() => {
    const saved = localStorage.getItem(`planner_${user.regNo}`);
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Self Study: Algorithms', day: 'Monday', time: '04:30 PM - 06:00 PM', notes: 'Library, focus on graph traversals' },
      { id: '2', title: 'Team Meeting: Capstone Project', day: 'Wednesday', time: '02:30 PM - 04:00 PM', notes: 'Discussion Room 3, bring mockups' }
    ];
  });

  const [newPlan, setNewPlan] = useState({ title: '', day: 'Monday', time: '', notes: '' });

  const handleAddPlan = (e) => {
    e.preventDefault();
    if (!newPlan.title || !newPlan.time) return;
    const plan = {
      id: Date.now().toString(),
      ...newPlan
    };
    const updated = [...customSchedules, plan];
    setCustomSchedules(updated);
    localStorage.setItem(`planner_${user.regNo}`, JSON.stringify(updated));
    setNewPlan({ title: '', day: 'Monday', time: '', notes: '' });
  };

  const handleDeletePlan = (id) => {
    const updated = customSchedules.filter(p => p.id !== id);
    setCustomSchedules(updated);
    localStorage.setItem(`planner_${user.regNo}`, JSON.stringify(updated));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ttRes, assignRes, examsRes, eventsRes] = await Promise.all([
          api.getStudentTimetable(user.regNo),
          api.getAssignments(user.regNo),
          api.getExams(user.regNo),
          api.getEvents()
        ]);
        setTimetable(ttRes && Array.isArray(ttRes.timetable) ? ttRes.timetable : []);
        setAssignments(Array.isArray(assignRes) ? assignRes : []);
        setExams(Array.isArray(examsRes) ? examsRes : []);
        setHolidays(eventsRes && Array.isArray(eventsRes.holidays) ? eventsRes.holidays : []);
        setEvents(eventsRes && Array.isArray(eventsRes.events) ? eventsRes.events : []);
      } catch (err) {
        console.error("Error loading student portal data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.regNo]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 bg-[#F5F7FB]">
        <div className="w-8 h-8 rounded-full border-4 border-[#8458B3] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Next Class Logic: Match Monday period 3 as current, or pick next slot
  const nextClass = timetable.find(c => c.day === "Monday" && c.slot === 3) || timetable[0] || {
    subjectName: "No class scheduled",
    subjectCode: "-",
    classroom: "-",
    facultyName: "-",
    startTime: "09:00 AM"
  };

  // Today's Timetable: Filter timetable for Monday classes
  const todayTimetable = timetable.filter(c => c.day === "Monday" && c.subjectCode !== "BREAK" && c.subjectCode !== "LUNCH");

  // Attendance Metrics
  const attendancePercentage = Math.round((user.attendance.attended / user.attendance.totalClasses) * 100);

  // Group weekly timetable periods Mon-Fri
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weeklyTimetableMapped = daysOfWeek.map(dayName => {
    const daySlots = timetable.filter(c => c.day === dayName);
    // filter breaks to show key subject codes
    const periods = daySlots
      .filter(s => s.subjectCode !== 'BREAK' && s.subjectCode !== 'LUNCH')
      .slice(0, 4)
      .map(s => s.subjectCode);
    
    // pad to 4 periods if needed
    while (periods.length < 4) {
      periods.push('Free');
    }
    return { day: dayName.substring(0, 3), periods };
  });

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full bg-[#F5F7FB] text-[#494D5F] font-sans">
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5EAF5] pb-3">
            <h2 className="text-sm font-bold text-[#8458B3] uppercase tracking-wider">Student Timetable Hub</h2>
            <span className="text-xs font-bold text-[#494D5F]/60">Alex Mercer • CSE Year {user.year}</span>
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
                <span className="text-[10px] text-[#8458B3] font-extrabold uppercase tracking-wider">{nextClass.subjectCode}</span>
                <h3 className="text-lg font-bold text-[#494D5F] mt-0.5">{nextClass.subjectName}</h3>
                <div className="flex items-center gap-4 text-xs text-[#494D5F]/80 mt-2 font-semibold">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#8458B3]" /> {nextClass.classroom}</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#8458B3]" /> {nextClass.facultyName}</span>
                </div>
              </div>
              <div className="text-right text-xs font-bold text-[#8458B3] mt-3">
                Starts at {nextClass.startTime}
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
                  {todayTimetable.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.subjectName}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.startTime} - {item.endTime} | Room {item.classroom}</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#8458B3] bg-[#F2ECFC] px-2 py-0.5 rounded border border-[#D0BDF4]/30">
                        {item.subjectCode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Attendance Overview */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                  <Percent className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Attendance Overview</h3>
                </div>
                <div className="flex items-center gap-6 py-2">
                  <div className="relative w-18 h-18 shrink-0 flex items-center justify-center rounded-full border-4 border-[#F5F7FB]">
                    <div className="absolute inset-0 rounded-full border-4 border-[#A0D2EB] border-r-transparent"></div>
                    <span className="text-base font-bold text-[#494D5F]">{attendancePercentage}%</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-[#494D5F]/50 font-bold uppercase tracking-wider">Status</p>
                    <p className="text-sm font-bold text-[#8458B3]">
                      {attendancePercentage >= 75 ? "Excellent Attendance" : "Low Attendance Warning"}
                    </p>
                    <p className="text-xs text-[#494D5F]/75 font-medium">{user.attendance.attended}/{user.attendance.totalClasses} lectures</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Weekly Timetable Grid */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between mb-4 border-b border-[#F5F7FB] pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Weekly Schedule Grid</h3>
                </div>
                <span className="text-[10px] text-[#494D5F]/50 font-bold uppercase">Mon - Fri</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {weeklyTimetableMapped.map((day, idx) => (
                  <div key={idx} className="bg-[#F5F7FB] rounded-xl p-2.5 border border-[#E5EAF5]">
                    <p className="font-bold text-[#8458B3] mb-2">{day.day}</p>
                    <div className="space-y-1.5">
                      {day.periods.map((p, i) => (
                        <div key={i} className={`p-1 rounded text-[9px] font-bold ${
                          p === 'Free' 
                            ? 'bg-white text-[#494D5F]/50 border border-[#E5EAF5]' 
                            : p.includes('Lab') || p === 'CS311' || p === 'CS312'
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
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignments */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
              <CheckSquare className="w-4 h-4 text-[#8458B3]" />
              <h3 className="font-bold text-sm text-[#494D5F]">Assignment Deadlines</h3>
            </div>
            <div className="space-y-3">
              {assignments.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold text-[#494D5F]">{item.title}</p>
                    <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.subjectCode} | Due {item.dueDate}</p>
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

          {/* Upcoming Exams */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
              <FileText className="w-4 h-4 text-[#8458B3]" />
              <h3 className="font-bold text-sm text-[#494D5F]">Upcoming Exams</h3>
            </div>
            <div className="space-y-3">
              {exams.map(item => (
                <div key={item.id} className="text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-[#494D5F]">{item.subjectName}</p>
                    <span className="text-[10px] font-bold text-[#8458B3]">{item.date}</span>
                  </div>
                  <p className="text-[10px] text-[#494D5F]/60 font-semibold mt-0.5">{item.time} | Room {item.room}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Custom Schedules */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-[#8458B3]">My Personal Scheduler</h3>
            <p className="text-xs text-slate-400">Manage custom study hours, tasks, and private classes.</p>
            
            <div className="space-y-3 mt-4">
              {customSchedules.map((plan) => (
                <div key={plan.id} className="bg-white rounded-2xl p-5 border border-[#E5EAF5] shadow-sm flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase bg-[#F2ECFC] text-[#8458B3] border border-[#D0BDF4]/30 px-2 py-0.5 rounded">
                        {plan.day}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">{plan.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-[#8458B3]" /> {plan.time}
                    </p>
                    {plan.notes && (
                      <p className="text-xs text-slate-400 mt-2 bg-[#F5F7FB] p-2 rounded-lg italic">
                        Notes: {plan.notes}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm h-fit">
            <h3 className="font-bold text-sm text-[#494D5F] border-b border-[#F5F7FB] pb-3 mb-4">
              Create Plan Entry
            </h3>
            
            <form onSubmit={handleAddPlan} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-400 block mb-1">Activity Name</label>
                <input
                  type="text"
                  required
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  placeholder="e.g. Self Study: Database"
                  className="w-full p-2.5 rounded-xl border border-[#E5EAF5] bg-[#F5F7FB] focus:outline-none focus:border-[#8458B3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Day</label>
                  <select
                    value={newPlan.day}
                    onChange={(e) => setNewPlan({ ...newPlan, day: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E5EAF5] bg-[#F5F7FB] focus:outline-none focus:border-[#8458B3]"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={newPlan.time}
                    onChange={(e) => setNewPlan({ ...newPlan, time: e.target.value })}
                    placeholder="e.g. 05:00 PM - 06:00 PM"
                    className="w-full p-2.5 rounded-xl border border-[#E5EAF5] bg-[#F5F7FB] focus:outline-none focus:border-[#8458B3]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes / Details</label>
                <textarea
                  rows={3}
                  value={newPlan.notes}
                  onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                  placeholder="e.g. Library Desk 3"
                  className="w-full p-2.5 rounded-xl border border-[#E5EAF5] bg-[#F5F7FB] focus:outline-none focus:border-[#8458B3] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#8458B3] hover:bg-[#8458B3]/90 text-white font-bold transition-all shadow-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Save Schedule Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Holidays */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
              <Calendar className="w-4 h-4 text-[#8458B3]" />
              <h3 className="font-bold text-sm text-[#494D5F]">Upcoming Holidays</h3>
            </div>
            <div className="space-y-3">
              {holidays.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                  <p className="font-bold text-[#494D5F]">{item.name}</p>
                  <span className="text-[10px] font-semibold text-slate-400">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* College Events */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
              <Compass className="w-4 h-4 text-[#8458B3]" />
              <h3 className="font-bold text-sm text-[#494D5F]">College Events</h3>
            </div>
            <div className="space-y-3">
              {events.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold text-[#494D5F]">{item.title}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{item.time} • {item.venue}</p>
                  </div>
                  <span className="text-[9px] font-bold text-[#494D5F] bg-[#E5EAF5] px-2 py-0.5 rounded border border-[#E5EAF5]">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
