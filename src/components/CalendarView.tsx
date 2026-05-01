import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Video,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { CalendarEvent, WorkspaceSession } from '../types';
import { db, collection, query, onSnapshot, addDoc, deleteDoc, doc } from '../firebase';
import { cn } from '../lib/utils';

interface CalendarViewProps {
  currentUserId: string;
  sessions: WorkspaceSession[];
}

export function CalendarView({ currentUserId, sessions }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'general' as CalendarEvent['type'],
    relatedSessionId: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'calendar_events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: CalendarEvent[] = [];
      snapshot.forEach((doc) => {
        fetchedEvents.push({ id: doc.id, ...doc.data() } as CalendarEvent);
      });
      setEvents(fetchedEvents);
    }, (error) => {
      console.error("Error fetching calendar events: ", error);
    });

    return () => unsubscribe();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const snapToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setNewEvent({ ...newEvent, startTime: '', endTime: '' });
    setIsAddingEvent(true);
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title.trim() || !selectedDate) return;
    
    try {
      await addDoc(collection(db, 'calendar_events'), {
        title: newEvent.title,
        description: newEvent.description,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        type: newEvent.type,
        createdBy: currentUserId,
        relatedSessionId: newEvent.relatedSessionId || null
      });
      setIsAddingEvent(false);
      setNewEvent({ title: '', description: '', startTime: '', endTime: '', type: 'general', relatedSessionId: '' });
    } catch (e) {
      console.error("Failed to save event:", e);
    }
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'calendar_events', id));
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const getDayEvents = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deadline': return 'bg-red-100 text-red-800 border-red-200';
      case 'task': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Video className="w-3 h-3" />;
      case 'deadline': return <AlertCircle className="w-3 h-3" />;
      case 'task': return <FileText className="w-3 h-3" />;
      default: return <CalendarIcon className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-500" />
            Calendar
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Schedule meetings, set task deadlines, and view upcoming events.
          </p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
          <button 
            onClick={snapToToday}
            className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button 
              onClick={prevMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <span className="min-w-[120px] text-center font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              {format(currentDate, dateFormat)}
            </span>
            <button 
              onClick={nextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-900/50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-3 text-center text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-zinc-200 dark:bg-zinc-800 gap-px">
            {days.map((day, idx) => {
              const dayEvents = getDayEvents(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-[100px] bg-white dark:bg-zinc-900 p-2 transition-colors cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 group relative",
                    !isSameMonth(day, monthStart) ? "text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/50" : "text-zinc-900 dark:text-zinc-200"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                      isToday ? "bg-indigo-600 text-white" : ""
                    )}>
                      {format(day, 'd')}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-indigo-600 transition-opacity">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                    {dayEvents.map(event => (
                      <div 
                        key={event.id}
                        className={cn(
                          "px-1.5 py-1 text-[10px] sm:text-xs rounded border truncate flex items-center justify-between group/event",
                          getTypeColor(event.type)
                        )}
                        title={event.title}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {getTypeIcon(event.type)}
                          <span className="truncate">
                            {event.startTime && `${event.startTime} `}
                            {event.title}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteEvent(event.id, e)}
                          className="opacity-0 group-hover/event:opacity-100 ml-1 text-red-600 hover:bg-red-200 rounded p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddingEvent && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsAddingEvent(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium flex justify-between items-center">
                <h3>Add Event for {format(selectedDate, 'MMM d, yyyy')}</h3>
                <button onClick={() => setIsAddingEvent(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Event Title</label>
                  <input 
                    type="text" 
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="e.g. Project Sync"
                    className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                  <select 
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                    className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="general">General</option>
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Related Workspace / Project (Optional)</label>
                  <select 
                    value={newEvent.relatedSessionId}
                    onChange={e => setNewEvent({...newEvent, relatedSessionId: e.target.value})}
                    className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="">None</option>
                    {sessions.filter(s => s.type === 'workspace' || s.type === 'group').map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Start Time (Optional)</label>
                    <input 
                      type="time" 
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                      className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">End Time (Optional)</label>
                    <input 
                      type="time" 
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                      className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    placeholder="Add details, links, or notes..."
                    rows={3}
                    className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button 
                  onClick={() => setIsAddingEvent(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEvent}
                  disabled={!newEvent.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
