import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  ArrowRight, 
  Lock, 
  User, 
  UserCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  Search,
  BookOpen,
  Briefcase
} from 'lucide-react';

const Login = () => {
  const { login, error: authError, loading } = useAuth();
  const [role, setRole] = useState('student'); // 'student', 'staff', 'admin'
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState(''); // dummy
  const [error, setError] = useState(null);

  // Public schedules state
  const [timetable, setTimetable] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleDay, setScheduleDay] = useState('Monday'); // 'Monday' (Today) or 'Tuesday' (Tomorrow)

  useEffect(() => {
    const fetchPublicSchedules = async () => {
      try {
        const [ttRes, facRes] = await Promise.all([
          fetch('http://localhost:5000/api/timetable/all').then(r => r.json()),
          fetch('http://localhost:5000/api/entities/faculty').then(r => r.json())
        ]);
        setTimetable(Array.isArray(ttRes) ? ttRes : []);
        setFacultyList(Array.isArray(facRes) ? facRes : []);
      } catch (err) {
        console.error("Failed to load public schedules:", err);
        setTimetable([]);
        setFacultyList([]);
      }
    };
    fetchPublicSchedules();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim()) {
      setError('Please enter your credentials ID.');
      return;
    }
    setError(null);
    try {
      await login(userId, role);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleQuickLogin = async (presetId, presetRole) => {
    setError(null);
    try {
      await login(presetId, presetRole);
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    }
  };

  // Filter schedules for display (Today or Tomorrow)
  const displaySchedules = timetable.filter(slot => {
    if (slot.day !== scheduleDay) return false;
    if (slot.subjectCode === 'BREAK' || slot.subjectCode === 'LUNCH') return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        slot.subjectName?.toLowerCase().includes(q) ||
        slot.subjectCode?.toLowerCase().includes(q) ||
        slot.classroom?.toLowerCase().includes(q) ||
        slot.facultyName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-[#0b1329] dark:via-slate-900/30 dark:to-slate-950 p-6 relative overflow-hidden font-sans">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-[100px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-[100px] -z-10"></div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Login panel */}
        <div className="lg:col-span-5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/20 dark:border-slate-800/40 shadow-2xl p-8 flex flex-col justify-between">
          <div>
            {/* Header Logo */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 mb-3">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-850 dark:text-white">Smart Schedule Agent</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Select your portal role to access class timetables</p>
            </div>

            {/* Role Tabs */}
            <div className="flex bg-slate-100/80 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 mb-6">
              {['student', 'staff', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); setUserId(''); setError(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    role === r
                      ? 'bg-[#8458B3] text-white shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 font-semibold">
                  {role === 'student' ? 'Register Number' : role === 'staff' ? 'Staff ID' : 'Admin Username'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder={role === 'student' ? 'e.g. STU1001' : role === 'staff' ? 'e.g. STAFF201' : 'e.g. ADMIN'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 font-semibold">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {(error || authError) && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl font-semibold">
                  {error || authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#8458B3] hover:bg-[#8458B3]/90 disabled:bg-[#8458B3]/50 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
              >
                {loading ? 'Authenticating...' : 'Enter Portal'}
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>

          {/* Presets */}
          <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-850">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3 font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Quick Login Presets
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin('STU1001', 'student')}
                className="py-2 px-1 text-[10px] font-bold border border-[#E5EAF5] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition-all"
              >
                STU1001 (Student)
              </button>
              <button
                onClick={() => handleQuickLogin('STAFF201', 'staff')}
                className="py-2 px-1 text-[10px] font-bold border border-[#E5EAF5] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition-all"
              >
                STAFF201 (Staff)
              </button>
              <button
                onClick={() => handleQuickLogin('ADMIN', 'admin')}
                className="py-2 px-1 text-[10px] font-bold border border-[#E5EAF5] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition-all"
              >
                ADMIN (Admin)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Public Schedule Overview panel */}
        <div className="lg:col-span-7 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/20 dark:border-slate-800/40 shadow-2xl p-8 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-[#E5EAF5] pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#8458B3]" /> Public Lecture Schedule
            </h3>
            
            {/* Day Switcher */}
            <div className="flex bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setScheduleDay('Monday')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  scheduleDay === 'Monday' ? 'bg-[#8458B3] text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setScheduleDay('Tuesday')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  scheduleDay === 'Tuesday' ? 'bg-[#8458B3] text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures by subject, classroom, or teacher name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Schedule list */}
          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1 text-xs font-semibold">
            {displaySchedules.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                No lectures match your filters for {scheduleDay}.
              </div>
            ) : (
              displaySchedules.map((slot, idx) => (
                <div key={idx} className="p-4 bg-white/80 dark:bg-slate-800/40 rounded-2xl border border-[#E5EAF5] dark:border-slate-800 flex justify-between items-center hover:shadow-sm transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold bg-[#E6F3FA] text-[#8458B3] border border-[#A0D2EB]/30 px-2 py-0.5 rounded">
                        {slot.subjectCode}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-normal">{slot.subjectName}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-slate-450 dark:text-slate-400 text-[10px] font-medium pt-1">
                      <span className="flex items-center gap-0.5"><User className="w-3 h-3 text-[#8458B3]" /> {slot.facultyName}</span>
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-[#8458B3]" /> Room {slot.classroom}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-[#8458B3] bg-[#F2ECFC] px-2.5 py-1 rounded-xl border border-[#D0BDF4]/30 block mb-1">
                      Period {slot.slot}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-semibold">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
