import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  AlarmClock,
  Timer as TimerIcon,
  Watch as StopwatchIcon,
  Bell,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  Flag,
  CheckCircle2,
  Calendar,
  Volume2,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { Alarm, Reminder, LapTime, UserProfile, TimetableEntry } from '../types';
import { audioAlert } from '../services/audioAlert';
import { userDataService } from '../services/userDataService';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  while (date.getMonth() === month) {
    const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    days.push({
      dateStr: dStr,
      dayNum: date.getDate(),
      dayName: dayNames[date.getDay()],
      monthName: monthNames[month],
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
};

interface TimeManagementViewProps {
  currentUser?: UserProfile | null;
  onExit?: () => void;
  initialTab?: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable';
}

export const TimeManagementView: React.FC<TimeManagementViewProps> = ({ currentUser, onExit, initialTab = 'clock' }) => {
  // Active Tab within Time Management: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable'
  const [activeTab, setActiveTab] = useState<'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // --- 1. DIGITAL CLOCK STATE ---
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [is24HourFormat, setIs24HourFormat] = useState<boolean>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getClockPreference(userId);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    const is24 = userDataService.getClockPreference(userId);
    setIs24HourFormat(is24);
  }, [currentUser?.id]);

  const toggle24HourFormat = () => {
    const nextVal = !is24HourFormat;
    setIs24HourFormat(nextVal);
    const userId = currentUser?.id || 'guest';
    userDataService.saveClockPreference(userId, nextVal);
  };

  // --- 2. ALARM STATE & PERSISTENCE ---
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getAlarms(userId);
  });

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    setAlarms(userDataService.getAlarms(userId));
  }, [currentUser?.id]);

  const [newAlarmTime, setNewAlarmTime] = useState<string>('08:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState<string>('New Alarm');
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [editAlarmTime, setEditAlarmTime] = useState<string>('');
  const [editAlarmLabel, setEditAlarmLabel] = useState<string>('');

  // Currently ringing alarm alert state
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    userDataService.saveAlarms(userId, alarms);
  }, [alarms, currentUser?.id]);

  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmTime) return;
    const userId = currentUser?.id || 'guest';
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      userId: userId,
      time: newAlarmTime,
      label: newAlarmLabel.trim() || 'Alarm',
      enabled: true,
    };
    const updated = [...alarms, newAlarm];
    setAlarms(updated);
    userDataService.saveAlarms(userId, updated);
    setNewAlarmLabel('New Alarm');
  };

  const handleToggleAlarm = (id: string) => {
    const userId = currentUser?.id || 'guest';
    const updated = alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
    setAlarms(updated);
    userDataService.saveAlarms(userId, updated);
  };

  const handleDeleteAlarm = (id: string) => {
    const userId = currentUser?.id || 'guest';
    const updated = alarms.filter((a) => a.id !== id);
    setAlarms(updated);
    userDataService.saveAlarms(userId, updated);
  };

  const handleStartEditAlarm = (alarm: Alarm) => {
    setEditingAlarmId(alarm.id);
    setEditAlarmTime(alarm.time);
    setEditAlarmLabel(alarm.label);
  };

  const handleSaveEditAlarm = (id: string) => {
    const userId = currentUser?.id || 'guest';
    const updated = alarms.map((a) =>
      a.id === id ? { ...a, time: editAlarmTime, label: editAlarmLabel } : a
    );
    setAlarms(updated);
    userDataService.saveAlarms(userId, updated);
    setEditingAlarmId(null);
  };

  // --- 3. TIMER STATE ---
  const [timerHours, setTimerHours] = useState<number>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getTimerSettings(userId).hours;
  });
  const [timerMinutes, setTimerMinutes] = useState<number>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getTimerSettings(userId).minutes;
  });
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getTimerSettings(userId).seconds;
  });
  const [timerTotalSecondsLeft, setTimerTotalSecondsLeft] = useState<number>(() => {
    const userId = currentUser?.id || 'guest';
    const saved = userDataService.getTimerSettings(userId);
    return saved.hours * 3600 + saved.minutes * 60 + saved.seconds;
  });
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused' | 'ended'>('idle');
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    const savedTimer = userDataService.getTimerSettings(userId);
    setTimerHours(savedTimer.hours);
    setTimerMinutes(savedTimer.minutes);
    setTimerSeconds(savedTimer.seconds);
    setTimerTotalSecondsLeft(savedTimer.hours * 3600 + savedTimer.minutes * 60 + savedTimer.seconds);
  }, [currentUser?.id]);

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    userDataService.saveTimerSettings(userId, { hours: timerHours, minutes: timerMinutes, seconds: timerSeconds });
  }, [timerHours, timerMinutes, timerSeconds, currentUser?.id]);

  const startTimer = () => {
    const total = timerHours * 3600 + timerMinutes * 60 + timerSeconds;
    if (total <= 0) return;
    setTimerTotalSecondsLeft(total);
    setTimerStatus('running');
  };

  const pauseTimer = () => {
    setTimerStatus('paused');
  };

  const resumeTimer = () => {
    setTimerStatus('running');
  };

  const resetTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerStatus('idle');
    setTimerTotalSecondsLeft(timerHours * 3600 + timerMinutes * 60 + timerSeconds);
  };

  useEffect(() => {
    if (timerStatus === 'running') {
      timerIntervalRef.current = window.setInterval(() => {
        setTimerTotalSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current as number);
            setTimerStatus('ended');
            audioAlert.playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerStatus]);

  // --- 4. STOPWATCH STATE ---
  const [stopwatchTimeMs, setStopwatchTimeMs] = useState<number>(0);
  const [stopwatchStatus, setStopwatchStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [laps, setLaps] = useState<LapTime[]>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getStopwatchLaps(userId);
  });
  const stopwatchRef = useRef<number | null>(null);
  const stopwatchStartTimeRef = useRef<number>(0);
  const stopwatchElapsedBeforePauseRef = useRef<number>(0);

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    setLaps(userDataService.getStopwatchLaps(userId));
  }, [currentUser?.id]);

  // Handle incoming voice assistant or chatbot actions for timer and stopwatch
  useEffect(() => {
    if (activeTab === 'timer') {
      const action = localStorage.getItem('friendly_bot_timer_action');
      if (action) {
        localStorage.removeItem('friendly_bot_timer_action');
        if (action === 'start') {
          const userId = currentUser?.id || 'guest';
          const saved = userDataService.getTimerSettings(userId);
          const total = saved.hours * 3600 + saved.minutes * 60 + saved.seconds;
          if (total > 0) {
            setTimerHours(saved.hours);
            setTimerMinutes(saved.minutes);
            setTimerSeconds(saved.seconds);
            setTimerTotalSecondsLeft(total);
            setTimerStatus('running');
          }
        } else if (action === 'pause') {
          setTimerStatus('paused');
        } else if (action === 'resume') {
          setTimerStatus('running');
        } else if (action === 'reset') {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setTimerStatus('idle');
          const userId = currentUser?.id || 'guest';
          const saved = userDataService.getTimerSettings(userId);
          setTimerTotalSecondsLeft(saved.hours * 3600 + saved.minutes * 60 + saved.seconds);
        }
      }
    } else if (activeTab === 'stopwatch') {
      const action = localStorage.getItem('friendly_bot_stopwatch_action');
      if (action) {
        localStorage.removeItem('friendly_bot_stopwatch_action');
        if (action === 'start') {
          setStopwatchStatus('running');
        } else if (action === 'pause') {
          stopwatchElapsedBeforePauseRef.current = stopwatchTimeMs;
          setStopwatchStatus('paused');
        } else if (action === 'resume') {
          setStopwatchStatus('running');
        } else if (action === 'reset') {
          setStopwatchStatus('idle');
          setStopwatchTimeMs(0);
          stopwatchElapsedBeforePauseRef.current = 0;
          setLaps([]);
          const userId = currentUser?.id || 'guest';
          userDataService.saveStopwatchLaps(userId, []);
        }
      }
    }
  }, [activeTab, currentUser?.id]);

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    userDataService.saveStopwatchLaps(userId, laps);
  }, [laps, currentUser?.id]);

  useEffect(() => {
    if (stopwatchStatus === 'running') {
      stopwatchStartTimeRef.current = Date.now() - stopwatchElapsedBeforePauseRef.current;
      stopwatchRef.current = window.setInterval(() => {
        setStopwatchTimeMs(Date.now() - stopwatchStartTimeRef.current);
      }, 10);
    } else {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    }
    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [stopwatchStatus]);

  const startStopwatch = () => {
    setStopwatchStatus('running');
  };

  const pauseStopwatch = () => {
    stopwatchElapsedBeforePauseRef.current = stopwatchTimeMs;
    setStopwatchStatus('paused');
  };

  const resumeStopwatch = () => {
    setStopwatchStatus('running');
  };

  const resetStopwatch = () => {
    setStopwatchStatus('idle');
    setStopwatchTimeMs(0);
    stopwatchElapsedBeforePauseRef.current = 0;
    setLaps([]);
    const userId = currentUser?.id || 'guest';
    userDataService.saveStopwatchLaps(userId, []);
  };

  const recordLap = () => {
    if (stopwatchStatus !== 'running') return;
    const lastTotal = laps.length > 0 ? laps[0].totalTime : 0;
    const splitTime = stopwatchTimeMs - lastTotal;
    const newLap: LapTime = {
      id: Date.now().toString(),
      lapNumber: laps.length + 1,
      splitTime,
      totalTime: stopwatchTimeMs,
    };
    const updated = [newLap, ...laps];
    setLaps(updated);
    const userId = currentUser?.id || 'guest';
    userDataService.saveStopwatchLaps(userId, updated);
  };

  const formatStopwatchTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  // --- 5. REMINDER STATE & PERSISTENCE ---
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getReminders(userId);
  });

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    setReminders(userDataService.getReminders(userId));
  }, [currentUser?.id]);

  const [newReminderTitle, setNewReminderTitle] = useState<string>('');
  const [newReminderDatetime, setNewReminderDatetime] = useState<string>(
    new Date(Date.now() + 1800000).toISOString().slice(0, 16)
  );

  // Currently triggered reminder alert state
  const [triggeredReminder, setTriggeredReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    userDataService.saveReminders(userId, reminders);
  }, [reminders, currentUser?.id]);

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim() || !newReminderDatetime) return;
    const userId = currentUser?.id || 'guest';
    const newRem: Reminder = {
      id: Date.now().toString(),
      userId: userId,
      title: newReminderTitle.trim(),
      datetime: newReminderDatetime,
      completed: false,
      notified: false,
    };
    const updated = [newRem, ...reminders];
    setReminders(updated);
    userDataService.saveReminders(userId, updated);
    setNewReminderTitle('');
  };

  const handleToggleReminderCompleted = (id: string) => {
    const userId = currentUser?.id || 'guest';
    const updated = reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
    setReminders(updated);
    userDataService.saveReminders(userId, updated);
  };

  const handleDeleteReminder = (id: string) => {
    const userId = currentUser?.id || 'guest';
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    userDataService.saveReminders(userId, updated);
  };

  // --- 6. TIMETABLE STATE & PERSISTENCE ---
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getTimetable(userId);
  });

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    setTimetable(userDataService.getTimetable(userId));
  }, [currentUser?.id]);

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const saveAndSetTimetable = (newTimetable: TimetableEntry[]) => {
    const userId = currentUser?.id || 'guest';
    setTimetable(newTimetable);
    userDataService.saveTimetable(userId, newTimetable);
  };

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => {
      if (prev === 0) {
        setSelectedYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => {
      if (prev === 11) {
        setSelectedYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    setSelectedDateStr(`${year}-${month}-${day}`);
  };

  const isToday = (dateStr: string) => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return dateStr === `${year}-${month}-${day}`;
  };

  const handleAddPeriod = () => {
    const dateObj = new Date(selectedDateStr + 'T00:00:00');
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[dateObj.getDay()];
    
    const existing = timetable.filter(t => t.date === selectedDateStr);
    const nextNum = existing.length > 0 ? Math.max(...existing.map(e => e.periodNumber)) + 1 : 1;
    
    let defStart = "09:00";
    let defEnd = "09:50";
    
    if (existing.length > 0) {
      const lastP = existing.reduce((prev, current) => (prev.periodNumber > current.periodNumber) ? prev : current);
      if (lastP.endTime) {
        const [h, m] = lastP.endTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          let startMin = m + 10;
          let startHr = h + Math.floor(startMin / 60);
          startMin = startMin % 60;
          startHr = startHr % 24;
          
          let endMin = startMin + 50;
          let endHr = startHr + Math.floor(endMin / 60);
          endMin = endMin % 60;
          endHr = endHr % 24;
          
          defStart = `${startHr.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
          defEnd = `${endHr.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        }
      }
    }

    const newEntry: TimetableEntry = {
      id: `period_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser?.id || 'guest',
      date: selectedDateStr,
      day: dayName,
      periodNumber: nextNum,
      startTime: defStart,
      endTime: defEnd,
      subject: '',
      venue: '',
    };

    saveAndSetTimetable([...timetable, newEntry]);
  };

  const handleUpdatePeriod = (id: string, updates: Partial<TimetableEntry>) => {
    const updated = timetable.map(t => {
      if (t.id === id) {
        return { ...t, ...updates };
      }
      return t;
    });
    saveAndSetTimetable(updated);
  };

  const handleDeletePeriod = (id: string) => {
    const updated = timetable.filter(t => t.id !== id);
    saveAndSetTimetable(updated);
  };

  const handleSetPeriodCount = (count: number) => {
    const dateObj = new Date(selectedDateStr + 'T00:00:00');
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[dateObj.getDay()];

    const existing = timetable.filter(t => t.date === selectedDateStr).sort((a, b) => a.periodNumber - b.periodNumber);
    
    if (existing.length === count) return;
    
    if (existing.length < count) {
      let updated = [...timetable];
      let currentLength = existing.length;
      while (currentLength < count) {
        const nextNum = currentLength + 1;
        let defStart = "09:00";
        let defEnd = "09:50";
        
        const currentExistingOnDate = updated.filter(t => t.date === selectedDateStr);
        if (currentExistingOnDate.length > 0) {
          const lastP = currentExistingOnDate.reduce((prev, current) => (prev.periodNumber > current.periodNumber) ? prev : current);
          if (lastP.endTime) {
            const [h, m] = lastP.endTime.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              let startMin = m + 10;
              let startHr = h + Math.floor(startMin / 60);
              startMin = startMin % 60;
              startHr = startHr % 24;
              
              let endMin = startMin + 50;
              let endHr = startHr + Math.floor(endMin / 60);
              endMin = endMin % 60;
              endHr = endHr % 24;
              
              defStart = `${startHr.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
              defEnd = `${endHr.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
            }
          }
        }
        
        const newEntry: TimetableEntry = {
          id: `period_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${currentLength}`,
          userId: currentUser?.id || 'guest',
          date: selectedDateStr,
          day: dayName,
          periodNumber: nextNum,
          startTime: defStart,
          endTime: defEnd,
          subject: '',
          venue: '',
        };
        updated.push(newEntry);
        currentLength++;
      }
      saveAndSetTimetable(updated);
    } else {
      const toKeepIds = existing.slice(0, count).map(e => e.id);
      const existingIds = existing.map(e => e.id);
      const toRemoveIds = existingIds.filter(id => !toKeepIds.includes(id));
      const updated = timetable.filter(t => !toRemoveIds.includes(t.id));
      saveAndSetTimetable(updated);
    }
  };

  const alarmsRef = useRef(alarms);
  alarmsRef.current = alarms;

  const remindersRef = useRef(reminders);
  remindersRef.current = reminders;

  const ringingAlarmRef = useRef(ringingAlarm);
  ringingAlarmRef.current = ringingAlarm;

  // --- GLOBAL TICKER CHECK FOR ALARMS AND REMINDERS ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${currentHours}:${currentMinutes}`;
      const nowMs = now.getTime();

      // Check Alarms
      alarmsRef.current.forEach((alarm) => {
        if (alarm.enabled && alarm.time === timeStr && !ringingAlarmRef.current) {
          setRingingAlarm(alarm);
          audioAlert.startAlarmRing();
        }
      });

      // Check Reminders based on local timestamps
      remindersRef.current.forEach((rem) => {
        if (!rem.completed && !rem.notified) {
          const remMs = new Date(rem.datetime).getTime();
          if (!isNaN(remMs) && nowMs >= remMs) {
            setTriggeredReminder(rem);
            audioAlert.playChime();
            setReminders((prev) =>
              prev.map((r) => (r.id === rem.id ? { ...r, notified: true } : r))
            );
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2">
      {/* Top Header Title & Tab Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Time Management Center</h1>
            <p className="text-xs text-slate-400">Manage digital clock, alarms, countdown timers, stopwatches, and reminders</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('clock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'clock'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Clock</span>
          </button>

          <button
            onClick={() => setActiveTab('alarm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'alarm'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlarmClock className="w-3.5 h-3.5 shrink-0" />
            <span>Alarm</span>
            {alarms.filter((a) => a.enabled).length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'timer'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TimerIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Timer</span>
          </button>

          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'stopwatch'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <StopwatchIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Stopwatch</span>
          </button>

          <button
            onClick={() => setActiveTab('reminder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'reminder'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span>Reminder</span>
            {reminders.filter((r) => !r.completed).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500 text-white font-bold shrink-0">
                {reminders.filter((r) => !r.completed).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'timetable'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Timetable</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: DIGITAL CLOCK --- */}
      {activeTab === 'clock' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex justify-between items-center max-w-lg mx-auto">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Live Digital Clock</span>
            <button
              onClick={toggle24HourFormat}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
            >
              Format: {is24HourFormat ? '24-Hour' : '12-Hour'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 tracking-wider font-mono drop-shadow-lg">
              {currentTime.toLocaleTimeString('en-US', { hour12: !is24HourFormat })}
            </div>
            <div className="text-lg sm:text-xl font-medium text-slate-300">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block mb-1">Timezone</span>
              <span className="text-sm font-bold text-slate-200">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block mb-1">Active Alarms</span>
              <span className="text-sm font-bold text-emerald-400">{alarms.filter((a) => a.enabled).length} Enabled</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block mb-1">Pending Reminders</span>
              <span className="text-sm font-bold text-blue-400">{reminders.filter((r) => !r.completed).length} Reminders</span>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: ALARM --- */}
      {activeTab === 'alarm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Alarm Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlarmClock className="w-5 h-5 text-blue-400" />
              <span>Set New Alarm</span>
            </h3>

            <form onSubmit={handleAddAlarm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Alarm Time</label>
                <input
                  type="time"
                  value={newAlarmTime}
                  onChange={(e) => setNewAlarmTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Alarm Label</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Workout, Meeting"
                  value={newAlarmLabel}
                  onChange={(e) => setNewAlarmLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Alarm</span>
              </button>
            </form>
          </div>

          {/* Alarm List */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Your Alarms</span>
              <span className="text-xs bg-slate-800 px-3 py-1 rounded-xl text-slate-300 font-normal">
                {alarms.length} Alarms
              </span>
            </h3>

            {alarms.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <AlarmClock className="w-10 h-10 mx-auto opacity-40" />
                <p>No alarms configured yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      alarm.enabled
                        ? 'bg-slate-950/80 border-blue-500/30 shadow-md shadow-blue-500/5'
                        : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                    }`}
                  >
                    {editingAlarmId === alarm.id ? (
                      <div className="flex-1 flex items-center gap-3 pr-4">
                        <input
                          type="time"
                          value={editAlarmTime}
                          onChange={(e) => setEditAlarmTime(e.target.value)}
                          className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white text-sm font-mono"
                        />
                        <input
                          type="text"
                          value={editAlarmLabel}
                          onChange={(e) => setEditAlarmLabel(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white text-sm"
                        />
                        <button
                          onClick={() => handleSaveEditAlarm(alarm.id)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wider">
                            {alarm.time}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-200">{alarm.label}</div>
                            <div className="text-[11px] text-slate-400">
                              {alarm.enabled ? 'Active' : 'Disabled'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Enable/Disable Switch */}
                          <button
                            onClick={() => handleToggleAlarm(alarm.id)}
                            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                              alarm.enabled ? 'bg-blue-600' : 'bg-slate-800'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                alarm.enabled ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            ></div>
                          </button>

                          <button
                            onClick={() => handleStartEditAlarm(alarm)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                            title="Edit alarm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteAlarm(alarm.id)}
                            className="p-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded-xl transition-colors"
                            title="Delete alarm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: TIMER --- */}
      {activeTab === 'timer' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-2xl space-y-8">
          <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <TimerIcon className="w-6 h-6 text-blue-400" />
            <span>Countdown Timer</span>
          </h3>

          {timerStatus === 'idle' ? (
            <div className="space-y-6">
              <div className="flex justify-center items-center gap-4">
                <div className="text-center">
                  <label className="block text-xs text-slate-400 mb-2 font-semibold">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={timerHours}
                    onChange={(e) => setTimerHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 h-14 bg-slate-950 border border-slate-800 rounded-2xl text-center text-2xl font-mono text-white focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex items-center justify-center"
                  />
                </div>
                <span className="text-2xl font-bold text-slate-600 mt-6">:</span>
                <div className="text-center">
                  <label className="block text-xs text-slate-400 mb-2 font-semibold">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 h-14 bg-slate-950 border border-slate-800 rounded-2xl text-center text-2xl font-mono text-white focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex items-center justify-center"
                  />
                </div>
                <span className="text-2xl font-bold text-slate-600 mt-6">:</span>
                <div className="text-center">
                  <label className="block text-xs text-slate-400 mb-2 font-semibold">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 h-14 bg-slate-950 border border-slate-800 rounded-2xl text-center text-2xl font-mono text-white focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex items-center justify-center"
                  />
                </div>
              </div>

              <button
                onClick={startTimer}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start Timer</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-6xl sm:text-8xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-wider">
                {String(Math.floor(timerTotalSecondsLeft / 3600)).padStart(2, '0')}:
                {String(Math.floor((timerTotalSecondsLeft % 3600) / 60)).padStart(2, '0')}:
                {String(timerTotalSecondsLeft % 60).padStart(2, '0')}
              </div>

              {timerStatus === 'ended' && (
                <div className="p-4 bg-emerald-950/60 border border-emerald-600 rounded-2xl text-emerald-300 font-bold animate-bounce flex items-center justify-center gap-2">
                  <Bell className="w-5 h-5 animate-spin" />
                  <span>Timer Completed! Sound playing...</span>
                </div>
              )}

              <div className="flex justify-center items-center gap-4">
                {timerStatus === 'running' && (
                  <button
                    onClick={pauseTimer}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </button>
                )}
                {timerStatus === 'paused' && (
                  <button
                    onClick={resumeTimer}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>Resume</span>
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all flex items-center gap-2 border border-slate-700 shadow-lg"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: STOPWATCH --- */}
      {activeTab === 'stopwatch' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-2xl space-y-8">
          <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <StopwatchIcon className="w-6 h-6 text-blue-400" />
            <span>Stopwatch & Laps</span>
          </h3>

          <div className="text-6xl sm:text-8xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wider">
            {formatStopwatchTime(stopwatchTimeMs)}
          </div>

          <div className="flex justify-center items-center gap-4 flex-wrap">
            {stopwatchStatus === 'idle' && (
              <button
                onClick={startStopwatch}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start</span>
              </button>
            )}

            {stopwatchStatus === 'running' && (
              <>
                <button
                  onClick={pauseStopwatch}
                  className="px-6 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={recordLap}
                  className="px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center gap-2"
                >
                  <Flag className="w-5 h-5" />
                  <span>Lap</span>
                </button>
              </>
            )}

            {stopwatchStatus === 'paused' && (
              <>
                <button
                  onClick={resumeStopwatch}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center gap-2"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Resume</span>
                </button>
                <button
                  onClick={resetStopwatch}
                  className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all shadow-lg border border-slate-700 flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>

          {/* Laps Table */}
          {laps.length > 0 && (
            <div className="mt-8 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-bold">Lap</th>
                    <th className="pb-2 font-bold">Split Time</th>
                    <th className="pb-2 font-bold">Total Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {laps.map((lap) => (
                    <tr key={lap.id} className="text-slate-300 font-mono">
                      <td className="py-2 font-bold text-blue-400">Lap {lap.lapNumber}</td>
                      <td className="py-2">+{formatStopwatchTime(lap.splitTime)}</td>
                      <td className="py-2">{formatStopwatchTime(lap.totalTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 5: REMINDER --- */}
      {activeTab === 'reminder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Reminder Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span>Create Reminder</span>
            </h3>

            <form onSubmit={handleAddReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Reminder Title</label>
                <input
                  type="text"
                  placeholder="e.g. Doctor appointment, Submit report"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Date & Time</label>
                <input
                  type="datetime-local"
                  value={newReminderDatetime}
                  onChange={(e) => setNewReminderDatetime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Reminder</span>
              </button>
            </form>
          </div>

          {/* Reminder List */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Your Reminders</span>
              <span className="text-xs bg-slate-800 px-3 py-1 rounded-xl text-slate-300 font-normal">
                {reminders.length} Total
              </span>
            </h3>

            {reminders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <Bell className="w-10 h-10 mx-auto opacity-40" />
                <p>No reminders scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((rem) => {
                  const isPast = new Date(rem.datetime) < new Date() && !rem.completed;
                  return (
                    <div
                      key={rem.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        rem.completed
                          ? 'bg-slate-950/40 border-slate-800/80 opacity-50 line-through'
                          : isPast
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleToggleReminderCompleted(rem.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                            rem.completed
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-700 bg-slate-900 hover:border-blue-500'
                          }`}
                        >
                          {rem.completed && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div>
                          <div className="text-sm font-bold text-white">{rem.title}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span>{new Date(rem.datetime).toLocaleString()}</span>
                            {isPast && <span className="text-amber-400 text-[10px] font-bold">Due</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setTriggeredReminder(rem);
                            audioAlert.playChime();
                          }}
                          className="px-2.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800 text-blue-300 text-xs rounded-xl transition-colors flex items-center gap-1"
                          title="Test reminder popup alert"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Test</span>
                        </button>
                        <button
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="p-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded-xl transition-colors"
                          title="Delete reminder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 6: TIMETABLE --- */}
      {activeTab === 'timetable' && (() => {
        const monthDays = getDaysInMonth(selectedYear, selectedMonth);
        const selectedDatePeriods = timetable
          .filter((t) => t.date === selectedDateStr)
          .sort((a, b) => a.periodNumber - b.periodNumber);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            
            {/* Left Column: Month Selector & Date grid */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                
                {/* Month Navigation */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl transition-all border border-slate-800 text-xs font-semibold"
                  >
                    &larr; Prev
                  </button>
                  <div className="text-center">
                    <h2 className="text-base font-bold text-white">
                      {monthNames[selectedMonth]} {selectedYear}
                    </h2>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl transition-all border border-slate-800 text-xs font-semibold"
                  >
                    Next &rarr;
                  </button>
                </div>

                {/* Reset to Current Month */}
                <div className="flex justify-center">
                  <button
                    onClick={handleCurrentMonth}
                    className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Jump to Current Month
                  </button>
                </div>

                {/* Scrollable Month Calendar List */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
                  {monthDays.map((day) => {
                    const isDaySelected = day.dateStr === selectedDateStr;
                    const isDayToday = isToday(day.dateStr);
                    const periodsCount = timetable.filter((t) => t.date === day.dateStr).length;

                    return (
                      <button
                        key={day.dateStr}
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isDaySelected
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/15'
                            : isDayToday
                            ? 'bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-950/60 text-slate-200'
                            : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold font-mono text-sm shrink-0 ${
                              isDaySelected
                                ? 'bg-white text-blue-600'
                                : isDayToday
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'bg-slate-900 text-slate-200'
                            }`}
                          >
                            <span>{day.dayNum}</span>
                          </div>
                          <div>
                            <div className="font-bold text-xs">
                              {day.dayName}
                              {isDayToday && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-emerald-500 text-white font-black rounded uppercase tracking-wider">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] ${isDaySelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              {day.monthName} {day.dayNum}, {selectedYear}
                            </div>
                          </div>
                        </div>

                        {/* Period Count Badge */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {periodsCount > 0 ? (
                            <span
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                isDaySelected
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300'
                              }`}
                            >
                              {periodsCount} {periodsCount === 1 ? 'Period' : 'Periods'}
                            </span>
                          ) : (
                            <span className={`text-[10px] ${isDaySelected ? 'text-blue-200' : 'text-slate-600'}`}>
                              No schedule
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Day Timetable Configuration & Details */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Selected Schedule</span>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      {(() => {
                        const d = new Date(selectedDateStr + 'T00:00:00');
                        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                        const weekday = dayNames[d.getDay()];
                        const monthNamesList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        const mName = monthNamesList[d.getMonth()];
                        return `${weekday}, ${mName} ${d.getDate()}`;
                      })()}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">{selectedDateStr}</p>
                  </div>

                  {/* Period Count Direct Selector */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <label className="text-xs text-slate-400 font-semibold">Periods:</label>
                    <select
                      value={selectedDatePeriods.length}
                      onChange={(e) => handleSetPeriodCount(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          {num === 0 ? 'None (0)' : `${num} Periods`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Periods List */}
                {selectedDatePeriods.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-full text-slate-500">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">No Timetable Scheduled</h3>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        No periods are scheduled for this date. Change the period dropdown above or click below to build a timetable.
                      </p>
                    </div>
                    <button
                      onClick={handleAddPeriod}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Period 1</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Table Header for larger screens */}
                    <div className="hidden md:grid grid-cols-12 gap-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-1">Period</div>
                      <div className="col-span-2">Start Time</div>
                      <div className="col-span-2">End Time</div>
                      <div className="col-span-3">Subject Name</div>
                      <div className="col-span-3">Venue (Optional)</div>
                      <div className="col-span-1 text-right">Delete</div>
                    </div>

                    {/* Period Rows */}
                    <div className="space-y-3">
                      {selectedDatePeriods.map((period) => (
                        <div
                          key={period.id}
                          className="bg-slate-950 border border-slate-800/60 p-3 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                        >
                          {/* Period Number */}
                          <div className="col-span-1 md:col-span-1 flex items-center md:space-x-0 space-x-2">
                            <span className="text-[10px] md:hidden font-bold text-slate-500 uppercase">Period:</span>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={period.periodNumber}
                              onChange={(e) => handleUpdatePeriod(period.id, { periodNumber: Number(e.target.value) })}
                              className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 w-14 text-center font-bold text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>

                          {/* Start Time */}
                          <div className="col-span-1 md:col-span-2 flex items-center md:space-x-0 space-x-2">
                            <span className="text-[10px] md:hidden font-bold text-slate-500 uppercase w-16">Start:</span>
                            <input
                              type="time"
                              value={period.startTime}
                              onChange={(e) => handleUpdatePeriod(period.id, { startTime: e.target.value })}
                              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono flex-1 md:w-full"
                            />
                          </div>

                          {/* End Time */}
                          <div className="col-span-1 md:col-span-2 flex items-center md:space-x-0 space-x-2">
                            <span className="text-[10px] md:hidden font-bold text-slate-500 uppercase w-16">End:</span>
                            <input
                              type="time"
                              value={period.endTime}
                              onChange={(e) => handleUpdatePeriod(period.id, { endTime: e.target.value })}
                              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono flex-1 md:w-full"
                            />
                          </div>

                          {/* Subject */}
                          <div className="col-span-1 md:col-span-3 flex items-center md:space-x-0 space-x-2">
                            <span className="text-[10px] md:hidden font-bold text-slate-500 uppercase w-16">Subject:</span>
                            <input
                              type="text"
                              placeholder="e.g. Mathematics"
                              value={period.subject}
                              onChange={(e) => handleUpdatePeriod(period.id, { subject: e.target.value })}
                              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 flex-1 md:w-full"
                            />
                          </div>

                          {/* Venue */}
                          <div className="col-span-1 md:col-span-3 flex items-center md:space-x-0 space-x-2">
                            <span className="text-[10px] md:hidden font-bold text-slate-500 uppercase w-16 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400" /> Venue:
                            </span>
                            <div className="relative flex-1 md:w-full">
                              <span className="hidden md:inline-block absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. Room 204, Lab 2"
                                value={period.venue || ''}
                                onChange={(e) => handleUpdatePeriod(period.id, { venue: e.target.value })}
                                className="bg-slate-900 border border-slate-800 rounded-xl md:pl-8 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 flex-1 md:w-full"
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 md:col-span-1 flex items-center justify-end">
                            <button
                              onClick={() => handleDeletePeriod(period.id)}
                              className="p-1.5 text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-xl border border-rose-500/20 transition-all text-xs"
                              title="Delete Period"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Period Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleAddPeriod}
                        className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Period {selectedDatePeriods.length + 1}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        );
      })()}

      {/* --- ALARM RINGING MODAL POPUP --- */}
      {ringingAlarm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-blue-500/20">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full border border-blue-500/40 flex items-center justify-center mx-auto text-blue-400 animate-pulse">
              <AlarmClock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">Alarm Ringing</span>
              <h3 className="text-4xl font-black font-mono text-white">{ringingAlarm.time}</h3>
              <p className="text-lg font-bold text-slate-200">{ringingAlarm.label}</p>
            </div>

            <button
              onClick={() => {
                audioAlert.stopAlarmRing();
                if (ringingAlarm) {
                  setAlarms(
                    alarms.map((a) =>
                      a.id === ringingAlarm.id ? { ...a, enabled: false } : a
                    )
                  );
                }
                setRingingAlarm(null);
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 text-base"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Dismiss Alarm</span>
            </button>
          </div>
        </div>
      )}

      {/* --- TRIGGERED REMINDER MODAL POPUP --- */}
      {triggeredReminder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-emerald-500/20">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <Bell className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Reminder Alert</span>
              <h3 className="text-2xl font-bold text-white">{triggeredReminder.title}</h3>
              <p className="text-xs text-slate-400">{new Date(triggeredReminder.datetime).toLocaleString()}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleToggleReminderCompleted(triggeredReminder.id);
                  setTriggeredReminder(null);
                }}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Check className="w-4 h-4" />
                <span>Mark Completed</span>
              </button>
              <button
                onClick={() => setTriggeredReminder(null)}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all text-sm border border-slate-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
