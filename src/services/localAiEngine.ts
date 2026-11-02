/**
 * Domain-Specific Offline AI Knowledge Engine & RAG Synthesizer
 * 
 * Operates 100% offline without cloud APIs or Gemini.
 * Strictly limited to trained domain topics, project documentation, and custom user datasets.
 * Refuses out-of-scope queries politely with clear domain guidance.
 */

export interface LocalAiResponse {
  query: string;
  answer: string;
  topic: string;
  confidence: number;
  isSupportedDomain: boolean;
  mode: 'simple' | 'detailed' | 'analysis';
}

export interface KnowledgeTopic {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  simple: string;
  detailed: string;
  analysis: string;
  isCustom?: boolean;
}

import { OFFICIAL_KNOWLEDGE_BASE } from './knowledgeBaseData';
import { localLlmService } from './localLlmService';
import { userDataService } from './userDataService';

const LOCAL_STORAGE_KEY = 'LOCAL_AI_CUSTOM_KNOWLEDGE_V1';

export class LocalAiEngine {
  private customKnowledge: KnowledgeTopic[] = [];

  constructor() {
    this.loadCustomKnowledge();
  }

  /**
   * Load custom user knowledge entries from localStorage
   */
  public loadCustomKnowledge(): KnowledgeTopic[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        this.customKnowledge = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load custom local AI knowledge:', e);
      this.customKnowledge = [];
    }
    return this.customKnowledge;
  }

  /**
   * Save custom knowledge entry
   */
  public addCustomTopic(topic: Omit<KnowledgeTopic, 'id' | 'isCustom'>): KnowledgeTopic {
    const newTopic: KnowledgeTopic = {
      ...topic,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      isCustom: true,
      category: topic.category || 'Custom Datasets',
      keywords: topic.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean),
    };

    this.customKnowledge.unshift(newTopic);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.customKnowledge));
    } catch (e) {
      console.error('Failed to save custom local AI topic:', e);
    }
    return newTopic;
  }

  /**
   * Delete custom topic
   */
  public deleteCustomTopic(id: string): void {
    this.customKnowledge = this.customKnowledge.filter((t) => t.id !== id);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.customKnowledge));
    } catch (e) {
      console.error('Failed to update custom local AI storage:', e);
    }
  }

  /**
   * Get all combined topics (Official + Custom)
   */
  public getAllTopics(): KnowledgeTopic[] {
    return [...this.customKnowledge, ...OFFICIAL_KNOWLEDGE_BASE];
  }

  /**
   * Recognises if a string is an explicit "Question" command.
   * Strips out "Question" keyword and returns clean query.
   */
  public extractQuestionQuery(rawText: string): { isQuestion: boolean; cleanQuery: string } {
    if (!rawText || !rawText.trim()) {
      return { isQuestion: false, cleanQuery: '' };
    }

    const trimmed = rawText.trim();
    const lower = trimmed.toLowerCase();

    const questionMatch = lower.match(/^(?:\s*hey\s+|\s*hi\s+)?question\b[\s,:\.-]*(.*)$/i);

    if (questionMatch) {
      const clean = questionMatch[1].trim();
      return {
        isQuestion: true,
        cleanQuery: clean || trimmed,
      };
    }

    if (lower.startsWith('question') || lower.includes('question')) {
      const parts = trimmed.replace(/^(?:\s*hey\s+|\s*hi\s+)?question\b[\s,:\.-]*/i, '').trim();
      return {
        isQuestion: true,
        cleanQuery: parts || trimmed,
      };
    }

    return {
      isQuestion: false,
      cleanQuery: trimmed,
    };
  }

  /**
   * Generates a 100% offline natural language response strictly following response priority.
   */
  public generateResponse(
    rawQuery: string,
    mode: 'simple' | 'detailed' | 'analysis' = 'simple',
    userId?: string
  ): LocalAiResponse {
    const { cleanQuery } = this.extractQuestionQuery(rawQuery);
    const queryToUse = cleanQuery || rawQuery.trim();
    const lower = queryToUse.toLowerCase();
    
    // Normalize punctuation
    const normalized = lower.replace(/[?,!.:;'"\(\)]/g, ' ').replace(/\s+/g, ' ').trim();

    // Priority 1: Real Local Data Queries (Time, Date, Timetable)
    const timeDataMatch = this.matchTimeAndTimetableQueries(normalized, userId);
    if (timeDataMatch) {
      return {
        query: queryToUse,
        answer: timeDataMatch.response,
        topic: timeDataMatch.topic,
        confidence: 0.99,
        isSupportedDomain: true,
        mode,
      };
    }

    // Priority 2: Conversational Intents (Greetings, Well-being, Identity, Compound phrases e.g. "hi how are you?")
    const basicConv = this.matchBasicConversation(normalized);
    if (basicConv) {
      return {
        query: queryToUse,
        answer: basicConv.response,
        topic: basicConv.topic,
        confidence: 0.99,
        isSupportedDomain: true,
        mode,
      };
    }
    
    // Priority 3: Technical Knowledge Base Match (Requires high confidence word-boundary score)
    const strippedCore = normalized.replace(
      /^(?:hey\s+|hi\s+)?(?:question\s+)?(?:what\s+is\s+|what\s+are\s+|what\s+does\s+|what\s+do\s+you\s+mean\s+by\s+|what\s+is\s+meant\s+by\s+|explain\s+|tell\s+me\s+about\s+|define\s+|describe\s+|how\s+does\s+|how\s+do\s+|can\s+you\s+explain\s+|give\s+me\s+information\s+on\s+|details\s+about\s+|what\s+is\s+the\s+meaning\s+of\s+|meaning\s+of\s+|concept\s+of\s+|definition\s+of\s+)/i,
      ''
    ).trim();

    const allTopics = this.getAllTopics();

    let bestMatch: KnowledgeTopic | null = null;
    let highestScore = 0;

    for (const topic of allTopics) {
      let score = 0;
      const topicNameLower = topic.name.toLowerCase();
      const topicIdNormalized = topic.id.toLowerCase().replace(/_/g, ' ');

      // 1. Exact match against topic ID or topic name
      if (strippedCore === topicIdNormalized || normalized === topicIdNormalized) {
        score += 35;
      } else if (strippedCore === topicNameLower || normalized === topicNameLower) {
        score += 35;
      } else if (strippedCore && new RegExp(`\\b${escapeRegExp(strippedCore)}\\b`, 'i').test(topicNameLower)) {
        score += 25;
      } else if (new RegExp(`\\b${escapeRegExp(topicNameLower)}\\b`, 'i').test(normalized)) {
        score += 20;
      }

      // 2. Keyword matches strictly with word boundary
      for (const kw of topic.keywords) {
        if (!kw) continue;
        const kwLower = kw.toLowerCase().replace(/[?,!.:;'"\(\)]/g, ' ').trim();
        if (!kwLower) continue;

        if (kwLower === normalized || kwLower === strippedCore) {
          score += 30;
        } else if (strippedCore && kwLower === strippedCore) {
          score += 25;
        } else if (new RegExp(`\\b${escapeRegExp(kwLower)}\\b`, 'i').test(normalized)) {
          score += kwLower.length >= 3 ? 15 : 10;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = topic;
      }
    }

    // Require strong score >= 25 to prevent false matches on random queries
    if (bestMatch && highestScore >= 25) {
      let text = bestMatch.simple;
      if (mode === 'detailed') text = bestMatch.detailed;
      if (mode === 'analysis') text = bestMatch.analysis;

      return {
        query: queryToUse,
        answer: text,
        topic: `${bestMatch.name}${bestMatch.isCustom ? ' (Custom Note)' : ''}`,
        confidence: Math.min(0.99, 0.70 + highestScore * 0.01),
        isSupportedDomain: true,
        mode,
      };
    }

    // Priority 4: Offline General Knowledge Model Q&A
    const generalMatch = localLlmService.queryGeneralKnowledge(normalized);
    if (generalMatch) {
      return {
        query: queryToUse,
        answer: generalMatch.answer,
        topic: generalMatch.topic,
        confidence: 0.90,
        isSupportedDomain: true,
        mode,
      };
    }

    // Priority 5: Offline Fallback (Never show Out of Scope)
    const offlineRefusal = "I don't have an answer for that in my offline knowledge.";

    return {
      query: queryToUse,
      answer: offlineRefusal,
      topic: 'Offline AI',
      confidence: 0.0,
      isSupportedDomain: false,
      mode,
    };
  }

  /**
   * Helper to handle Time, Date, Schedule Aggregation, and User Timetable queries using real local device data & user storage
   */
  private matchTimeAndTimetableQueries(norm: string, userId?: string): { response: string; topic: string } | null {
    if (!norm) return null;

    const activeUser = userId || userDataService.getCurrentUser()?.id || 'guest';
    const now = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = daysOfWeek[now.getDay()];
    const todayDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const nowTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Current Time
    if (
      /^(what\s+time\s+is\s+it|tell\s+me\s+the\s+time|current\s+time|time\s+now|what's\s+the\s+time|whats\s+the\s+time|time)$/i.test(norm)
    ) {
      const liveTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { response: `The current local time is ${liveTime}.`, topic: 'Live Time' };
    }

    // 2. Current Date
    if (
      /^(what\s+date\s+is\s+today|what\s+is\s+today's\s+date|what\s+is\s+todays\s+date|current\s+date|today's\s+date|date\s+today|what's\s+the\s+date)$/i.test(norm)
    ) {
      const liveDate = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return { response: `Today is ${liveDate}.`, topic: 'Live Date' };
    }

    // 3. Current Day
    if (
      /^(what\s+day\s+is\s+today|what\s+day\s+is\s+it|day\s+today|which\s+day\s+is\s+today)$/i.test(norm)
    ) {
      return { response: `Today is ${todayName}.`, topic: 'Live Date' };
    }

    // 4. "What should I do now?" / "What do I have right now?"
    const isWhatShouldIDoNow = /\b(what\s+should\s+i\s+do\s+now|what\s+should\s+i\s+do|what\s+do\s+i\s+have\s+now|what\s+am\s+i\s+doing\s+now|what\s+is\s+happening\s+now|current\s+activity|current\s+task|what's\s+up\s+now)\b/i.test(norm);
    if (isWhatShouldIDoNow) {
      const timetable = userDataService.getTimetable(activeUser);
      const calendar = userDataService.getCalendarEvents(activeUser);
      const reminders = userDataService.getReminders(activeUser);
      const alarms = userDataService.getAlarms(activeUser);

      // Collect today's items
      const todayTimetable = timetable.filter(
        (t) => t.date === todayDateStr || t.day.toLowerCase() === todayName.toLowerCase()
      );
      const todayCalendar = calendar.filter((c) => c.date === todayDateStr);
      const todayReminders = reminders.filter((r) => {
        if (!r.datetime) return false;
        return r.datetime.startsWith(todayDateStr);
      });

      // Find active period/event right now
      let currentItem: { title: string; time: string; venue?: string; type: string } | null = null;
      let upcomingItem: { title: string; time: string; venue?: string; type: string } | null = null;

      // Check current timetable period
      for (const t of todayTimetable) {
        if (t.startTime <= nowTimeStr && t.endTime >= nowTimeStr) {
          currentItem = {
            title: `Period ${t.periodNumber}: ${t.subject || 'Class'}`,
            time: `${t.startTime} – ${t.endTime}`,
            venue: t.venue,
            type: 'Timetable',
          };
          break;
        }
      }

      // Check current calendar event if no period
      if (!currentItem) {
        for (const c of todayCalendar) {
          if (c.startTime <= nowTimeStr && c.endTime >= nowTimeStr) {
            currentItem = {
              title: c.title,
              time: `${c.startTime} – ${c.endTime}`,
              venue: c.location,
              type: 'Calendar',
            };
            break;
          }
        }
      }

      // Find next upcoming item today
      const upcomingTimetable = todayTimetable
        .filter((t) => t.startTime > nowTimeStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

      const upcomingCalendar = todayCalendar
        .filter((c) => c.startTime > nowTimeStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

      const upcomingRem = todayReminders
        .filter((r) => {
          const remTime = r.datetime.slice(11, 16);
          return remTime > nowTimeStr;
        })
        .sort((a, b) => a.datetime.localeCompare(b.datetime))[0];

      const upcomingAlarm = alarms
        .filter((a) => a.enabled && a.time > nowTimeStr)
        .sort((a, b) => a.time.localeCompare(b.time))[0];

      // Compare all upcoming to pick the nearest
      const candidates: { title: string; time: string; venue?: string; type: string; rawTime: string }[] = [];
      if (upcomingTimetable) {
        candidates.push({
          title: `Period ${upcomingTimetable.periodNumber}: ${upcomingTimetable.subject || 'Class'}`,
          time: `${upcomingTimetable.startTime} – ${upcomingTimetable.endTime}`,
          venue: upcomingTimetable.venue,
          type: 'Timetable',
          rawTime: upcomingTimetable.startTime,
        });
      }
      if (upcomingCalendar) {
        candidates.push({
          title: upcomingCalendar.title,
          time: `${upcomingCalendar.startTime} – ${upcomingCalendar.endTime}`,
          venue: upcomingCalendar.location,
          type: 'Calendar',
          rawTime: upcomingCalendar.startTime,
        });
      }
      if (upcomingRem) {
        const remTime = upcomingRem.datetime.slice(11, 16);
        candidates.push({
          title: upcomingRem.title,
          time: remTime,
          type: 'Reminder',
          rawTime: remTime,
        });
      }
      if (upcomingAlarm) {
        candidates.push({
          title: upcomingAlarm.label || 'Alarm',
          time: upcomingAlarm.time,
          type: 'Alarm',
          rawTime: upcomingAlarm.time,
        });
      }

      candidates.sort((a, b) => a.rawTime.localeCompare(b.rawTime));
      if (candidates.length > 0) {
        upcomingItem = candidates[0];
      }

      if (!currentItem && !upcomingItem) {
        return {
          response: "You don't have any scheduled activities right now.",
          topic: 'Activities',
        };
      }

      let resp = 'What You Should Do Now\n\n';
      if (currentItem) {
        resp += `🟢 Current\n\n${currentItem.time}\n${currentItem.title}`;
        if (currentItem.venue && currentItem.venue.trim()) {
          resp += `\n📍 ${currentItem.venue.trim()}`;
        }
        resp += '\n\n';
      }

      if (upcomingItem) {
        resp += `Up Next\n\n${upcomingItem.time}\n`;
        if (upcomingItem.type === 'Timetable') resp += `📚 ${upcomingItem.title}`;
        else if (upcomingItem.type === 'Calendar') resp += `📅 Calendar\n${upcomingItem.title}`;
        else if (upcomingItem.type === 'Reminder') resp += `🔔 Reminder\n${upcomingItem.title}`;
        else if (upcomingItem.type === 'Alarm') resp += `⏰ Alarm\n"${upcomingItem.title}"`;
        else resp += upcomingItem.title;

        if (upcomingItem.venue && upcomingItem.venue.trim()) {
          resp += `\n📍 ${upcomingItem.venue.trim()}`;
        }
      }

      return {
        response: resp.trim(),
        topic: 'Current Activity',
      };
    }

    // 5. Daily Activity Aggregation ("What are all my activities for today?", "What do I have tomorrow?", etc.)
    const isDailyActivityQuery = /\b(what\s+do\s+i\s+have|what\s+are\s+my\s+activities|all\s+my\s+activities|what\s+is\s+scheduled|what\s+do\s+i\s+need\s+to\s+do|what\s+are\s+my\s+tasks|my\s+schedule|daily\s+schedule|activities\s+for)\b/i.test(norm);
    
    // Check if query refers to tomorrow, yesterday, specific weekday, or today
    const isTomorrow = /\btomorrow\b/i.test(norm);
    const isYesterday = /\byesterday\b/i.test(norm);
    const dayMatch = norm.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

    if (isDailyActivityQuery || isTomorrow || isYesterday || (dayMatch && !norm.includes('what day is'))) {
      let targetDate = new Date();
      let headerTitle = "Today's Schedule";

      if (isTomorrow) {
        targetDate.setDate(targetDate.getDate() + 1);
        headerTitle = "Tomorrow's Schedule";
      } else if (isYesterday) {
        targetDate.setDate(targetDate.getDate() - 1);
        headerTitle = "Yesterday's Schedule";
      } else if (dayMatch) {
        const targetDayNameLower = dayMatch[1].toLowerCase();
        const targetDayIdx = daysOfWeek.findIndex((d) => d.toLowerCase() === targetDayNameLower);
        if (targetDayIdx !== -1) {
          const currentDayIdx = now.getDay();
          let diff = targetDayIdx - currentDayIdx;
          if (diff < 0) diff += 7;
          if (diff === 0 && (norm.includes('next') || norm.includes('upcoming'))) diff = 7;
          targetDate.setDate(targetDate.getDate() + diff);
          headerTitle = `${daysOfWeek[targetDayIdx]}'s Schedule`;
        }
      }

      const targetDayName = daysOfWeek[targetDate.getDay()];
      const targetDateStr = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;

      // Load user data
      const timetable = userDataService.getTimetable(activeUser);
      const calendar = userDataService.getCalendarEvents(activeUser);
      const reminders = userDataService.getReminders(activeUser);
      const alarms = userDataService.getAlarms(activeUser);

      // Collect items for target date
      interface ScheduleItem {
        time: string;
        endTime?: string;
        type: 'timetable' | 'calendar' | 'reminder' | 'alarm';
        title: string;
        subtitle?: string;
        venue?: string;
      }

      const items: ScheduleItem[] = [];

      // Timetable
      const dayPeriods = timetable.filter(
        (t) => t.date === targetDateStr || t.day.toLowerCase() === targetDayName.toLowerCase()
      );
      for (const t of dayPeriods) {
        items.push({
          time: t.startTime,
          endTime: t.endTime,
          type: 'timetable',
          title: `📚 ${t.subject || 'Class'}`,
          subtitle: `Period ${t.periodNumber}`,
          venue: t.venue,
        });
      }

      // Calendar
      const dayEvents = calendar.filter((c) => c.date === targetDateStr);
      for (const c of dayEvents) {
        items.push({
          time: c.startTime,
          endTime: c.endTime,
          type: 'calendar',
          title: `📅 Calendar\n${c.title}`,
          venue: c.location,
        });
      }

      // Reminders
      const dayReminders = reminders.filter((r) => r.datetime && r.datetime.startsWith(targetDateStr));
      for (const r of dayReminders) {
        const timePart = r.datetime.slice(11, 16) || '09:00';
        items.push({
          time: timePart,
          type: 'reminder',
          title: `🔔 Reminder\n${r.title}`,
        });
      }

      // Alarms (if today or tomorrow)
      if (!isYesterday) {
        for (const a of alarms.filter((al) => al.enabled)) {
          items.push({
            time: a.time,
            type: 'alarm',
            title: `⏰ Alarm\n"${a.label || 'Alarm'}"`,
          });
        }
      }

      if (items.length === 0) {
        return {
          response: `You don't have any activities or periods scheduled for ${headerTitle.toLowerCase().replace("'s schedule", '') || 'this date'}.`,
          topic: 'Daily Schedule',
        };
      }

      // Sort chronologically by start time
      items.sort((a, b) => a.time.localeCompare(b.time));

      // Build formatted response grouped by time or clean chronological list
      let output = `${headerTitle}\n\n`;

      let hasMorning = false;
      let hasAfternoon = false;
      let hasEvening = false;

      for (const item of items) {
        const hour = parseInt(item.time.split(':')[0], 10) || 0;
        if (hour < 12 && !hasMorning) {
          output += `🌅 Morning\n\n`;
          hasMorning = true;
        } else if (hour >= 12 && hour < 17 && !hasAfternoon) {
          output += `☀️ Afternoon\n\n`;
          hasAfternoon = true;
        } else if (hour >= 17 && !hasEvening) {
          output += `🌙 Evening\n\n`;
          hasEvening = true;
        }

        const timeStr = item.endTime ? `${item.time} – ${item.endTime}` : item.time;
        output += `${timeStr}\n${item.title}`;
        if (item.venue && item.venue.trim()) {
          output += `\n📍 ${item.venue.trim()}`;
        }
        output += `\n\n`;
      }

      return {
        response: output.trim(),
        topic: 'Daily Schedule',
      };
    }

    // 6. Next Period Query ("What is my next period?", "What is my next class?")
    const isNextPeriodQuery = /\b(next\s+period|next\s+class|upcoming\s+period|upcoming\s+class)\b/i.test(norm);
    if (isNextPeriodQuery) {
      const timetable = userDataService.getTimetable(activeUser);
      const todayEntries = timetable.filter(
        (t) => t.date === todayDateStr || t.day.toLowerCase() === todayName.toLowerCase()
      );

      if (todayEntries.length === 0) {
        return {
          response: `There are no periods scheduled for today (${todayName}).`,
          topic: 'Timetable',
        };
      }

      const sorted = [...todayEntries].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const currentPeriod = sorted.find((t) => t.startTime <= nowTimeStr && t.endTime >= nowTimeStr);
      const nextPeriod = sorted.find((t) => t.startTime > nowTimeStr);

      if (currentPeriod && nextPeriod) {
        let resp = `Current Period\nPeriod ${currentPeriod.periodNumber}\n${currentPeriod.startTime} – ${currentPeriod.endTime}\n📚 ${currentPeriod.subject}`;
        if (currentPeriod.venue && currentPeriod.venue.trim()) resp += `\n📍 ${currentPeriod.venue.trim()}`;
        resp += `\n\nNext Period\nPeriod ${nextPeriod.periodNumber}\n${nextPeriod.startTime} – ${nextPeriod.endTime}\n📚 ${nextPeriod.subject}`;
        if (nextPeriod.venue && nextPeriod.venue.trim()) resp += `\n📍 ${nextPeriod.venue.trim()}`;
        return { response: resp, topic: 'Next Period' };
      } else if (currentPeriod) {
        let resp = `Current Period\nPeriod ${currentPeriod.periodNumber}\n${currentPeriod.startTime} – ${currentPeriod.endTime}\n📚 ${currentPeriod.subject}`;
        if (currentPeriod.venue && currentPeriod.venue.trim()) resp += `\n📍 ${currentPeriod.venue.trim()}`;
        resp += `\n\nThere are no more periods scheduled for today.`;
        return { response: resp, topic: 'Next Period' };
      } else if (nextPeriod) {
        let resp = `Next Period\n\nPeriod ${nextPeriod.periodNumber}\n${nextPeriod.startTime} – ${nextPeriod.endTime}\n📚 ${nextPeriod.subject}`;
        if (nextPeriod.venue && nextPeriod.venue.trim()) resp += `\n📍 ${nextPeriod.venue.trim()}`;
        return { response: resp, topic: 'Next Period' };
      } else {
        return {
          response: 'There are no more periods scheduled for today.',
          topic: 'Next Period',
        };
      }
    }

    // 7. Full Timetable Query ("What is my timetable today?", "What is my timetable on Monday?")
    const isTimetableOnly = /\b(timetable|classes\s+today|today's\s+timetable|my\s+classes)\b/i.test(norm);
    if (isTimetableOnly) {
      const timetable = userDataService.getTimetable(activeUser);
      const todayEntries = timetable.filter(
        (t) => t.date === todayDateStr || t.day.toLowerCase() === todayName.toLowerCase()
      );

      if (todayEntries.length === 0) {
        return {
          response: `You don't have any classes scheduled for today (${todayName}). You can add periods in the Time Management section.`,
          topic: 'Timetable',
        };
      }

      const sorted = [...todayEntries].sort((a, b) => a.startTime.localeCompare(b.startTime));
      let resp = `Today's Timetable (${todayName})\n\n`;
      sorted.forEach((t) => {
        resp += `Period ${t.periodNumber}\n${t.startTime} – ${t.endTime}\n${t.subject || 'Class'}`;
        if (t.venue && t.venue.trim()) {
          resp += `\n📍 ${t.venue.trim()}`;
        }
        resp += `\n\n`;
      });

      return {
        response: resp.trim(),
        topic: 'Timetable',
      };
    }

    return null;
  }

  /**
   * Helper to match basic and compound conversational intents with flexible variations
   */
  private matchBasicConversation(norm: string): { response: string; topic: string } | null {
    if (!norm) return null;

    const hasGreeting = /\b(hi|hello|hey|greetings|good\s*morning|good\s*afternoon|good\s*evening|good\s*night)\b/i.test(norm);
    const hasWellbeing = /\b(how\s+are\s+you|how\s+are\s+u|how\s+r\s+u|how\s+are\s+things|how\s+is\s+it\s+going|how's\s+it\s+going|how\s+are\s+you\s+doing|doing\s+well)\b/i.test(norm);

    // Compound Greeting + Well-being (e.g. "hi how are you?", "hello how are you doing today?", "hey how are things?")
    if (hasGreeting && hasWellbeing) {
      return {
        response: "Hi! I'm doing great and I'm ready to help you. How can I assist you today?",
        topic: 'Basic Conversation',
      };
    }

    // Well-being alone (e.g. "how are you?", "how are you doing today?", "how's it going?")
    if (hasWellbeing) {
      return {
        response: "I'm doing great! How can I help you today?",
        topic: 'Basic Conversation',
      };
    }

    // Identity / Name / Who are you (e.g. "what is your name?", "who are you?", "may I know your name?", "tell me your name", "your name", "name")
    if (
      /\b(what\s*is\s*your\s*name|what's\s*your\s*name|whats\s*your\s*name|your\s*name|tell\s*me\s*your\s*name|who\s*are\s*you|who\s*r\s*u|what\s*are\s*you|tell\s*me\s*about\s*yourself|may\s*i\s*know\s*your\s*name|can\s*you\s*tell\s*me\s*who\s*you\s*are|who\s*made\s*you|who\s*created\s*you)\b/i.test(norm) ||
      norm === 'name' ||
      norm === 'your name'
    ) {
      return {
        response: "I am Offline Bot, your 100% offline local AI assistant!",
        topic: 'Basic Conversation',
      };
    }

    // Greetings alone (e.g. "hi", "hello", "hey", "good morning")
    if (hasGreeting) {
      if (norm.includes('morning')) {
        return { response: 'Good morning! How can I assist you today?', topic: 'Basic Conversation' };
      }
      if (norm.includes('afternoon')) {
        return { response: 'Good afternoon! How can I help you today?', topic: 'Basic Conversation' };
      }
      if (norm.includes('evening')) {
        return { response: 'Good evening! How can I help you?', topic: 'Basic Conversation' };
      }
      return { response: 'Hello! How can I help you?', topic: 'Basic Conversation' };
    }

    // Acknowledgments & Simple Words (e.g. "ok", "okay", "k", "fine", "alright", "sure", "got it", "cool", "yes", "yep", "yeah")
    if (
      /^(ok|okay|k|fine|alright|all\s+right|sure|got\s+it|understood|cool|yep|yeah|yes|no|nope|k\s+thanks|ok\s+thanks|okay\s+thanks)$/i.test(norm)
    ) {
      return { response: 'Okay! How can I help you?', topic: 'Basic Conversation' };
    }

    // Positive Feedback (e.g. "good", "great", "nice", "awesome", "perfect", "excellent")
    if (
      /^(good|great|nice|awesome|perfect|excellent|good\s+job)$/i.test(norm)
    ) {
      return { response: 'Good! How can I help you today?', topic: 'Basic Conversation' };
    }

    // Capabilities (e.g. "what can you do?", "how can you help me?", "what are your capabilities?")
    if (
      /\b(what\s*can\s*you\s*do|what\s*can\s*u\s*do|what\s*do\s*you\s*do|how\s*can\s*you\s*help|what\s*are\s*your\s*capabilities|what\s*can\s*i\s*ask|help|help\s*me|what\s*can\s*this\s*bot\s*do)\b/i.test(norm)
    ) {
      return {
        response: "I can answer technical questions (e.g. 'What is Java?'), answer general knowledge queries, check your schedule ('What is my next period?'), and execute app commands ('Set an alarm at 7 AM', 'Open Timer') completely offline!",
        topic: 'Basic Conversation',
      };
    }

    // Gratitude (e.g. "thanks", "thank you", "thanks a lot", "appreciate it")
    if (
      /\b(thank\s*you|thanks|thank\s*u|thanks\s*a\s*lot|thank\s*you\s*so\s*much|appreciate\s*it|many\s*thanks)\b/i.test(norm)
    ) {
      return { response: "You're very welcome! Let me know if you need help with anything else.", topic: 'Basic Conversation' };
    }

    // Farewells (e.g. "bye", "goodbye", "see you", "see you later", "talk to you later")
    if (
      /\b(bye|goodbye|see\s*you|see\s*you\s*later|good\s*night|talk\s*to\s*you\s*later|catch\s*you\s*later)\b/i.test(norm)
    ) {
      return { response: "Goodbye! Have a great time.", topic: 'Basic Conversation' };
    }

    return null;
  }

  /**
   * Helper to match app features or navigation questions
   */
  private matchAppDataOrCommand(norm: string): { response: string; topic: string } | null {
    if (norm.includes('calendar') || norm.includes('schedule') || norm.includes('event')) {
      return {
        response: "You can view and manage your events by navigating to the Calendar page or saying 'Open Calendar'.",
        topic: 'App Guidance',
      };
    }
    if (norm.includes('clock') || norm.includes('alarm') || norm.includes('timer') || norm.includes('stopwatch') || norm.includes('timetable')) {
      return {
        response: "You can set alarms, timers, stopwatches, and view timetables on the Time Management page.",
        topic: 'App Guidance',
      };
    }
    if (norm.includes('productivity') || norm.includes('task list') || norm.includes('todo')) {
      return {
        response: "Use the Productivity section to manage your daily tasks, todo lists, and focus timers.",
        topic: 'App Guidance',
      };
    }
    if (norm.includes('music') || norm.includes('song') || norm.includes('playlist')) {
      return {
        response: "Navigate to the Music section or say 'Play music' to stream tracks and ambient audio.",
        topic: 'App Guidance',
      };
    }
    return null;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const localAiEngine = new LocalAiEngine();
