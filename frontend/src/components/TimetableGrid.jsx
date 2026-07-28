import React from 'react';
import { Book, Award, Clock, MapPin, User, Compass } from 'lucide-react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS = [1, 2, "Break", 3, 4, "Lunch", 5, 6];

const SLOT_TIMES = {
  1: "09:00 AM - 10:00 AM",
  2: "10:00 AM - 11:00 AM",
  "Break": "11:00 AM - 11:15 AM",
  3: "11:15 AM - 12:15 PM",
  4: "12:15 PM - 01:15 PM",
  "Lunch": "01:15 PM - 02:00 PM",
  5: "02:00 PM - 03:00 PM",
  6: "03:00 PM - 04:00 PM"
};

const TimetableGrid = ({ timetable = [], highlightCurrent = false, searchTerm = "" }) => {
  
  // Find a slot in the timetable array
  const findSlot = (day, slot) => {
    return timetable.find(t => t.day === day && String(t.slot) === String(slot));
  };

  const getSlotColor = (slotObj) => {
    if (!slotObj) return "bg-slate-100/30 dark:bg-slate-800/10 text-slate-400";
    if (slotObj.type === "Break" || slotObj.type === "Lunch") return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold";
    if (slotObj.type === "Lab") return "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400";
    if (slotObj.type === "Theory") return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
    if (slotObj.type === "Free") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200";
  };

  const matchesSearch = (slotObj) => {
    if (!searchTerm) return true;
    if (!slotObj) return false;
    const term = searchTerm.toLowerCase();
    return (
      slotObj.subjectCode?.toLowerCase().includes(term) ||
      slotObj.subjectName?.toLowerCase().includes(term) ||
      slotObj.classroom?.toLowerCase().includes(term) ||
      slotObj.facultyName?.toLowerCase().includes(term)
    );
  };

  // Check if this slot represents the current ongoing class (Mock active slot: Monday Period 3)
  const isOngoing = (day, slot) => {
    return highlightCurrent && day === "Monday" && String(slot) === "3";
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/10 backdrop-blur-md">
      <table className="w-full border-collapse min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Day</th>
            {SLOTS.map((s, idx) => (
              <th key={idx} className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[120px]">
                <div className="flex flex-col">
                  <span>{s === "Break" || s === "Lunch" ? s : `Period ${s}`}</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">{SLOT_TIMES[s]}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {DAYS.map((day) => (
            <tr key={day} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
              <td className="p-4 font-bold text-sm text-slate-700 dark:text-slate-300 bg-slate-50/20 dark:bg-slate-900/20">{day}</td>
              {SLOTS.map((slot, sIdx) => {
                const sObj = findSlot(day, slot);
                const isMatched = matchesSearch(sObj);
                const isActive = isOngoing(day, slot);

                // Handle Breaks
                if ((slot === "Break" || slot === "Lunch") && !sObj) {
                  return (
                    <td key={sIdx} className="p-4">
                      <div className="h-full rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-center flex items-center justify-center text-xs text-slate-400">
                        {slot}
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={sIdx} className="p-4">
                    <div 
                      className={`rounded-xl border p-3 flex flex-col justify-between h-[90px] transition-all relative ${getSlotColor(sObj)} ${
                        isActive ? 'ring-2 ring-blue-500 animate-pulse-slow shadow-lg shadow-blue-500/10' : ''
                      } ${!isMatched && searchTerm ? 'opacity-30' : 'opacity-100'}`}
                    >
                      {isActive && (
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-blue-600 text-white rounded-md text-[8px] font-bold uppercase tracking-wider shadow">
                          Ongoing
                        </span>
                      )}

                      {sObj ? (
                        <>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-bold leading-tight line-clamp-1">{sObj.subjectName}</span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/50 dark:bg-slate-800/50 shrink-0">
                              {sObj.subjectCode}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-0.5 mt-2">
                            {sObj.classroom !== '-' && (
                              <span className="text-[10px] flex items-center gap-1">
                                <MapPin className="w-3 h-3 opacity-60" /> Room {sObj.classroom}
                              </span>
                            )}
                            {sObj.facultyName !== '-' && (
                              <span className="text-[10px] flex items-center gap-1 truncate">
                                <User className="w-3 h-3 opacity-60" /> {sObj.facultyName}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[10px] text-slate-400 italic">
                          No Class
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimetableGrid;
