import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  MapPin,
  Clock,
  Trash2,
  Edit2,
  Bell,
  Repeat,
  CheckCircle2,
  Tag,
  AlertCircle,
  X,
  Filter,
  CalendarDays,
  CalendarRange,
  ListTodo
} from 'lucide-react';
import { CalendarEvent, EventCategory, RecurrenceType, UserProfile } from '../types';
import { voiceService } from '../services/voiceService';
import { userDataService } from '../services/userDataService';

interface CalendarViewProps {
  currentUser?: UserProfile | null;
  onExit?: () => void;
}

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; border: string; badge: string }> = {
  work: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-800', badge: 'bg-blue-600 text-white' },
  personal: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-800', badge: 'bg-emerald-600 text-white' },
  study: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-800', badge: 'bg-purple-600 text-white' },
  urgent: { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-800', badge: 'bg-rose-600 text-white' },
  health: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-800', badge: 'bg-amber-600 text-white' },
};

const STORAGE_KEY = 'ai_studio_calendar_events_v1';

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    userId: '',
    title: 'Team Sync & Roadmap Review',
    description: 'Weekly product roadmap planning with engineering leads.',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    location: 'Conference Room A / Zoom',
    category: 'work',
    recurrence: 'weekly',
    reminderMinutesBefore: 15,
  },
  {
    id: '2',
    userId: '',
    title: 'Gym & Cardio Workout',
    description: 'Upper body strength training and core stability.',
    date: new Date().toISOString().split('T')[0],
    startTime: '17:30',
    endTime: '18:30',
    location: 'City Fitness Center',
    category: 'health',
    recurrence: 'daily',
    reminderMinutesBefore: 30,
  },
  {
    id: '3',
    userId: '',
    title: 'Advanced TypeScript Study',
    description: 'Review generics, conditional types, and template literal types.',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '19:00',
    endTime: '20:30',
    location: 'Home Office',
    category: 'study',
    recurrence: 'none',
    reminderMinutesBefore: 10,
  },
];

export const CalendarView: React.FC<CalendarViewProps> = ({ currentUser, onExit }) => {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getCalendarEvents(userId);
  });

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    const loaded = userDataService.getCalendarEvents(userId);
    setEvents(loaded);
  }, [currentUser?.id]);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeView, setActiveView] = useState<'month' | 'week' | 'day' | 'upcoming'>('month');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(selectedDateStr);
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('10:00');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formCategory, setFormCategory] = useState<EventCategory>('work');
  const [formRecurrence, setFormRecurrence] = useState<RecurrenceType>('none');
  const [formReminder, setFormReminder] = useState<number>(15);

  // Persist events
  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    userDataService.saveCalendarEvents(userId, events);
  }, [events, currentUser?.id]);

  // Handle Navigation
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (activeView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (activeView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (activeView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (activeView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Open Add Modal
  const handleOpenAddModal = (dateStr?: string) => {
    setEditingEventId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(dateStr || selectedDateStr);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormLocation('');
    setFormCategory('work');
    setFormRecurrence('none');
    setFormReminder(15);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    setFormDate(event.date);
    setFormStartTime(event.startTime);
    setFormEndTime(event.endTime);
    setFormLocation(event.location || '');
    setFormCategory(event.category);
    setFormRecurrence(event.recurrence);
    setFormReminder(event.reminderMinutesBefore);
    setIsModalOpen(true);
  };

  // Save Event
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const userId = currentUser?.id || 'guest';
    let updatedEvents: CalendarEvent[] = [];

    if (editingEventId) {
      updatedEvents = events.map((ev) =>
        ev.id === editingEventId
          ? {
              ...ev,
              title: formTitle.trim(),
              description: formDescription.trim(),
              date: formDate,
              startTime: formStartTime,
              endTime: formEndTime,
              location: formLocation.trim(),
              category: formCategory,
              recurrence: formRecurrence,
              reminderMinutesBefore: formReminder,
            }
          : ev
      );
      setEvents(updatedEvents);
      userDataService.saveCalendarEvents(userId, updatedEvents);
      voiceService.speak('Event updated successfully.');
    } else {
      const newEvent: CalendarEvent = {
        id: 'evt_' + Date.now(),
        userId: userId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        location: formLocation.trim(),
        category: formCategory,
        recurrence: formRecurrence,
        reminderMinutesBefore: formReminder,
      };
      updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      userDataService.saveCalendarEvents(userId, updatedEvents);
      voiceService.speak('New event added successfully.');
    }

    setIsModalOpen(false);
  };

  // Delete Event
  const handleDeleteEvent = (id: string) => {
    const userId = currentUser?.id || 'guest';
    const updatedEvents = events.filter((ev) => ev.id !== id);
    setEvents(updatedEvents);
    userDataService.saveCalendarEvents(userId, updatedEvents);
    voiceService.speak('Event deleted.');
  };

  // Toggle Completed
  const handleToggleComplete = (id: string) => {
    const userId = currentUser?.id || 'guest';
    const updatedEvents = events.map((ev) => (ev.id === id ? { ...ev, completed: !ev.completed } : ev));
    setEvents(updatedEvents);
    userDataService.saveCalendarEvents(userId, updatedEvents);
  };

  // Generate Month Grid Days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter events by search & category
  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategoryFilter === 'all' || ev.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Events for selected date
  const selectedDateEvents = filteredEvents.filter((ev) => ev.date === selectedDateStr);

  // Upcoming events (date >= today)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = [...filteredEvents]
    .filter((ev) => ev.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Smart Calendar & Events</h1>
            <p className="text-xs text-slate-400">Manage schedules, recurring events, categories, and reminders</p>
          </div>
        </div>

        {/* View Switcher Option Bar */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 self-start md:self-auto">
          <button
            onClick={() => setActiveView('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'month'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span>Month</span>
          </button>
          <button
            onClick={() => setActiveView('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'week'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 shrink-0" />
            <span>Week</span>
          </button>
          <button
            onClick={() => setActiveView('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'day'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Day</span>
          </button>
          <button
            onClick={() => setActiveView('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'upcoming'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 shrink-0" />
            <span>Upcoming</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Navigation & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        {/* Date Navigation */}
        <div className="lg:col-span-4 flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm font-bold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
        </div>

        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search events, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="lg:col-span-4 flex items-center justify-end space-x-2 overflow-x-auto pb-1 lg:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex space-x-1.5 text-xs">
            {['all', 'work', 'personal', 'study', 'urgent', 'health'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  selectedCategoryFilter === cat
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Calendar Grid */}
        <div className="lg:col-span-8 flex flex-col">
          {activeView === 'month' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-3 text-center text-xs font-semibold text-slate-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty slots for previous month */}
                {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-28 bg-slate-950/30 rounded-xl border border-slate-900 opacity-30"></div>
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const monthStr = String(month + 1).padStart(2, '0');
                  const dayStr = String(dayNum).padStart(2, '0');
                  const dateStr = `${year}-${monthStr}-${dayStr}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDateStr;

                  const dayEvents = filteredEvents.filter((ev) => ev.date === dateStr);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={`h-28 bg-slate-950/60 rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer overflow-hidden group ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
                          : isToday
                          ? 'border-emerald-500/50 bg-emerald-950/10'
                          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                            isToday
                              ? 'bg-emerald-500 text-slate-950'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-300'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Snippets */}
                      <div className="flex-1 overflow-y-auto space-y-1 mt-1 scrollbar-thin">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium border ${
                              CATEGORY_COLORS[ev.category]?.bg || 'bg-slate-800'
                            } ${CATEGORY_COLORS[ev.category]?.text || 'text-slate-200'} ${
                              CATEGORY_COLORS[ev.category]?.border || 'border-slate-700'
                            }`}
                          >
                            {ev.startTime} {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-slate-500 font-medium pl-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddModal(dateStr);
                          }}
                          className="p-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded transition-all"
                          title="Add event on this date"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'week' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex-1 flex flex-col">
              <h2 className="text-sm font-bold text-white mb-2">Weekly Agenda View</h2>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - d.getDay() + idx);
                  const dateStr = d.toISOString().split('T')[0];
                  const isToday = dateStr === todayStr;
                  const dayEvents = filteredEvents.filter((ev) => ev.date === dateStr);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={`bg-slate-950/80 border rounded-xl p-3 flex flex-col min-h-[320px] cursor-pointer transition-all ${
                        dateStr === selectedDateStr ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                        <span className="text-xs font-bold text-slate-400">
                          {d.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span
                          className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                            isToday ? 'bg-emerald-500 text-slate-950' : 'text-white bg-slate-800'
                          }`}
                        >
                          {d.getDate()}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {dayEvents.length === 0 ? (
                          <p className="text-[10px] text-slate-600 text-center py-8">No events</p>
                        ) : (
                          dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className={`p-2 rounded-xl border text-xs space-y-1 ${
                                CATEGORY_COLORS[ev.category]?.bg || 'bg-slate-900'
                              } ${CATEGORY_COLORS[ev.category]?.border || 'border-slate-800'}`}
                            >
                              <div className="flex items-center justify-between font-bold text-white">
                                <span className="truncate">{ev.title}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{ev.startTime} - {ev.endTime}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'day' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">
                  Schedule for {selectedDateStr}
                </h2>
                <button
                  onClick={() => handleOpenAddModal(selectedDateStr)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  + Add for this day
                </button>
              </div>

              <div className="space-y-3">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    No events scheduled for {selectedDateStr}. Click above to create one.
                  </div>
                ) : (
                  selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        CATEGORY_COLORS[ev.category]?.bg || 'bg-slate-950'
                      } ${CATEGORY_COLORS[ev.category]?.border || 'border-slate-800'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${CATEGORY_COLORS[ev.category]?.badge}`}>
                            {ev.category}
                          </span>
                          <h3 className="text-sm font-bold text-white">{ev.title}</h3>
                          {ev.completed && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Completed</span>
                          )}
                        </div>
                        {ev.description && <p className="text-xs text-slate-300">{ev.description}</p>}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>{ev.startTime} - {ev.endTime}</span>
                          </div>
                          {ev.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-400" />
                              <span>{ev.location}</span>
                            </div>
                          )}
                          {ev.recurrence !== 'none' && (
                            <div className="flex items-center space-x-1 text-purple-400">
                              <Repeat className="w-3.5 h-3.5" />
                              <span className="capitalize">{ev.recurrence}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleToggleComplete(ev.id)}
                          className={`p-2 rounded-xl border transition-all ${
                            ev.completed ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                          }`}
                          title="Mark Complete"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-xl border border-rose-800/50"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeView === 'upcoming' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex-1 flex flex-col">
              <h2 className="text-sm font-bold text-white mb-2">Upcoming Events</h2>
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">No upcoming events found.</div>
                ) : (
                  upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        CATEGORY_COLORS[ev.category]?.bg || 'bg-slate-950'
                      } ${CATEGORY_COLORS[ev.category]?.border || 'border-slate-800'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-800 text-blue-400 border border-slate-700">
                            {ev.date}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${CATEGORY_COLORS[ev.category]?.badge}`}>
                            {ev.category}
                          </span>
                          <h3 className="text-sm font-bold text-white">{ev.title}</h3>
                        </div>
                        {ev.description && <p className="text-xs text-slate-300">{ev.description}</p>}
                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>{ev.startTime} - {ev.endTime}</span>
                          </span>
                          {ev.location && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-400" />
                              <span>{ev.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-xl border border-rose-800/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Selected Date Details & Quick Overview */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white">Events on {selectedDateStr}</h2>
                <p className="text-[10px] text-slate-400">{selectedDateEvents.length} scheduled</p>
              </div>
              <button
                onClick={() => handleOpenAddModal(selectedDateStr)}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all"
                title="Add event on this date"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No events for this date.
                </div>
              ) : (
                selectedDateEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border space-y-2 ${
                      CATEGORY_COLORS[ev.category]?.bg || 'bg-slate-950'
                    } ${CATEGORY_COLORS[ev.category]?.border || 'border-slate-800'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${CATEGORY_COLORS[ev.category]?.badge}`}>
                        {ev.category}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white">{ev.title}</h4>
                    {ev.description && <p className="text-[11px] text-slate-300">{ev.description}</p>}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>{ev.startTime} - {ev.endTime}</span>
                      </span>
                      {ev.location && (
                        <span className="flex items-center space-x-1 truncate max-w-[120px]">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{ev.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">
                {editingEventId ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Sprint Planning"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as EventCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 capitalize"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="study">Study</option>
                    <option value="urgent">Urgent</option>
                    <option value="health">Health</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recurrence</label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value as RecurrenceType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 capitalize"
                  >
                    <option value="none">None (One-time)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reminder</label>
                  <select
                    value={formReminder}
                    onChange={(e) => setFormReminder(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="0">At time of event</option>
                    <option value="10">10 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room B or Zoom link"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add notes, agenda, links..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
                >
                  {editingEventId ? 'Update Event' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
