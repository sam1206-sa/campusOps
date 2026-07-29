import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  MapPin, 
  Briefcase, 
  User, 
  AlertCircle, 
  Layers,
  Compass,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

const StaffDashboard = ({ activeTab, searchTerm }) => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [duties, setDuties] = useState({ meetings: [], invigilations: [], subjectAllocation: [] });
  const [holidays, setHolidays] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Attendance shortcut states
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('STU1001');
  const [selectedSubject, setSelectedSubject] = useState('CS301');
  const [isPresent, setIsPresent] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, eventsRes] = await Promise.all([
          api.getStaffTimetable(user.id || 'STAFF201'),
          api.getEvents()
        ]);
        setTimetable(res && Array.isArray(res.timetable) ? res.timetable : []);
        setDuties(res && res.duties ? res.duties : { meetings: [], invigilations: [], subjectAllocation: [] });
        setHolidays(eventsRes && Array.isArray(eventsRes.holidays) ? eventsRes.holidays : []);
        setEvents(eventsRes && Array.isArray(eventsRes.events) ? eventsRes.events : []);
      } catch (err) {
        console.error("Error loading staff data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.markAttendance(selectedStudent, selectedSubject, isPresent);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setAttendanceModalOpen(false);
      }, 1500);
    } catch (err) {
      alert("Error marking attendance: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 bg-[#F5F7FB]">
        <div className="w-8 h-8 rounded-full border-4 border-[#8458B3] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Next Class
  const nextClass = timetable[0] || {
    subjectName: "No lectures scheduled",
    subjectCode: "-",
    classroom: "-",
    startTime: "09:00 AM"
  };

  // Today's Classes: Filter for Monday classes that staff teaches
  const todayClasses = timetable.filter(c => c.day === "Monday" && c.subjectCode !== "BREAK" && c.subjectCode !== "LUNCH");

  // Free Hours
  const occupiedSlotsCount = timetable.length;
  const totalSlotsWeek = 36;
  const freePeriodsCount = totalSlotsWeek - occupiedSlotsCount;

  // Weekly Lecture Plan Map
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weeklyTimetableMapped = daysOfWeek.map(dayName => {
    const daySlots = timetable.filter(c => c.day === dayName);
    const periods = daySlots.map(s => `${s.subjectCode} (${s.classroom})`);
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
            <h2 className="text-sm font-bold text-[#8458B3] uppercase tracking-wider">Staff Portal Hub</h2>
            <span className="text-xs font-bold text-[#494D5F]/60">Role: Professor • CSE Dept</span>
          </div>

          {/* Quick attendance floating shortcut banner */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5EAF5] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 text-[#8458B3]">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#494D5F]">Fast Student Attendance Tracker</h4>
                <p className="text-xs text-slate-400 mt-0.5">Quickly select a student to enter their daily lecture presence status.</p>
              </div>
            </div>
            <button
              onClick={() => setAttendanceModalOpen(true)}
              className="px-4 py-2 bg-[#8458B3] hover:bg-[#8458B3]/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Enter Lecture Attendance
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Next Class */}
            <div className="bg-gradient-to-br from-[#E6F3FA] to-[#F2ECFC] text-[#494D5F] rounded-2xl p-6 border border-[#A0D2EB]/30 shadow-sm flex flex-col justify-between min-h-[190px]">
              <div className="flex justify-between items-start">
                <div className="bg-white/90 p-2.5 rounded-xl shadow-sm border border-[#A0D2EB]/20">
                  <Clock className="w-5 h-5 text-[#8458B3]" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-[#A0D2EB]/40 text-[#494D5F] px-2.5 py-1 rounded-full border border-[#A0D2EB]/30">
                  Next Lecture
                </span>
              </div>
              <div className="mt-3">
                <span className="text-[10px] text-[#8458B3] font-extrabold uppercase tracking-wider">{nextClass.subjectCode}</span>
                <h3 className="text-lg font-bold text-[#494D5F] mt-0.5">{nextClass.subjectName}</h3>
                <div className="flex items-center gap-4 text-xs text-[#494D5F]/80 mt-2 font-semibold">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#8458B3]" /> Room {nextClass.classroom}</span>
                </div>
              </div>
              <div className="text-right text-xs font-bold text-[#8458B3] mt-3">
                Starts at {nextClass.startTime || "09:00 AM"}
              </div>
            </div>

            {/* 2. Today's Classes */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                <BookOpen className="w-4 h-4 text-[#8458B3]" />
                <h3 className="font-bold text-sm text-[#494D5F]">Today's Teaching Load</h3>
              </div>
              <div className="space-y-3">
                {todayClasses.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2">No lectures scheduled for today.</div>
                ) : (
                  todayClasses.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[#494D5F]">{item.subjectName}</p>
                        <p className="text-[10px] text-[#494D5F]/60 font-semibold">{item.startTime} - {item.endTime} | Room {item.classroom}</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#8458B3] bg-[#F2ECFC] px-2 py-0.5 rounded border border-[#D0BDF4]/30">
                        {item.subjectCode}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Free Hours / Slots */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
                <Layers className="w-4 h-4 text-[#8458B3]" />
                <h3 className="font-bold text-sm text-[#494D5F]">Weekly Lecture Load</h3>
              </div>
              <div className="space-y-3 py-1">
                <div className="flex justify-between items-center text-xs border-b border-[#F5F7FB] pb-2.5">
                  <span className="font-semibold text-slate-500">Allocated Lectures</span>
                  <span className="font-bold text-slate-800">{occupiedSlotsCount} Hours</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-[#F5F7FB] pb-2.5">
                  <span className="font-semibold text-slate-500">Free Time Slots</span>
                  <span className="font-bold text-[#8458B3]">{freePeriodsCount} Hours</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="font-semibold text-slate-500">Weekly Duty Status</span>
                  <span className="text-[9px] font-bold bg-[#E6F3FA] text-[#8458B3] border border-[#A0D2EB]/30 px-2.5 py-0.5 rounded-full">Optimal Load</span>
                </div>
              </div>
            </div>

            {/* 4. Weekly Plan */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between mb-4 border-b border-[#F5F7FB] pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8458B3]" />
                  <h3 className="font-bold text-sm text-[#494D5F]">Weekly Teaching Grid</h3>
                </div>
                <span className="text-[10px] text-[#494D5F]/50 font-bold uppercase">Weekly Slots</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {weeklyTimetableMapped.map((day, idx) => (
                  <div key={idx} className="bg-[#F5F7FB] rounded-xl p-2.5 border border-[#E5EAF5]">
                    <p className="font-bold text-[#8458B3] mb-2">{day.day}</p>
                    <div className="space-y-1.5">
                      {day.periods.map((p, i) => (
                        <div key={i} className={`p-1 rounded text-[9px] font-bold ${
                          p.includes('Free') 
                            ? 'bg-white text-[#494D5F]/40 border border-[#E5EAF5]' 
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

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meetings */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
              <Briefcase className="w-4 h-4 text-[#8458B3]" />
              <h3 className="font-bold text-sm text-[#494D5F]">Meetings Schedule</h3>
            </div>
            <div className="space-y-3">
              {duties.meetings.length === 0 ? (
                <div className="text-xs text-slate-400">No scheduled meetings.</div>
              ) : (
                duties.meetings.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-[#494D5F]">{item.title}</p>
                      <p className="text-[10px] text-[#494D5F]/60 font-semibold">Room: {item.venue}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#8458B3] bg-[#F2ECFC] px-2 py-0.5 rounded border border-[#D0BDF4]/30">
                      {item.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Exam Invigilations */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAF5] shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#F5F7FB] pb-2">
              <AlertCircle className="w-4 h-4 text-[#8458B3]" />
              <h3 className="font-bold text-sm text-[#494D5F]">Exam Invigilations</h3>
            </div>
            <div className="space-y-3">
              {duties.invigilations.length === 0 ? (
                <div className="text-xs text-slate-400">No invigilation duties scheduled.</div>
              ) : (
                duties.invigilations.map(item => (
                  <div key={item.id} className="text-xs pb-2.5 border-b border-[#F5F7FB] last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-[#494D5F]">{item.examName}</p>
                      <span className="text-[10px] font-bold text-[#8458B3]">{item.date}</span>
                    </div>
                    <p className="text-[10px] text-[#494D5F]/60 font-semibold mt-0.5">{item.time} | Room {item.room}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Events */}
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
                    <p className="text-[10px] text-slate-400 font-semibold">By {item.dept} Dept</p>
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

      {/* Attendance shortcut overlay modal popup */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setAttendanceModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-[#E5EAF5] p-6 max-w-sm w-full shadow-2xl relative z-10 text-xs font-semibold">
            <h3 className="text-sm font-bold text-[#494D5F] mb-4">Mark Attendance</h3>
            <form onSubmit={handleAttendanceSubmit} className="space-y-4">
              <div>
                <label className="text-slate-400 block mb-1">Student Register No</label>
                <input
                  type="text"
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value.toUpperCase())}
                  className="w-full p-2 rounded-lg border border-[#E5EAF5] bg-[#F5F7FB] text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value.toUpperCase())}
                  className="w-full p-2 rounded-lg border border-[#E5EAF5] bg-[#F5F7FB] text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-slate-400">Status:</label>
                <button
                  type="button"
                  onClick={() => setIsPresent(true)}
                  className={`px-3 py-1.5 rounded-lg border ${isPresent ? "bg-emerald-500 text-white" : "border-[#E5EAF5] text-slate-500"}`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => setIsPresent(false)}
                  className={`px-3 py-1.5 rounded-lg border ${!isPresent ? "bg-rose-500 text-white" : "border-[#E5EAF5] text-slate-500"}`}
                >
                  Absent
                </button>
              </div>

              {submitSuccess && (
                <div className="p-2 bg-emerald-500/10 text-emerald-500 text-center rounded-lg">
                  Attendance saved successfully!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(false)}
                  className="px-3.5 py-2 border border-[#E5EAF5] rounded-xl text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#8458B3] hover:bg-[#8458B3]/90 text-white rounded-xl font-bold"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
