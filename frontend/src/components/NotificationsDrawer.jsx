import React from 'react';
import { motion } from 'framer-motion';
import { X, Bell, Calendar, Info } from 'lucide-react';

const NotificationsDrawer = ({ isOpen, onClose, notifications = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose}></div>
      
      {/* Content */}
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: "tween", duration: 0.3 }}
        className="relative w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-6 z-10"
      >
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3>Notification Board</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center text-slate-400 mt-10">No notifications published recently.</div>
          ) : (
            notifications.map((n, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex gap-3 hover:shadow-sm transition-all"
              >
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-500 self-start shrink-0">
                  {n.title.toLowerCase().includes('holiday') ? (
                    <Calendar className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{n.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">{n.message}</p>
                  <span className="text-[9px] text-slate-400 mt-2 block">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationsDrawer;
