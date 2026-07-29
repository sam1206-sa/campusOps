import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, ArrowRight, Bot, Lock, Sparkles, User, UserCheck } from 'lucide-react';

const Login = () => {
  const { login, error: authError, loading } = useAuth();
  const [role, setRole] = useState('student'); // 'student', 'staff', 'admin'
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState(''); // dummy
  const [error, setError] = useState(null);

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

  // Preset Credentials Helper
  const handleQuickLogin = async (presetId, presetRole) => {
    setError(null);
    try {
      await login(presetId, presetRole);
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-[#0b1329] dark:via-slate-900/30 dark:to-slate-950 p-6 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-[100px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-[100px] -z-10"></div>

      <div className="max-w-md w-full glass-panel rounded-3xl border border-white/20 dark:border-slate-800/40 shadow-2xl p-8 relative">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 mb-3 animate-pulse-slow">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Smart Schedule Agent</h2>
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
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              {role === 'student' ? 'Register Number' : role === 'staff' ? 'Staff ID' : 'Admin Username'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={role === 'student' ? 'e.g. STU1001' : role === 'staff' ? 'e.g. STAFF201' : 'e.g. ADMIN'}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/10 transition-all"
          >
            {loading ? 'Authenticating...' : 'Enter Portal'}
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </form>

        {/* Demo Fast Presets */}
        <div className="mt-8 pt-6 border-t border-slate-250/30 dark:border-slate-800/30">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Quick Login Presets
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('STU1001', 'student')}
              className="py-2 px-1 text-[10px] font-bold border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-blue-500/5 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-350 transition-all"
            >
              Student (STU1001)
            </button>
            <button
              onClick={() => handleQuickLogin('STAFF201', 'staff')}
              className="py-2 px-1 text-[10px] font-bold border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-blue-500/5 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-350 transition-all"
            >
              Faculty (STAFF201)
            </button>
            <button
              onClick={() => handleQuickLogin('ADMIN', 'admin')}
              className="py-2 px-1 text-[10px] font-bold border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-blue-500/5 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-350 transition-all"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
