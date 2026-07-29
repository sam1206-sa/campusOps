import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import TimetableGrid from '../components/TimetableGrid';
import { 
  Plus, 
  Trash2, 
  MapPin, 
  UserPlus, 
  BookOpen, 
  AlertTriangle, 
  Sparkles, 
  Calendar,
  Send,
  Building,
  Bell,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

const AdminDashboard = ({ activeTab, searchTerm }) => {
  const [timetable, setTimetable] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newSlot, setNewSlot] = useState({
    day: 'Monday',
    slot: 1,
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    subjectCode: 'CS301',
    subjectName: 'Data Structures & Algorithms',
    type: 'Theory',
    classroom: 'LH-101',
    facultyId: 'STAFF201',
    facultyName: 'Dr. Aris Vance'
  });

  const [newClassroom, setNewClassroom] = useState({ id: '', name: '', type: 'Theory', capacity: 60, equipment: '' });
  const [newFaculty, setNewFaculty] = useState({ id: '', name: '', email: '', dept: 'CSE', designation: 'Professor' });
  const [newSubject, setNewSubject] = useState({ code: '', name: '', type: 'Theory', dept: 'CSE' });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', description: '' });
  const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', role: 'all' });

  // Error/Success state
  const [timetableError, setTimetableError] = useState(null);
  const [timetableSuccess, setTimetableSuccess] = useState(null);
  const [entitySuccess, setEntitySuccess] = useState(null);

  const loadData = async () => {
    try {
      const [tt, cr, fac, sub] = await Promise.all([
        api.getAllTimetable(),
        api.getClassrooms(),
        api.getFaculty(),
        api.getSubjects()
      ]);
      setTimetable(tt || []);
      setClassrooms(cr || []);
      setFaculty(fac || []);
      setSubjects(sub || []);
    } catch (err) {
      console.error("Error loading admin lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setTimetableError(null);
    setTimetableSuccess(null);
    
    // Automatically match names based on selected values
    const selectedSub = subjects.find(s => s.code === newSlot.subjectCode);
    const selectedFac = faculty.find(f => f.id === newSlot.facultyId);
    
    const slotToPost = {
      ...newSlot,
      slot: parseInt(newSlot.slot) || newSlot.slot,
      subjectName: selectedSub ? selectedSub.name : newSlot.subjectName,
      type: selectedSub ? selectedSub.type : newSlot.type,
      facultyName: selectedFac ? selectedFac.name : newSlot.facultyName
    };

    try {
      await api.addTimetableSlot(slotToPost);
      setTimetableSuccess("Timetable slot added successfully!");
      loadData();
    } catch (err) {
      setTimetableError(err.message);
    }
  };

  const handleDeleteSlot = async (day, slot, subjectCode) => {
    if (!window.confirm("Are you sure you want to delete this class slot?")) return;
    try {
      await api.deleteTimetableSlot(day, slot, subjectCode);
      loadData();
    } catch (err) {
      alert("Error deleting slot: " + err.message);
    }
  };

  // Add Classroom
  const handleAddClassroom = async (e) => {
    e.preventDefault();
    if (!newClassroom.id || !newClassroom.name) return;
    const item = { ...newClassroom, equipment: newClassroom.equipment.split(',').map(x => x.trim()) };
    await api.addClassroom(item);
    setEntitySuccess("Classroom added successfully!");
    setNewClassroom({ id: '', name: '', type: 'Theory', capacity: 60, equipment: '' });
    loadData();
  };

  // Add Faculty
  const handleAddFaculty = async (e) => {
    e.preventDefault();
    if (!newFaculty.id || !newFaculty.name) return;
    await api.addFaculty(newFaculty);
    setEntitySuccess("Faculty added successfully!");
    setNewFaculty({ id: '', name: '', email: '', dept: 'CSE', designation: 'Professor' });
    loadData();
  };

  // Add Subject
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.code || !newSubject.name) return;
    await api.addSubject(newSubject);
    setEntitySuccess("Subject added successfully!");
    setNewSubject({ code: '', name: '', type: 'Theory', dept: 'CSE' });
    loadData();
  };

  // Add Holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    await api.addHoliday(newHoliday);
    setEntitySuccess("Holiday published successfully!");
    setNewHoliday({ name: '', date: '', description: '' });
  };

  // Broadcast Alert
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!newBroadcast.title || !newBroadcast.message) return;
    await api.publishNotification(newBroadcast.title, newBroadcast.message, newBroadcast.role);
    setEntitySuccess("System notification broadcasted!");
    setNewBroadcast({ title: '', message: '', role: 'all' });
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Timetable grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Active College Timetable</h3>
                <p className="text-xs text-slate-400">Conflict warnings and slot removals apply instantly</p>
              </div>
            </div>

            <TimetableGrid timetable={timetable} highlightCurrent={false} searchTerm={searchTerm} />

            {/* List slots with delete triggers */}
            <GlassCard className="space-y-4 mt-6">
              <h4 className="font-bold text-sm text-slate-850 dark:text-white">Quick Slot Management list</h4>
              <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-2 pr-1">
                {timetable.filter(s => s.subjectCode !== 'BREAK' && s.subjectCode !== 'LUNCH').map((slot, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                    <div>
                      <span className="font-bold text-blue-500">{slot.day} Period {slot.slot}</span>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{slot.subjectName} ({slot.subjectCode})</span>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="text-slate-500">Room {slot.classroom} • {slot.facultyName}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSlot(slot.day, slot.slot, slot.subjectCode)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Form to Add / Edit slots */}
          <div className="space-y-6">
            <GlassCard className="space-y-4">
              <h3 className="font-bold text-sm text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" /> Allocate Timetable Slot
              </h3>

              {timetableError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] rounded-xl flex gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{timetableError}</span>
                </div>
              )}

              {timetableSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] rounded-xl flex gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{timetableSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddSlot} className="space-y-3.5 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Weekday</label>
                    <select
                      value={newSlot.day}
                      onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Period Slot</label>
                    <select
                      value={newSlot.slot}
                      onChange={(e) => setNewSlot({ ...newSlot, slot: parseInt(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Period {s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Start Time</label>
                    <input
                      type="text"
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      placeholder="e.g. 09:00 AM"
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">End Time</label>
                    <input
                      type="text"
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      placeholder="e.g. 10:00 AM"
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Subject</label>
                  <select
                    value={newSlot.subjectCode}
                    onChange={(e) => setNewSlot({ ...newSlot, subjectCode: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {subjects.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Classroom</label>
                    <select
                      value={newSlot.classroom}
                      onChange={(e) => setNewSlot({ ...newSlot, classroom: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="-">None (Free/Break)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Assigned Faculty</label>
                    <select
                      value={newSlot.facultyId}
                      onChange={(e) => setNewSlot({ ...newSlot, facultyId: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      <option value="-">None (Free/Break)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Slot & Notify</span>
                </button>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'entities' && (
        <div className="space-y-6">
          {/* Entity success alert */}
          {entitySuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-xl flex gap-2 font-semibold">
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
              <span>{entitySuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Classroom */}
            <GlassCard className="space-y-4">
              <h3 className="font-bold text-sm text-slate-850 dark:text-white flex items-center gap-1.5"><Building className="w-4 h-4 text-blue-500" /> Add Classroom</h3>
              <form onSubmit={handleAddClassroom} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="text-slate-400 block mb-1">Room ID</label>
                  <input
                    type="text"
                    value={newClassroom.id}
                    onChange={(e) => setNewClassroom({ ...newClassroom, id: e.target.value.toUpperCase() })}
                    placeholder="e.g. LH-301"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Room Name</label>
                  <input
                    type="text"
                    value={newClassroom.name}
                    onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                    placeholder="e.g. Lecture Hall 301"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Type</label>
                    <select
                      value={newClassroom.type}
                      onChange={(e) => setNewClassroom({ ...newClassroom, type: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="Theory">Theory</option>
                      <option value="Lab">Lab</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Capacity</label>
                    <input
                      type="number"
                      value={newClassroom.capacity}
                      onChange={(e) => setNewClassroom({ ...newClassroom, capacity: parseInt(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Equipment (comma separated)</label>
                  <input
                    type="text"
                    value={newClassroom.equipment}
                    onChange={(e) => setNewClassroom({ ...newClassroom, equipment: e.target.value })}
                    placeholder="Projector, PCs, AC"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow">
                  Save Classroom
                </button>
              </form>
            </GlassCard>

            {/* Add Faculty */}
            <GlassCard className="space-y-4">
              <h3 className="font-bold text-sm text-slate-850 dark:text-white flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-blue-500" /> Add Faculty</h3>
              <form onSubmit={handleAddFaculty} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="text-slate-400 block mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={newFaculty.id}
                    onChange={(e) => setNewFaculty({ ...newFaculty, id: e.target.value.toUpperCase() })}
                    placeholder="e.g. STAFF206"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newFaculty.name}
                    onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
                    placeholder="e.g. Dr. Jane Doe"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newFaculty.email}
                    onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
                    placeholder="jane.doe@college.edu"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Department</label>
                    <select
                      value={newFaculty.dept}
                      onChange={(e) => setNewFaculty({ ...newFaculty, dept: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="MECH">MECH</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Designation</label>
                    <input
                      type="text"
                      value={newFaculty.designation}
                      onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                      placeholder="e.g. Professor"
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow">
                  Save Faculty
                </button>
              </form>
            </GlassCard>

            {/* Add Subject */}
            <GlassCard className="space-y-4">
              <h3 className="font-bold text-sm text-slate-850 dark:text-white flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-blue-500" /> Add Subject</h3>
              <form onSubmit={handleAddSubject} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="text-slate-400 block mb-1">Subject Code</label>
                  <input
                    type="text"
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CS401"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="e.g. Artificial Intelligence"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Type</label>
                    <select
                      value={newSubject.type}
                      onChange={(e) => setNewSubject({ ...newSubject, type: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="Theory">Theory</option>
                      <option value="Lab">Lab</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Department</label>
                    <select
                      value={newSubject.dept}
                      onChange={(e) => setNewSubject({ ...newSubject, dept: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="MECH">MECH</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow">
                  Save Subject
                </button>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Holiday */}
          <GlassCard className="space-y-4">
            <h3 className="font-bold text-sm text-slate-850 dark:text-white flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> Announce Holiday</h3>
            <form onSubmit={handleAddHoliday} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="text-slate-400 block mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="e.g. Diwali Holiday"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  placeholder="Brief details about closure..."
                  rows="3"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow">
                Declare Holiday
              </button>
            </form>
          </GlassCard>

          {/* Broadcast Notification */}
          <GlassCard className="space-y-4">
            <h3 className="font-bold text-sm text-slate-850 dark:text-white flex items-center gap-1.5"><Bell className="w-4 h-4 text-blue-500" /> Broadcast System Notification</h3>
            <form onSubmit={handleBroadcast} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="text-slate-400 block mb-1">Broadcast Title</label>
                <input
                  type="text"
                  value={newBroadcast.title}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                  placeholder="e.g. Urgent Syllabus Update"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Audience Portal</label>
                <select
                  value={newBroadcast.role}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, role: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All Portals (Staff + Student)</option>
                  <option value="student">Student Portal Only</option>
                  <option value="staff">Staff Portal Only</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Broadcast Message Body</label>
                <textarea
                  value={newBroadcast.message}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                  placeholder="Type message text here..."
                  rows="3"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center justify-center gap-1.5">
                <Send className="w-4 h-4" />
                <span>Send Broadcast Alert</span>
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
