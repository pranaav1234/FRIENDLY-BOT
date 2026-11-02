import { userDataService } from './userDataService';
import { Alarm, Reminder, CalendarEvent } from '../types';

export interface ParsedTimeCommand {
  handled: boolean;
  type: 'alarm' | 'reminder' | 'timer' | 'stopwatch' | 'clock' | 'navigation' | 'timetable' | 'calendar' | 'app_data' | null;
  tab?: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable';
  feedbackMessage: string;
}

/**
 * Natural language spelling and speech-to-text normalizer
 */
export function normalizeSpellingAndSpeech(raw: string): string {
  if (!raw) return '';
  let text = raw.toLowerCase().trim();

  // Strip punctuation except spaces, letters, digits, and colon for time format
  text = text.replace(/[^a-z0-9\s:]/g, ' ').replace(/\s+/g, ' ').trim();

  // Common spelling and speech-to-text mistakes
  const replacements: Array<[RegExp, string]> = [
    // Calendar spelling mistakes (calender, calandar, calander, etc.)
    [/\b(calender|calandar|calander|calendr|calendeer)\b/g, 'calendar'],
    // Timer spelling mistakes (timr, timeer, etc.)
    [/\b(timr|timeer|timerr)\b/g, 'timer'],
    // Reminder spelling mistakes (remainder, reminde, remindar, remindr, etc.)
    [/\b(remainder|reminde|remindar|remindr|remenders|remainders|remiders)\b/g, 'reminder'],
    // Stopwatch / Stop clock aliases
    [/\b(stopclock|stop\s+clock|stop\s+watch|stopwach|stopwacth)\b/g, 'stopwatch'],
    // Tomorrow spelling mistakes
    [/\b(tommorrow|tommorow|tmrw|tomorow|tomorrows|tommorows)\b/g, 'tomorrow'],
    // Alarm spelling mistakes
    [/\b(alram|alaram|allarm|alrms)\b/g, 'alarm'],
    // Clock spelling mistakes
    [/\b(clok|clcok)\b/g, 'clock'],
    // Productivity spelling mistakes
    [/\b(productivty|productiviti|produtivity)\b/g, 'productivity'],
    // Chatbot aliases
    [/\b(chat\s*bot|online\s+chatbot|online\s+chat\s+bot)\b/g, 'chatbot'],
    // Timetable aliases
    [/\b(time\s+table|timetbl)\b/g, 'timetable'],
  ];

  for (const [regex, replacement] of replacements) {
    text = text.replace(regex, replacement);
  }

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Intelligent helper to extract time from natural language phrases.
 * Returns hour (0-23), minute (0-59), isPm, and 24-hr string format ("HH:MM").
 */
export function extractTimeFromString(str: string): { hour: number; minute: number; isPm: boolean; hour24Str: string } | null {
  // Regex 1: HH:MM AM/PM or HH:MM
  const timeRegex = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i;
  // Regex 2: HH AM/PM or HH PM or 7am
  const simpleHourRegex = /\b(\d{1,2})\s*(am|pm)\b/i;
  // Regex 3: numbers preceded by at/for (not followed by colon:minutes)
  const rawNumberRegex = /(?:at|for|wake me up at|reminder at|alarm at|remind me at)\s*(\d{1,2})(?!:\d{2})\b/i;

  let hour = 0;
  let minute = 0;
  let isPm = false;
  let matched = false;

  const match1 = str.match(timeRegex);
  const match2 = str.match(simpleHourRegex);
  const match3 = str.match(rawNumberRegex);

  if (match1) {
    hour = parseInt(match1[1], 10);
    minute = parseInt(match1[2], 10);
    const period = match1[3]?.toLowerCase();
    if (period) {
      isPm = period === 'pm';
    } else {
      isPm = hour < 8 && !str.includes('morning');
    }
    matched = true;
  } else if (match2) {
    hour = parseInt(match2[1], 10);
    minute = 0;
    isPm = match2[2].toLowerCase() === 'pm';
    matched = true;
  } else if (match3) {
    hour = parseInt(match3[1], 10);
    minute = 0;
    if (str.includes('wake me up') || str.includes('morning')) {
      isPm = false;
    } else {
      isPm = hour < 12 && hour >= 1 && hour <= 8;
    }
    matched = true;
  }

  if (!matched) return null;

  if (hour < 0 || hour > 23) hour = 0;
  if (minute < 0 || minute > 59) minute = 0;

  let hour24 = hour;
  if (isPm) {
    if (hour < 12) hour24 += 12;
  } else {
    if (hour === 12) hour24 = 0;
  }

  const hour24Str = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  return {
    hour: hour24,
    minute,
    isPm: hour24 >= 12,
    hour24Str,
  };
}

/**
 * Resolves a natural-language date query to a concrete Date and formatted string.
 */
export function resolveTargetDate(normalized: string): { targetDate: Date; dateStr: string; label: string } {
  const now = new Date();
  const target = new Date(now);

  const formatDStr = (d: Date) => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNamesCap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (normalized.includes('tomorrow')) {
    target.setDate(target.getDate() + 1);
    return { targetDate: target, dateStr: formatDStr(target), label: 'Tomorrow' };
  }

  if (normalized.includes('yesterday')) {
    target.setDate(target.getDate() - 1);
    return { targetDate: target, dateStr: formatDStr(target), label: 'Yesterday' };
  }

  // Check for weekday names
  for (let i = 0; i < 7; i++) {
    const dName = dayNames[i];
    if (normalized.includes(dName)) {
      const currentDay = now.getDay();
      let diff = i - currentDay;
      if (normalized.includes('next') && diff <= 0) {
        diff += 7;
      } else if (diff < 0) {
        diff += 7;
      } else if (diff === 0 && (normalized.includes('next') || normalized.includes('coming'))) {
        diff = 7;
      }
      target.setDate(target.getDate() + diff);
      return { targetDate: target, dateStr: formatDStr(target), label: dayNamesCap[i] };
    }
  }

  return { targetDate: target, dateStr: formatDStr(target), label: 'Today' };
}

/**
 * Combines Timetable, Reminders, Alarms, and Calendar events into a unified chronological schedule.
 */
export function getDailyActivitySummary(dateObj: Date, dateStr: string, label: string, userId: string): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dateObj.getDay()];

  interface ScheduleItem {
    time24: string; // HH:MM
    endTime24?: string;
    type: 'timetable' | 'reminder' | 'alarm' | 'calendar';
    title: string;
    subtitle?: string;
    venue?: string;
  }

  const items: ScheduleItem[] = [];

  // 1. Timetable
  const timetables = userDataService.getTimetable(userId);
  const matchedPeriods = timetables.filter(
    (t) => t.date === dateStr || (!t.date && t.day?.toLowerCase() === dayName.toLowerCase())
  );
  for (const p of matchedPeriods) {
    if (p.startTime) {
      items.push({
        time24: p.startTime,
        endTime24: p.endTime,
        type: 'timetable',
        title: p.subject ? `📚 ${p.subject}` : `📚 Period ${p.periodNumber}`,
        subtitle: p.subject ? `Period ${p.periodNumber}` : undefined,
        venue: p.venue?.trim() ? p.venue.trim() : undefined,
      });
    }
  }

  // 2. Reminders
  const reminders = userDataService.getReminders(userId);
  for (const r of reminders) {
    if (!r.completed && r.datetime) {
      const rDate = new Date(r.datetime);
      const rDateStr = `${rDate.getFullYear()}-${(rDate.getMonth() + 1).toString().padStart(2, '0')}-${rDate.getDate().toString().padStart(2, '0')}`;
      if (rDateStr === dateStr) {
        const time24 = `${rDate.getHours().toString().padStart(2, '0')}:${rDate.getMinutes().toString().padStart(2, '0')}`;
        items.push({
          time24,
          type: 'reminder',
          title: `🔔 Reminder: ${r.title || 'Reminder'}`,
        });
      }
    }
  }

  // 3. Calendar Events
  const calendarEvents = userDataService.getCalendarEvents(userId);
  for (const e of calendarEvents) {
    if (e.date === dateStr) {
      items.push({
        time24: e.startTime || '09:00',
        endTime24: e.endTime,
        type: 'calendar',
        title: `📅 Calendar: ${e.title}`,
        subtitle: e.description,
        venue: e.location,
      });
    }
  }

  // 4. Alarms
  const alarms = userDataService.getAlarms(userId);
  for (const a of alarms) {
    if (a.enabled !== false && a.time) {
      let applies = true;
      if (Array.isArray(a.days) && a.days.length > 0) {
        const shortDay = dayName.slice(0, 3).toLowerCase();
        applies = a.days.some((d) => d.toLowerCase().startsWith(shortDay));
      }
      if (applies) {
        items.push({
          time24: a.time,
          type: 'alarm',
          title: `⏰ Alarm${a.label ? ` "${a.label}"` : ''}`,
        });
      }
    }
  }

  if (items.length === 0) {
    return `You have no activities or periods scheduled for ${label.toLowerCase() === 'today' ? 'today' : label}.`;
  }

  // Sort chronologically by time24
  items.sort((a, b) => a.time24.localeCompare(b.time24));

  // Group by Morning (< 12:00), Afternoon (12:00 - 17:00), Evening (>= 17:00)
  const morning = items.filter((i) => parseInt(i.time24.split(':')[0], 10) < 12);
  const afternoon = items.filter((i) => {
    const h = parseInt(i.time24.split(':')[0], 10);
    return h >= 12 && h < 17;
  });
  const evening = items.filter((i) => parseInt(i.time24.split(':')[0], 10) >= 17);

  const formatSection = (secTitle: string, sectionItems: ScheduleItem[]) => {
    if (sectionItems.length === 0) return '';
    let sec = `${secTitle}\n`;
    for (const item of sectionItems) {
      const timeRange = item.endTime24 ? `${item.time24} – ${item.endTime24}` : item.time24;
      sec += `\n${timeRange}\n${item.title}`;
      if (item.subtitle) sec += `\n${item.subtitle}`;
      if (item.venue) sec += `\n📍 ${item.venue}`;
      sec += '\n';
    }
    return sec.trim() + '\n\n';
  };

  let result = `${label}'s Schedule\n\n`;
  if (morning.length > 0) result += formatSection('🌅 Morning', morning);
  if (afternoon.length > 0) result += formatSection('☀️ Afternoon', afternoon);
  if (evening.length > 0) result += formatSection('🌙 Evening', evening);

  return result.trim();
}

/**
 * Determines current and upcoming scheduled activities based on the current local time.
 */
export function getWhatShouldIDoNow(userId: string): string {
  const now = new Date();
  const formatDStr = (d: Date) => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = formatDStr(now);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  };

  const to12Hr = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  interface LiveActivity {
    startMins: number;
    endMins?: number;
    startStr: string;
    endStr?: string;
    title: string;
    venue?: string;
    type: 'period' | 'reminder' | 'calendar' | 'alarm';
  }

  const activities: LiveActivity[] = [];

  // Timetable
  const periods = userDataService.getTimetable(userId).filter(
    (t) => t.date === todayStr || (!t.date && t.day?.toLowerCase() === dayName.toLowerCase())
  );
  for (const p of periods) {
    if (p.startTime) {
      activities.push({
        startMins: toMins(p.startTime),
        endMins: p.endTime ? toMins(p.endTime) : toMins(p.startTime) + 50,
        startStr: p.startTime,
        endStr: p.endTime,
        title: p.subject ? `📚 ${p.subject} (Period ${p.periodNumber})` : `📚 Period ${p.periodNumber}`,
        venue: p.venue?.trim(),
        type: 'period',
      });
    }
  }

  // Calendar
  const events = userDataService.getCalendarEvents(userId).filter((e) => e.date === todayStr);
  for (const e of events) {
    if (e.startTime) {
      activities.push({
        startMins: toMins(e.startTime),
        endMins: e.endTime ? toMins(e.endTime) : toMins(e.startTime) + 60,
        startStr: e.startTime,
        endStr: e.endTime,
        title: `📅 ${e.title}`,
        venue: e.location?.trim(),
        type: 'calendar',
      });
    }
  }

  // Reminders
  const reminders = userDataService.getReminders(userId);
  for (const r of reminders) {
    if (!r.completed && r.datetime) {
      const rDate = new Date(r.datetime);
      const rDateStr = `${rDate.getFullYear()}-${(rDate.getMonth() + 1).toString().padStart(2, '0')}-${rDate.getDate().toString().padStart(2, '0')}`;
      if (rDateStr === todayStr) {
        const time24 = `${rDate.getHours().toString().padStart(2, '0')}:${rDate.getMinutes().toString().padStart(2, '0')}`;
        const mins = toMins(time24);
        activities.push({
          startMins: mins,
          startStr: time24,
          title: `🔔 Reminder: ${r.title}`,
          type: 'reminder',
        });
      }
    }
  }

  // Sort chronologically
  activities.sort((a, b) => a.startMins - b.startMins);

  const current = activities.find(
    (a) => a.endMins && nowMins >= a.startMins && nowMins < a.endMins
  );

  const upNext = activities.find((a) => a.startMins > nowMins);

  if (!current && !upNext) {
    return "You don't have any scheduled activities right now.";
  }

  let res = 'What You Should Do Now\n\n';
  if (current) {
    const range = current.endStr ? `${to12Hr(current.startStr)} – ${to12Hr(current.endStr)}` : to12Hr(current.startStr);
    res += `🟢 Current\n\n${range}\n${current.title}`;
    if (current.venue) res += `\n📍 ${current.venue}`;
    res += '\n\n';
  } else {
    res += "You don't have any scheduled activities right now.\n\n";
  }

  if (upNext) {
    const range = upNext.endStr ? `${to12Hr(upNext.startStr)} – ${to12Hr(upNext.endStr)}` : to12Hr(upNext.startStr);
    res += `Up Next\n\n${range}\n${upNext.title}`;
    if (upNext.venue) res += `\n📍 ${upNext.venue}`;
  }

  return res.trim();
}

/**
 * Parses and executes time management, calendar, and local data shortcuts from natural-language instructions.
 */
export function parseAndExecuteTimeCommand(rawText: string, userId: string = 'guest'): ParsedTimeCommand {
  const normalized = normalizeSpellingAndSpeech(rawText);

  // Helper matcher
  const matches = (keywords: string[]) => keywords.some((kw) => normalized.includes(kw));

  // ----------------------------------------------------
  // 1. LIVE TIME & DATE QUERIES (LOCAL DATA)
  // ----------------------------------------------------
  const isCurrentTimeQuery =
    !normalized.includes('timer') &&
    (normalized === 'what time' ||
      normalized === 'what time is it' ||
      normalized === 'what is the time' ||
      normalized === 'current time' ||
      normalized === 'tell me the time' ||
      normalized === 'check time' ||
      normalized.startsWith('what time is') ||
      normalized.startsWith('what is the time'));

  if (isCurrentTimeQuery) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      handled: true,
      type: 'clock',
      tab: 'clock',
      feedbackMessage: `The current time is ${timeStr}.`,
    };
  }

  if (matches(["what is today s date", "what is todays date", "what is the date", "today s date", "todays date", "what date is it", "current date", "what is the day"])) {
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      handled: true,
      type: 'clock',
      tab: 'clock',
      feedbackMessage: `Today's date is ${dateStr}.`,
    };
  }

  // ----------------------------------------------------
  // 2. APPLICATION DATA QUERIES (ALARMS, REMINDERS, TIMER STATUS)
  // ----------------------------------------------------
  // What alarms do I have?
  if (
    matches([
      'what alarms do i have',
      'what are my alarms',
      'what alarm do i have',
      'list alarms',
      'show my alarms',
      'show alarms',
      'my alarms',
      'do i have any alarms',
      'any alarms',
    ])
  ) {
    const alarms = userDataService.getAlarms(userId);
    if (alarms.length === 0) {
      return {
        handled: true,
        type: 'app_data',
        tab: 'alarm',
        feedbackMessage: 'You have no alarms set.',
      };
    }
    const formatted = alarms
      .map((a) => {
        const [h, m] = a.time.split(':').map(Number);
        const isPm = h >= 12;
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = m.toString().padStart(2, '0');
        const period = isPm ? 'PM' : 'AM';
        const labelPart = a.label && a.label !== 'Alarm' ? ` (${a.label})` : '';
        const statusPart = a.enabled ? '' : ' [Disabled]';
        return `${displayH}:${displayM} ${period}${labelPart}${statusPart}`;
      })
      .join(', ');
    return {
      handled: true,
      type: 'app_data',
      tab: 'alarm',
      feedbackMessage: `You have ${alarms.length} alarm${alarms.length > 1 ? 's' : ''}: ${formatted}.`,
    };
  }

  // What reminders do I have?
  if (
    matches([
      'what reminders do i have',
      'what are my reminders',
      'what reminder do i have',
      'list reminders',
      'show my reminders',
      'show reminders',
      'my reminders',
      'do i have any reminders',
      'any reminders',
    ])
  ) {
    const reminders = userDataService.getReminders(userId);
    if (reminders.length === 0) {
      return {
        handled: true,
        type: 'app_data',
        tab: 'reminder',
        feedbackMessage: 'You have no reminders set.',
      };
    }
    const formatted = reminders
      .map((r) => {
        const dateObj = new Date(r.datetime);
        const timePart = isNaN(dateObj.getTime())
          ? ''
          : ` at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return `"${r.title}"${timePart}`;
      })
      .join(', ');
    return {
      handled: true,
      type: 'app_data',
      tab: 'reminder',
      feedbackMessage: `You have ${reminders.length} reminder${reminders.length > 1 ? 's' : ''}: ${formatted}.`,
    };
  }

  // What timer is running? / What timer do I have?
  if (
    matches([
      'what timer is running',
      'what timer do i have',
      'is timer running',
      'check timer',
      'timer status',
      'my timer',
    ])
  ) {
    const timerSettings = userDataService.getTimerSettings(userId);
    const { hours, minutes, seconds } = timerSettings;
    const durationParts: string[] = [];
    if (hours > 0) durationParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) durationParts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0) durationParts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    const durationStr = durationParts.length > 0 ? durationParts.join(' ') : '0 seconds';

    return {
      handled: true,
      type: 'app_data',
      tab: 'timer',
      feedbackMessage: `Your timer is configured for ${durationStr}.`,
    };
  }

  // ----------------------------------------------------
  // 3. DAILY ACTIVITIES & SCHEDULE AGGREGATION (WHAT SHOULD I DO NOW / ACTIVITIES)
  // ----------------------------------------------------
  if (
    matches([
      'what should i do now',
      'what should i do',
      'what do i do now',
      'what am i doing now',
      'what should i be doing',
    ])
  ) {
    const message = getWhatShouldIDoNow(userId);
    return {
      handled: true,
      type: 'app_data',
      tab: 'timetable',
      feedbackMessage: message,
    };
  }

  const isDailyScheduleQuery =
    matches([
      'what are all my activities',
      'all my activities',
      'my activities today',
      'activities for today',
      'activities today',
      'what are my activities',
      'what is scheduled',
      'what do i need to do',
      'what are my tasks',
      'what do i have today',
      'what do i have tomorrow',
      'what do i have next',
      'activities tomorrow',
      'what are my activities tomorrow',
      'what is scheduled for today',
      'what is scheduled for tomorrow',
      'daily activity',
      'daily activities',
      'daily schedule',
      'my full schedule',
    ]) ||
    (normalized.startsWith('what do i have') &&
      !normalized.includes('timer') &&
      !normalized.includes('alarm') &&
      !normalized.includes('reminder') &&
      !normalized.includes('next period') &&
      !normalized.includes('next class'));

  if (isDailyScheduleQuery) {
    const { targetDate, dateStr, label } = resolveTargetDate(normalized);
    const summary = getDailyActivitySummary(targetDate, dateStr, label, userId);
    return {
      handled: true,
      type: 'app_data',
      tab: 'timetable',
      feedbackMessage: summary,
    };
  }

  // ----------------------------------------------------
  // 4. TIMETABLE DATA QUERIES (LOCAL DATA WITH VENUE)
  // ----------------------------------------------------
  const isTimetableAction =
    matches(['timetable', 'class', 'period', 'schedule', 'subject', 'first period', 'second period', 'last period']) ||
    matches(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) ||
    matches(['physics', 'mathematics', 'math', 'chemistry', 'biology', 'english', 'history', 'computer science', 'programming']);

  if (isTimetableAction) {
    const todayDate = new Date();
    const formatDStr = (d: Date) => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getMins = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
    };

    const todayStr = formatDStr(todayDate);
    const timetableEntries = userDataService.getTimetable(userId);
    const todayEntries = timetableEntries
      .filter((t) => t.date === todayStr)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    // Open Timetable Navigation
    if (matches(['open timetable', 'show timetable', 'go to timetable', 'timetable section'])) {
      return {
        handled: true,
        type: 'navigation',
        tab: 'timetable',
        feedbackMessage: 'Opening Timetable.',
      };
    }

    // Tomorrow's timetable
    if (matches(['tomorrow'])) {
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = formatDStr(tomorrowDate);
      const tomorrowEntries = timetableEntries
        .filter((t) => t.date === tomorrowStr)
        .sort((a, b) => a.periodNumber - b.periodNumber);

      if (tomorrowEntries.length === 0) {
        return {
          handled: true,
          type: 'timetable',
          tab: 'timetable',
          feedbackMessage: "You don't have any periods or classes scheduled for tomorrow.",
        };
      }

      let tomorrowText = `Tomorrow's Timetable\n\n`;
      tomorrowText += tomorrowEntries
        .map((t) => {
          let line = `Period ${t.periodNumber}\n${t.startTime || '??'} – ${t.endTime || '??'}\n${t.subject || 'Class'}`;
          if (t.venue?.trim()) {
            line += `\n📍 ${t.venue.trim()}`;
          }
          return line;
        })
        .join('\n\n');

      return {
        handled: true,
        type: 'timetable',
        tab: 'timetable',
        feedbackMessage: tomorrowText,
      };
    }

    // Next period / class query
    if (matches(['next class', 'next period', 'what is my next class', 'what is my next period', 'upcoming class', 'upcoming period'])) {
      if (todayEntries.length === 0) {
        return {
          handled: true,
          type: 'timetable',
          tab: 'timetable',
          feedbackMessage: 'You have no classes or periods scheduled for today.',
        };
      }

      const nowTotalMins = todayDate.getHours() * 60 + todayDate.getMinutes();
      const currentPeriod = todayEntries.find((t) => {
        if (!t.startTime || !t.endTime) return false;
        const start = getMins(t.startTime);
        const end = getMins(t.endTime);
        return nowTotalMins >= start && nowTotalMins < end;
      });

      const nextPeriod = todayEntries.find((t) => {
        if (!t.startTime) return false;
        const start = getMins(t.startTime);
        return start > nowTotalMins;
      });

      let res = '';
      if (currentPeriod) {
        res += `Current Period\n\nPeriod ${currentPeriod.periodNumber}\n${currentPeriod.startTime} – ${currentPeriod.endTime}\n${currentPeriod.subject || 'Class'}`;
        if (currentPeriod.venue?.trim()) res += `\n📍 ${currentPeriod.venue.trim()}`;
        res += '\n\n';
      }

      if (nextPeriod) {
        res += `Next Period\n\nPeriod ${nextPeriod.periodNumber}\n${nextPeriod.startTime} – ${nextPeriod.endTime}\n${nextPeriod.subject || 'Class'}`;
        if (nextPeriod.venue?.trim()) res += `\n📍 ${nextPeriod.venue.trim()}`;
      } else {
        res += (currentPeriod ? '' : 'Next Period\n\n') + 'There are no more periods scheduled for today.';
      }

      return {
        handled: true,
        type: 'timetable',
        tab: 'timetable',
        feedbackMessage: res.trim(),
      };
    }

    // Specific Period Sequence (first period, second period, last period)
    let targetPeriodNum: number | 'last' | null = null;
    if (normalized.includes('first period') || normalized.includes('first class') || normalized.includes('period 1')) {
      targetPeriodNum = 1;
    } else if (normalized.includes('second period') || normalized.includes('second class') || normalized.includes('period 2')) {
      targetPeriodNum = 2;
    } else if (normalized.includes('third period') || normalized.includes('period 3')) {
      targetPeriodNum = 3;
    } else if (normalized.includes('fourth period') || normalized.includes('period 4')) {
      targetPeriodNum = 4;
    } else if (normalized.includes('last period') || normalized.includes('last class')) {
      targetPeriodNum = 'last';
    }

    if (targetPeriodNum) {
      let matchedPeriod = null;
      if (targetPeriodNum === 'last' && todayEntries.length > 0) {
        matchedPeriod = todayEntries[todayEntries.length - 1];
      } else if (typeof targetPeriodNum === 'number') {
        matchedPeriod = todayEntries.find((t) => t.periodNumber === targetPeriodNum);
      }

      if (matchedPeriod) {
        let msg = `Period ${matchedPeriod.periodNumber}\n${matchedPeriod.startTime || '??'} – ${matchedPeriod.endTime || '??'}\n${matchedPeriod.subject || 'Class'}`;
        if (matchedPeriod.venue?.trim()) {
          msg += `\n📍 ${matchedPeriod.venue.trim()}`;
        }
        return {
          handled: true,
          type: 'timetable',
          tab: 'timetable',
          feedbackMessage: msg,
        };
      } else {
        return {
          handled: true,
          type: 'timetable',
          tab: 'timetable',
          feedbackMessage: `You do not have a ${targetPeriodNum === 'last' ? 'last' : `Period ${targetPeriodNum}`} class scheduled today.`,
        };
      }
    }

    // Today's timetable (e.g. "what is today's timetable?", "what is my timetable today?")
    if (matches(['today', 'schedule', 'what classes', 'my timetable', 'today s timetable', 'todays timetable', 'timetable today'])) {
      if (todayEntries.length === 0) {
        return {
          handled: true,
          type: 'timetable',
          tab: 'timetable',
          feedbackMessage: "You don't have any periods or classes scheduled for today.",
        };
      }

      let timetableText = `Today's Timetable\n\n`;
      timetableText += todayEntries
        .map((t) => {
          let line = `Period ${t.periodNumber}\n${t.startTime || '??'} – ${t.endTime || '??'}\n${t.subject || 'Class'}`;
          if (t.venue?.trim()) {
            line += `\n📍 ${t.venue.trim()}`;
          }
          return line;
        })
        .join('\n\n');

      return {
        handled: true,
        type: 'timetable',
        tab: 'timetable',
        feedbackMessage: timetableText,
      };
    }
  }

  // ----------------------------------------------------
  // 4. STOPWATCH COMMANDS (CRITICAL: STOPCLOCK = STOPWATCH, NOT CLOCK)
  // ----------------------------------------------------
  if (matches(['stopwatch'])) {
    let action: 'start' | 'pause' | 'resume' | 'reset' | null = null;
    let feedbackMessage = 'Opening Stopwatch.';

    if (matches(['start stopwatch'])) {
      action = 'start';
      feedbackMessage = 'Stopwatch started.';
    } else if (matches(['stop stopwatch', 'pause stopwatch'])) {
      action = 'pause';
      feedbackMessage = 'Stopwatch paused.';
    } else if (matches(['resume stopwatch'])) {
      action = 'resume';
      feedbackMessage = 'Stopwatch resumed.';
    } else if (matches(['reset stopwatch'])) {
      action = 'reset';
      feedbackMessage = 'Stopwatch reset.';
    }

    if (action) {
      localStorage.setItem('friendly_bot_stopwatch_action', action);
    }

    return {
      handled: true,
      type: 'stopwatch',
      tab: 'stopwatch',
      feedbackMessage,
    };
  }

  // ----------------------------------------------------
  // 5. CLOCK COMMANDS
  // ----------------------------------------------------
  if (
    matches([
      'open clock',
      'show clock',
      'go to clock',
      'open the clock in time management',
      'clock section',
    ]) ||
    normalized === 'clock'
  ) {
    return {
      handled: true,
      type: 'clock',
      tab: 'clock',
      feedbackMessage: 'Opening Clock.',
    };
  }

  // ----------------------------------------------------
  // 6. TIMER COMMANDS
  // ----------------------------------------------------
  if (matches(['timer'])) {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let hasDuration = false;

    // Look for numbers followed by hours, minutes, seconds
    // Handles: "set timer for 10 minutes", "start a 30 minute timer", "set timer for 45 seconds", "set timer for 1 hour"
    const hrRegex = /(\d+)\s*(?:hour|hr)s?/i;
    const minRegex = /(\d+)\s*(?:minute|min)s?/i;
    const secRegex = /(\d+)\s*(?:second|sec)s?/i;

    const hrMatch = normalized.match(hrRegex);
    const minMatch = normalized.match(minRegex);
    const secMatch = normalized.match(secRegex);

    if (hrMatch) {
      hours = parseInt(hrMatch[1], 10);
      hasDuration = true;
    }
    if (minMatch) {
      minutes = parseInt(minMatch[1], 10);
      hasDuration = true;
    }
    if (secMatch) {
      seconds = parseInt(secMatch[1], 10);
      hasDuration = true;
    }

    const isGenericTimer =
      !hasDuration ||
      normalized === 'open timer' ||
      normalized === 'show timer' ||
      normalized === 'go to timer' ||
      normalized === 'timer';

    let feedback = 'Opening Timer.';
    let action = 'start';

    if (hasDuration) {
      userDataService.saveTimerSettings(userId, { hours, minutes, seconds });
      localStorage.setItem('friendly_bot_timer_action', 'start');

      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
      if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
      const durText = parts.join(' ');
      feedback = `Timer started for ${durText}.`;
    } else {
      localStorage.setItem('friendly_bot_timer_action', action);
    }

    return {
      handled: true,
      type: 'timer',
      tab: 'timer',
      feedbackMessage: feedback,
    };
  }

  // ----------------------------------------------------
  // 7. ALARM COMMANDS
  // ----------------------------------------------------
  const isAlarmAction = matches(['alarm', 'wake me up']);
  if (isAlarmAction) {
    const timeMatch = extractTimeFromString(normalized);
    if (timeMatch) {
      const { hour, minute, isPm, hour24Str } = timeMatch;

      let label = 'Alarm';
      const labelMatch = normalized.match(/(?:called|named|label|for)\s+([a-zA-Z0-9\s]+)$/i);
      if (labelMatch) {
        const parsedLabel = labelMatch[1].trim();
        if (parsedLabel && parsedLabel !== 'alarm' && parsedLabel !== 'meeting' && !parsedLabel.match(/^\d/)) {
          label = parsedLabel.charAt(0).toUpperCase() + parsedLabel.slice(1);
        }
      }
      if (normalized.includes('wake me up')) {
        label = 'Wake up';
      }

      const existingAlarms = userDataService.getAlarms(userId);
      const newAlarm: Alarm = {
        id: `alarm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        time: hour24Str,
        label,
        enabled: true,
      };

      userDataService.saveAlarms(userId, [...existingAlarms, newAlarm]);

      const displayPeriod = isPm ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const displayMin = minute.toString().padStart(2, '0');

      return {
        handled: true,
        type: 'alarm',
        tab: 'alarm',
        feedbackMessage: `Alarm set for ${displayHour}:${displayMin} ${displayPeriod}${label !== 'Alarm' ? ` called ${label}` : ''}.`,
      };
    } else {
      return {
        handled: true,
        type: 'alarm',
        tab: 'alarm',
        feedbackMessage: 'Opening Alarms.',
      };
    }
  }

  // ----------------------------------------------------
  // 8. REMINDER COMMANDS (REMAINDER -> REMINDER NORMALIZED)
  // ----------------------------------------------------
  const isReminderAction = matches(['reminder', 'remind me']);
  if (isReminderAction) {
    const timeMatch = extractTimeFromString(normalized);
    if (timeMatch) {
      const { hour, minute, isPm } = timeMatch;

      const targetDate = new Date();
      if (normalized.includes('tomorrow')) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      targetDate.setHours(hour, minute, 0, 0);

      // Extract reminder text
      // e.g. "remind me to study at 7 pm", "set reminder to call John at 6 pm", "remind me to submit the assignment tomorrow at 9 am"
      let title = 'Reminder';
      const toMatch = normalized.match(/(?:remind me to|set reminder to|reminder to|remind me)\s+(.*?)(?:\s+at|\s+for|\s+tomorrow|\s+today|$)/i);
      if (toMatch && toMatch[1].trim()) {
        const candidate = toMatch[1].trim();
        const candidateLower = candidate.toLowerCase();
        if (candidate && candidateLower !== 'remind me' && candidateLower !== 'reminder' && candidateLower !== 'tomorrow' && candidateLower !== 'today') {
          title = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        }
      }

      if (normalized.includes('study') && title === 'Reminder') title = 'Study';
      if (normalized.includes('call john') && title === 'Reminder') title = 'Call John';

      const existingReminders = userDataService.getReminders(userId);
      const newReminder: Reminder = {
        id: `reminder-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        title,
        datetime: targetDate.toISOString(),
        completed: false,
      };

      userDataService.saveReminders(userId, [...existingReminders, newReminder]);

      const displayPeriod = isPm ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const displayMin = minute.toString().padStart(2, '0');
      const dayLabel = normalized.includes('tomorrow') ? 'tomorrow' : 'today';

      return {
        handled: true,
        type: 'reminder',
        tab: 'reminder',
        feedbackMessage: `Reminder set: "${title}" for ${dayLabel} at ${displayHour}:${displayMin} ${displayPeriod}.`,
      };
    } else {
      return {
        handled: true,
        type: 'reminder',
        tab: 'reminder',
        feedbackMessage: 'Opening Reminders.',
      };
    }
  }

  // ----------------------------------------------------
  // 9. CALENDAR CREATE EVENT AUTOMATION
  // ----------------------------------------------------
  const isCalendarAddAction = matches([
    'add an event',
    'create an event',
    'schedule a meeting',
    'add a meeting',
    'schedule meeting',
    'add event',
    'create event',
    'schedule an event',
    'add meeting',
  ]);

  if (isCalendarAddAction) {
    const timeMatch = extractTimeFromString(normalized);
    let hour24Str = '10:00';
    let hour = 10;
    let minute = 0;
    let isPm = false;

    if (timeMatch) {
      hour24Str = timeMatch.hour24Str;
      hour = timeMatch.hour;
      minute = timeMatch.minute;
      isPm = timeMatch.isPm;
    }

    const eventDate = new Date();
    if (normalized.includes('tomorrow')) {
      eventDate.setDate(eventDate.getDate() + 1);
    }
    const year = eventDate.getFullYear();
    const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
    const day = eventDate.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let title = 'Meeting';
    const titleMatch = normalized.match(/(?:called|named|title|meeting|event|to|for)\s+([a-zA-Z0-9\s]+?)(?:\s+at|\s+for|\s+tomorrow|$)/i);
    if (titleMatch && titleMatch[1].trim()) {
      const candidate = titleMatch[1].trim();
      if (candidate && candidate !== 'an' && candidate !== 'a' && candidate !== 'event' && candidate !== 'meeting') {
        title = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }

    const endHour24 = (hour + 1) % 24;
    const endTimeStr = `${endHour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    const existingEvents = userDataService.getCalendarEvents(userId);
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      title,
      date: dateStr,
      startTime: hour24Str,
      endTime: endTimeStr,
      category: 'work',
      recurrence: 'none',
      reminderMinutesBefore: 15,
    };

    userDataService.saveCalendarEvents(userId, [...existingEvents, newEvent]);

    const displayPeriod = isPm ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMin = minute.toString().padStart(2, '0');
    const dayLabel = normalized.includes('tomorrow') ? 'tomorrow' : 'today';

    return {
      handled: true,
      type: 'calendar',
      tab: undefined,
      feedbackMessage: `Calendar event "${title}" added for ${dayLabel} at ${displayHour}:${displayMin} ${displayPeriod}.`,
    };
  }

  // ----------------------------------------------------
  // 10. GENERIC TIME MANAGEMENT OPENER
  // ----------------------------------------------------
  if (matches(['open time management', 'go to time management', 'time management', 'open time'])) {
    return {
      handled: true,
      type: 'navigation',
      tab: 'clock',
      feedbackMessage: 'Opening Time Management.',
    };
  }

  return {
    handled: false,
    type: null,
    feedbackMessage: '',
  };
}
