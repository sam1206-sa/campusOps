import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, Sun, Moon, Search, Sparkles, RefreshCw, UserCheck, Menu } from 'lucide-react';

const Navbar = ({ onOpenNotifications, notificationsCount = 0, onSearch }) => {
  const { user, login, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e) => {
    setSearchVal(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  // Quick Role Swap for Demo /pair-programming ease of evaluation
  const handleQuickSwap = async (role) => {
    logout();
    if (role === 'student') {
      await login('STU1001', 'student');
    } else if (role === 'staff') {
      await login('STAFF201', 'staff');
    } else if (role === 'admin') {
      await login('ADMIN001', 'admin');
    }
    // Reload dashboard
    window.location.reload();
  };

  return (
    <header className="glass-panel border-b border-slate-200/40 dark:border-slate-800/40 px-6 py-4 sticky top-0 z-30 flex items-center justify-between gap-4">
      {/* Search Input bar */}
      <div className="relative max-w-md w-full hidden sm:block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchVal}
          onChange={handleSearchChange}
          placeholder="Search subjects, faculty or classroom..."
          className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Brand Mobile view only */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="p-2 bg-blue-600 text-white rounded-lg">
          <Sparkles className="w-5 h-5" />
        </div>
        <span className="font-bold text-sm text-slate-800 dark:text-white">Smart Schedule</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        {/* Quick Role Switcher widget */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 mr-2 text-xs">
          <span className="text-[10px] text-slate-400 font-bold px-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-500" /> SWAP:
          </span>
          <button
            onClick={() => handleQuickSwap('student')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              user?.role === 'student' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => handleQuickSwap('staff')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              user?.role === 'staff' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => handleQuickSwap('admin')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              user?.role === 'admin' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200/30 dark:border-slate-700/30 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-100"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200/30 dark:border-slate-700/30 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-100 relative"
        >
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#0b1329]"></span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
