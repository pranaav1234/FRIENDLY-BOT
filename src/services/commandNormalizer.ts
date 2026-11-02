/**
 * Centralized Voice & Natural Language Input Normalizer
 *
 * Provides intent preprocessing, typo/alias correction, filler removal,
 * and high-level intent classification before execution.
 */

export interface NormalizedInput {
  raw: string;
  normalized: string;
  cleanedCore: string;
}

/**
 * Normalizes speech-to-text or typed user input
 */
export function normalizeCommandInput(raw: string): NormalizedInput {
  const original = (raw || '').trim();
  if (!original) {
    return { raw: '', normalized: '', cleanedCore: '' };
  }

  // 1. Lowercase
  let text = original.toLowerCase();

  // 2. Remove punctuation except periods that are part of file extensions (e.g. .pdf, .docx)
  // Replace quotes, exclamation, question marks, commas, semicolons, colons
  text = text.replace(/["'?!,:;()[\]{}]/g, ' ');

  // Replace dots that are NOT part of file extensions with space
  text = text.replace(/\.(?![a-z0-9]{2,5}\b)/gi, ' ');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 3. Typo & Speech-Recognition Alias Corrections
  // Calendar typos
  text = text.replace(/\bcalenders\b/g, 'calendars');
  text = text.replace(/\bcalender\b/g, 'calendar');

  // Stopwatch aliases (stopclock, stop clock, stop watch -> stopwatch)
  text = text.replace(/\bstop\s+clock\b/g, 'stopwatch');
  text = text.replace(/\bstopclock\b/g, 'stopwatch');
  text = text.replace(/\bstop\s+watch\b/g, 'stopwatch');

  // Reminder typos & aliases (remainder -> reminder)
  text = text.replace(/\bremainders\b/g, 'reminders');
  text = text.replace(/\bremainder\b/g, 'reminder');

  // Timetable alias
  text = text.replace(/\btime\s+table\b/g, 'timetable');

  // Speech-recognition variant: "get reminder at 6 AM" / "get remainder at 6 AM" -> "set reminder at 6 AM"
  text = text.replace(/\bget\s+reminder\s+(at|for|tomorrow|in|\d)/g, 'set reminder $1');
  text = text.replace(/\bget\s+a\s+reminder\s+(at|for|tomorrow|in|\d)/g, 'set a reminder $1');

  // 4. Derive cleanedCore (without leading polite phrases/fillers)
  const cleanedCore = extractCleanedCore(text);

  return {
    raw: original,
    normalized: text,
    cleanedCore,
  };
}

/**
 * Strip common conversational prefixes and suffixes
 */
function extractCleanedCore(text: string): string {
  let cleaned = text;

  const leadingFillers = [
    /^can you please\s+/,
    /^could you please\s+/,
    /^would you please\s+/,
    /^can you\s+/,
    /^could you\s+/,
    /^would you\s+/,
    /^please\s+/,
    /^i need you to\s+/,
    /^take me to the\s+/,
    /^take me to\s+/,
    /^take me\s+/,
    /^show me the\s+/,
    /^show me\s+/,
    /^i want to see the\s+/,
    /^i want to see\s+/,
    /^i want to go to\s+/,
    /^i want to\s+/,
    /^navigate to the\s+/,
    /^navigate to\s+/,
    /^switch to the\s+/,
    /^switch to\s+/,
    /^open the\s+/,
    /^open my\s+/,
    /^open\s+/,
    /^show the\s+/,
    /^go to the\s+/,
    /^go to\s+/,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const regex of leadingFillers) {
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, '').trim();
        changed = true;
      }
    }
  }

  cleaned = cleaned.replace(/\s+please$/, '').replace(/\s+now$/, '').trim();
  return cleaned;
}

/**
 * Identify if an input is unequivocally an Application Command.
 * Prevents application commands (like "calendar", "stopwatch", "set reminder")
 * from ever being sent to the File Search / Computer Automation engine.
 */
export function isApplicationCommand(normalizedText: string): boolean {
  const norm = normalizedText.toLowerCase().trim();

  // Calendar
  if (
    norm === 'calendar' ||
    norm.startsWith('calendar ') ||
    norm.includes('open calendar') ||
    norm.includes('show calendar') ||
    norm.includes('go to calendar') ||
    norm.includes('take me to calendar') ||
    norm.includes('add an event') ||
    norm.includes('schedule a meeting') ||
    norm.includes('schedule meeting')
  ) {
    return true;
  }

  // Stopwatch
  if (
    norm === 'stopwatch' ||
    norm.startsWith('stopwatch ') ||
    norm.includes('open stopwatch') ||
    norm.includes('show stopwatch') ||
    norm.includes('start stopwatch') ||
    norm.includes('stop stopwatch') ||
    norm.includes('reset stopwatch')
  ) {
    return true;
  }

  // Timer
  if (
    norm === 'timer' ||
    norm.startsWith('timer ') ||
    norm.includes('start timer') ||
    norm.includes('stop timer') ||
    norm.includes('pause timer') ||
    norm.includes('reset timer') ||
    norm.includes('open timer') ||
    norm.includes('show timer') ||
    norm.includes('set a timer') ||
    norm.includes('start a timer')
  ) {
    return true;
  }

  // Alarm
  if (
    norm === 'alarm' ||
    norm.startsWith('alarm ') ||
    norm.includes('set alarm') ||
    norm.includes('set an alarm') ||
    norm.includes('open alarm') ||
    norm.includes('show alarm') ||
    norm.includes('wake me up')
  ) {
    return true;
  }

  // Reminder
  if (
    norm === 'reminder' ||
    norm === 'reminders' ||
    norm.startsWith('reminder ') ||
    norm.startsWith('reminders ') ||
    norm.includes('set reminder') ||
    norm.includes('set a reminder') ||
    norm.includes('remind me') ||
    norm.includes('open reminder') ||
    norm.includes('show reminder') ||
    norm.includes('create reminder') ||
    norm.includes('add reminder')
  ) {
    return true;
  }

  // Clock
  if (
    norm === 'clock' ||
    norm === 'world clock' ||
    norm.includes('open clock') ||
    norm.includes('show clock') ||
    norm.includes('what time is it') ||
    norm.includes('what is the time') ||
    norm.includes('current time')
  ) {
    return true;
  }

  // Date
  if (
    norm.includes('what is today') ||
    norm.includes('what is the date') ||
    norm.includes('today date') ||
    norm.includes('what date is it')
  ) {
    return true;
  }

  // Timetable
  if (
    norm.includes('timetable') ||
    norm.includes('next class') ||
    norm.includes('next period') ||
    norm.includes('what do i have')
  ) {
    return true;
  }

  // Navigation pages
  const navKeywords = [
    'home',
    'dashboard',
    'face scan',
    'scan face',
    'face detection',
    'detect face',
    'gesture',
    'productivity',
    'focus session',
    'music player',
    'music library',
    'settings',
    'voice assistant',
    'chatbot',
    'time management',
  ];

  for (const kw of navKeywords) {
    if (
      norm === kw ||
      norm === `open ${kw}` ||
      norm === `go to ${kw}` ||
      norm === `show ${kw}` ||
      norm === `take me to ${kw}`
    ) {
      return true;
    }
  }

  return false;
}
