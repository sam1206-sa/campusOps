import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  CalendarRange, 
  LogOut, 
  GraduationCap, 
  Settings,
  Bell
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  
  const getNavItems = () => {
    const role = user?.role;
    
    if (role === 'student') {
      return [
        { id: 'dashboard', label: 'My Timetable', icon: Calendar },
        { id: 'assignments', label: 'Assignments & Exams', icon: BookOpen },
        { id: 'events', label: 'Holidays & Events', icon: CalendarRange },
      ];
    } else if (role === 'staff') {
      return [
        { id: 'dashboard', label: 'Teaching Hub', icon: LayoutDashboard },
        { id: 'events', label: 'College Events', icon: CalendarRange },
      ];
    } else if (role === 'admin') {
      return [
        { id: 'dashboard', label: 'Timetable Control', icon: Settings },
        { id: 'entities', label: 'Campus Entities', icon: GraduationCap },
        { id: 'events', label: 'Holidays & Broadcast', icon: Bell },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 glass-panel border-r border-slate-200/50 dark:border-slate-800/50 h-screen sticky top-0 flex flex-col p-6 shrink-0 transition-all duration-300 hidden md:flex">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 dark:text-white leading-none text-base">Smart Schedule</h1>
          <span className="text-[10px] font-semibold text-blue-500 tracking-wider uppercase mt-1 block">Campus Agent</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Card Profile */}
      <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-200/20">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate">{user?.name || 'Administrator'}</h4>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">{user?.role}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-950/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 text-xs font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Disconnect Portal</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
