import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { exportTimetableToPDF } from '../services/pdfExport';
import TimetableGrid from '../components/TimetableGrid';
import GlassCard from '../components/GlassCard';
import { 
  Users, 
  BookOpen, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight, 
  FileCheck,
  Download,
  AlertCircle
} from 'lucide-react';

const StaffDashboard = ({ activeTab, searchTerm }) => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [duties, setDuties] = useState({ meetings: [], invigilations: [], subjectAllocation: [] });
  const [loading, setLoading] = useState(true);
  
  // Attendance shortcut state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('STU1001');
  const [selectedSubject, setSelectedSubject] = useState('CS301');
  const [isPresent, setIsPresent] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getStaffTimetable(user.id || 'STAFF201');
        setTimetable(res.timetable || []);
        setDuties(res.duties || { meetings: [], invigilations: [], subjectAllocation: [] });
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

  const handleExport = () => {
    exportTimetableToPDF('staff-timetable-capture', `Timetable_${user.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Calculate free periods: Monday has 6 periods. If STAFF201 has 3 lectures, free slots are 3.
  const occupiedSlotsCount = timetable.length;
  const totalSlotsWeek = 36; // 6 periods * 6 days
  const freePeriodsCount = totalSlotsWeek - occupiedSlotsCount;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {activeTab === 'dashboard' && (
        <>
          {/* Header Summary Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlassCard className="flex items-center gap-4 bg-blue-500/5">
              <div className="p-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Classes</span>
                <span className="block text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{occupiedSlotsCount} Lectures</span>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4 bg-indigo-500/5">
              <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Free Periods</span>
                <span className="block text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{freePeriodsCount} Slots</span>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4 bg-emerald-500/5">
              <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student Strength</span>
                <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">60 Students</span>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center justify-between gap-4 border-2 border-dashed border-blue-500/30 hover:border-blue-500/80 transition-colors">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Shortcut</span>
                <button
                  onClick={() => setAttendanceModalOpen(true)}
                  className="block text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1 text-left"
                >
                  Mark Attendance Now →
                </button>
              </div>
              <FileCheck className="w-6 h-6 text-blue-500" />
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Timetable */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Teaching Schedule</h3>
                  <p className="text-xs text-slate-400">Department of Computer Science</p>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Timetable PDF</span>
                </button>
              </div>

              <div id="staff-timetable-capture">
                <TimetableGrid timetable={timetable} highlightCurrent={true} searchTerm={searchTerm} />
              </div>
            </div>

            {/* Meetings and Invigilations Sidebars */}
            <div className="space-y-6">
              {/* Meeting schedules */}
              <GlassCard className="space-y-4">
                <h3 className="font-bold text-sm text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  Department Meetings
                </h3>
                <div className="space-y-3">
                  {duties.meetings.length === 0 ? (
                    <div className="text-xs text-slate-400">No scheduled meetings.</div>
                  ) : (
                    duties.meetings.map((m) => (
                      <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{m.title}</h4>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                          <span>{m.date} at {m.time}</span>
                          <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {m.venue}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              {/* Invigilations */}
              <GlassCard className="space-y-4">
                <h3 className="font-bold text-sm text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  Exam Invigilation Duty
                </h3>
                <div className="space-y-3">
                  {duties.invigilations.length === 0 ? (
                    <div className="text-xs text-slate-400">No invigilation schedules allocated.</div>
                  ) : (
                    duties.invigilations.map((i) => (
                      <div key={i.id} className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-rose-400">{i.examName}</h4>
                          <span className="text-[8px] uppercase tracking-wider font-bold bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded">Invigilation</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                          <span>{i.date} at {i.time}</span>
                          <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> Room {i.room}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}

      {/* Attendance shortcut dialog modal */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setAttendanceModalOpen(false)}></div>
          
          <div className="relative max-w-sm w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Attendance Entry Shortcut</h3>
            
            {submitSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-center text-xs font-semibold">
                Attendance Saved Successfully!
              </div>
            ) : (
              <form onSubmit={handleAttendanceSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-slate-400 block mb-1">Student Register Number</label>
                  <select 
                    value={selectedStudent} 
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="STU1001">Alex Mercer (STU1001)</option>
                    <option value="STU1002">Emma Watson (STU1002)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Subject Course</label>
                  <select 
                    value={selectedSubject} 
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {duties.subjectAllocation.map((s, idx) => (
                      <option key={idx} value={s.code}>{s.subjectName} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-2">Mark Attendance Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isPresent === true}
                        onChange={() => setIsPresent(true)}
                        className="accent-blue-500"
                      />
                      <span>Present</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isPresent === false}
                        onChange={() => setIsPresent(false)}
                        className="accent-blue-500"
                      />
                      <span>Absent</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAttendanceModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-850"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
                  >
                    Submit Entry
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
