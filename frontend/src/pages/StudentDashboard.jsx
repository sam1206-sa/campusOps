import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { exportTimetableToPDF } from '../services/pdfExport';
import TimetableGrid from '../components/TimetableGrid';
import AttendanceChart from '../components/AttendanceChart';
import CountdownTimer from '../components/CountdownTimer';
import GlassCard from '../components/GlassCard';
import { 
  Download, 
  Printer,
  Calendar, 
  BookOpen, 
  MapPin, 
  User, 
  AlertCircle, 
  CheckCircle,
  FileText,
  Clock
} from 'lucide-react';

const StudentDashboard = ({ activeTab, searchTerm }) => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ttRes, assignRes, examsRes] = await Promise.all([
          api.getStudentTimetable(user.regNo),
          api.getAssignments(user.regNo),
          api.getExams(user.regNo)
        ]);
        setTimetable(ttRes.timetable || []);
        setAssignments(assignRes || []);
        setExams(examsRes || []);
      } catch (err) {
        console.error("Error loading student portal data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.regNo]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportTimetableToPDF('timetable-element-capture', `Timetable_${user.regNo}.pdf`);
  };

  // Find Monday's class index 3 (simulating current class)
  const activeClass = timetable.find(c => c.day === "Monday" && c.slot === 3);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {activeTab === 'dashboard' && (
        <>
          {/* Ongoing class banner */}
          <GlassCard className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-500/10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Ongoing Session
                </span>
                {activeClass ? (
                  <>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mt-1">
                      {activeClass.subjectName} ({activeClass.subjectCode})
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Room {activeClass.classroom}</span>
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {activeClass.facultyName}</span>
                    </div>
                  </>
                ) : (
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white mt-1">No Active Classes Right Now</h2>
                )}
              </div>
            </div>

            {/* Next class countdown timer */}
            <div className="flex flex-col items-end shrink-0 w-full lg:w-auto">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Next Class Starts In</span>
              <CountdownTimer targetTimeStr="11:15 AM" />
            </div>
          </GlassCard>

          {/* Stats & Timetable export controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timetable Grid main panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-850 dark:text-white">Timetable Schedule</h3>
                  <p className="text-xs text-slate-400">Section {user.section} • Year {user.year}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Grid Capture Wrap */}
              <div id="timetable-element-capture">
                <TimetableGrid timetable={timetable} highlightCurrent={true} searchTerm={searchTerm} />
              </div>
            </div>

            {/* Attendance percentage gauge */}
            <div className="space-y-6">
              <GlassCard>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm text-slate-850 dark:text-white">Academic Attendance</h3>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((user.attendance.attended / user.attendance.totalClasses) * 100)}% Overall
                  </span>
                </div>
                
                {/* Visual gauge */}
                <AttendanceChart attendanceData={user.attendance} />
                
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attended</span>
                    <span className="block text-lg font-bold text-emerald-500 mt-1">{user.attendance.attended} Lectures</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                    <span className="block text-lg font-bold text-slate-650 dark:text-slate-350 mt-1">{user.attendance.totalClasses} Lectures</span>
                  </div>
                </div>
              </GlassCard>

              {/* Highlighting warnings */}
              {Math.round((user.attendance.attended / user.attendance.totalClasses) * 100) < 75 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex gap-3 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <h5 className="font-bold">Low Attendance Warning</h5>
                    <p className="mt-1 leading-normal opacity-90">Your attendance is currently below the required 75% limit. Attend classes regularly to avoid exam registration hold-back.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignments */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Assignments Deadlines</h3>
            <div className="space-y-3">
              {assignments.map((a) => (
                <GlassCard key={a.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
                        {a.subjectCode}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">{a.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-1.5 leading-relaxed">{a.description}</p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold mt-3">
                      <span>Points: {a.points}</span>
                      <span>Due: {a.dueDate}</span>
                    </div>
                  </div>
                  
                  {a.status === 'Submitted' ? (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-xs font-bold shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> Checked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Exams list */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Semester Exam Schedule</h3>
            <div className="space-y-3">
              {exams.map((e) => (
                <div key={e.id} className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/50 hover:shadow-sm transition-all space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider">{e.subjectCode}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{e.type}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-normal">{e.subjectName}</h4>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    <span>Date: {e.date}</span>
                    <span>Room: {e.room}</span>
                  </div>
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
