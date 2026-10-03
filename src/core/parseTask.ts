import { addDays, localDay } from './today'

// Quick add that reads the words people type (spec quick-add-words). "Call mum tomorrow 5pm #Home" becomes the title
// "Call mum", due tomorrow at 17:00, in the project Home. Pure, so it can be tested; the clock and the project names
// come in as arguments.
//
// What it understands, anywhere in the text, case does not matter:
//   days:   today, tonight (today, 20:00 unless a time is given), tomorrow, tmr, tmrw; weekday names (the next one,
//           never today); their three letter forms only after on, by or due, or right before a time ("fri 5pm");
//           "next <weekday>" (the one after that week's), "next week" (next Monday), "in N days", "in N weeks";
//           dates like "5 oct", "oct 5th", "5 october 2027"; "5/10" day first, as in India, when nothing but a date
//           word follows it (so "24/7 support" stays a title) or when on, by or due comes before it
//   times:  5pm, 5:30 pm, 17:00 (two digit hour), "at 9:15", "at 5" at the end or before a day word (1 to 6 means
//           afternoon, 7 to 11 morning), noon, midnight
//   project: "#Name" matched to an existing project by name (spaces optional, "#bigideas" finds "Big ideas"), the
//           shortest name that starts with it wins; an unknown "#word" stays in the title
// Only whole words are read, never part of one ("today's" stays). One of each kind, the first typed. A task never
// ends up without a title. Words that were read are reported, so the UI can show them.

export type ParsedTask = {
  title: string
  dueDate: string | null
  dueTime: string | null
  projectId: string | null
  tokens: { kind: 'date' | 'time' | 'project'; text: string; label: string }[]
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')
const dayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const weekdayIndex = (word: string) => {
  const w = word.toLowerCase()
  return WEEKDAYS.findIndex((d) => d === w || d.slice(0, 3) === w)
}
const monthIndex = (word: string) => {
  const w = word.toLowerCase().replace(/\.$/, '')
  if (w.length < 3) return -1
  return MONTHS.findIndex((m) => m.startsWith(w))
}

export function dateLabel(iso: string, now: Date): string {
  const today = localDay(now)
  if (iso === today) return 'Today'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  const d = dayOf(iso)
  const base = `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`
}

export function timeLabelOf(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${m ? `:${pad(m)}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

// The next date with this weekday, never today ("friday" said on a Friday means next week's).
function nextWeekday(now: Date, index: number): string {
  const today = localDay(now)
  const diff = (index - now.getDay() + 7) % 7 || 7
  return addDays(today, diff)
}

// A day and month with an optional year; without a year, the next time that date comes (today counts).
function calendarDate(now: Date, day: number, month: number, year?: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const y = year ?? now.getFullYear()
  const d = new Date(y, month, day)
  if (d.getMonth() !== month) return null // 31 feb
  const iso = `${d.getFullYear()}-${pad(month + 1)}-${pad(day)}`
  if (year === undefined && iso < localDay(now)) return `${y + 1}-${pad(month + 1)}-${pad(day)}`
  return iso
}

type Hit = { start: number; end: number; kind: 'date' | 'time' | 'project'; value: string; text: string }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export function parseTask(input: string, now: Date, projects: { id: string; name: string }[] = []): ParsedTask {
  const text = input
  const hits: Hit[] = []
  const taken = (start: number, end: number) => hits.some((h) => start < h.end && end > h.start)
  const add = (re: RegExp, kind: Hit['kind'], value: (m: RegExpExecArray) => string | null) => {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const start = m.index + (m[0].length - m[0].trimStart().length)
      const end = m.index + m[0].length
      if (taken(start, end)) continue
      const v = value(m)
      if (v) hits.push({ start, end, kind, value: v, text: text.slice(start, end) })
    }
  }
  const B = '(?<![\\w#])' // start of a word
  const E = "(?![\\w'’])" // end of a word (and not "today's")

  // Projects first, so "#Mon" is a project and not Monday.
  add(new RegExp(`${B}#([\\w-]+)`, 'gi'), 'project', (m) => {
    const want = norm(m[1])
    const exact = projects.find((p) => norm(p.name) === want)
    const prefix = projects.filter((p) => norm(p.name).startsWith(want)).sort((a, b) => a.name.length - b.name.length)
    return (exact ?? prefix[0])?.id ?? null
  })

  // Times.
  const toHHMM = (h: number, m: number) => (h > 23 || m > 59 ? null : `${pad(h)}:${pad(m)}`)
  add(new RegExp(`${B}(?:at\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s?(am|pm)${E}`, 'gi'), 'time', (m) => {
    let h = Number(m[1])
    if (h < 1 || h > 12) return null
    if (m[3].toLowerCase() === 'pm' && h !== 12) h += 12
    if (m[3].toLowerCase() === 'am' && h === 12) h = 0
    return toHHMM(h, Number(m[2] ?? 0))
  })
  // 17:00 or 09:15 (two digit hour), or "at 9:15"; a lone "3:16" is a verse or a ratio, not a time.
  add(new RegExp(`${B}(?:at\\s+([01]?\\d|2[0-3])|([01]\\d|2[0-3])):([0-5]\\d)${E}`, 'gi'), 'time', (m) =>
    toHHMM(Number(m[1] ?? m[2]), Number(m[3])),
  )
  // "at 5" only at the end, or right before a day ("call at 5 tomorrow"); "look at 5 options" stays a title.
  const DAY_WORD =
    '(?:today|tomorrow|tmrw|tmr|tonight|on|next|in|by|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)'
  add(new RegExp(`${B}at\\s+(\\d{1,2})(?=\\s*$|\\s+${DAY_WORD}${E}|\\s+#)`, 'gi'), 'time', (m) => {
    const h = Number(m[1])
    if (h < 1 || h > 12) return null
    return toHHMM(h <= 6 ? h + 12 : h === 12 ? 12 : h, 0)
  })
  add(new RegExp(`${B}(?:at\\s+)?noon${E}`, 'gi'), 'time', () => '12:00')
  add(new RegExp(`${B}(?:at\\s+)?midnight${E}`, 'gi'), 'time', () => '00:00')

  // Days.
  const today = localDay(now)
  add(new RegExp(`${B}today${E}`, 'gi'), 'date', () => today)
  add(new RegExp(`${B}tonight${E}`, 'gi'), 'date', () => today)
  add(new RegExp(`${B}(tomorrow|tmrw|tmr)${E}`, 'gi'), 'date', () => addDays(today, 1))
  add(new RegExp(`${B}next\\s+week${E}`, 'gi'), 'date', () => nextWeekday(now, 1))
  add(new RegExp(`${B}in\\s+(\\d{1,3})\\s+(day|days|week|weeks)${E}`, 'gi'), 'date', (m) =>
    addDays(today, Number(m[1]) * (m[2].toLowerCase().startsWith('week') ? 7 : 1)),
  )
  add(new RegExp(`${B}next\\s+([a-z]+)${E}`, 'gi'), 'date', (m) => {
    const i = weekdayIndex(m[1])
    return i < 0 ? null : addDays(nextWeekday(now, i), 7)
  })
  // "5 oct", "5 october 2027", "5th oct"
  add(new RegExp(`${B}(\\d{1,2})(?:st|nd|rd|th)?\\s+([a-z]{3,9})\\.?(?:\\s+(\\d{4}))?${E}`, 'gi'), 'date', (m) => {
    const mi = monthIndex(m[2])
    return mi < 0 ? null : calendarDate(now, Number(m[1]), mi, m[3] ? Number(m[3]) : undefined)
  })
  // "oct 5", "october 5th 2027"
  add(new RegExp(`${B}([a-z]{3,9})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?${E}`, 'gi'), 'date', (m) => {
    const mi = monthIndex(m[1])
    return mi < 0 ? null : calendarDate(now, Number(m[2]), mi, m[3] ? Number(m[3]) : undefined)
  })
  // "5/10", "5/10/2027", day first; not when a word follows ("24/7 support", "rate 4/5 stars") unless "on" or "by"
  // comes before it
  add(new RegExp(`${B}(?:(?:on|by|due)\\s+)?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?${E}`, 'gi'), 'date', (m) => {
    const marked = /^(on|by|due)\s/i.test(m[0])
    const after = text.slice(m.index + m[0].length)
    if (!marked && !m[3] && /^\s+[a-z0-9]/i.test(after)) return null
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined
    return calendarDate(now, Number(m[1]), Number(m[2]) - 1, y)
  })
  // Weekdays: the full name anywhere ("gym monday"); the short form ("fri") only after on, by or due, or right before a
  // time, so "apply sun cream" and "SAT prep" stay titles.
  add(
    new RegExp(`${B}(?:(?:on|by|due)\\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)${E}`, 'gi'),
    'date',
    (m) => nextWeekday(now, weekdayIndex(m[1])),
  )
  add(new RegExp(`${B}(?:on|by|due)\\s+(sun|mon|tue|wed|thu|fri|sat)${E}`, 'gi'), 'date', (m) =>
    nextWeekday(now, weekdayIndex(m[1])),
  )
  add(
    new RegExp(
      `${B}(sun|mon|tue|wed|thu|fri|sat)(?=\\s+(?:at\\s+)?\\d{1,2}(?::\\d{2})?\\s?(?:am|pm)?(?![\\w/]))`,
      'gi',
    ),
    'date',
    (m) => nextWeekday(now, weekdayIndex(m[1])),
  )

  // One of each kind: the first one typed wins, the rest stay in the title.
  const kept: Hit[] = []
  for (const h of [...hits].sort((a, b) => a.start - b.start)) {
    if (!kept.some((k) => k.kind === h.kind)) kept.push(h)
  }

  // Take the words out of the title; tidy the spaces and any dangling "at" or "on" or "by".
  let title = text
  for (const h of [...kept].sort((a, b) => b.start - a.start)) title = title.slice(0, h.start) + title.slice(h.end)
  title = title
    .replace(/\s+/g, ' ')
    .replace(/\s+(at|on|by|due)\s*$/i, '')
    .trim()

  // Never leave a task without a title: if everything was read as a date or time, keep the text as typed.
  if (!title) return { title: text.trim(), dueDate: null, dueTime: null, projectId: null, tokens: [] }

  const date = kept.find((h) => h.kind === 'date')
  const time = kept.find((h) => h.kind === 'time')
  const project = kept.find((h) => h.kind === 'project')
  const tonight = date && /tonight/i.test(date.text)
  // A time with no day means today if it is still ahead, otherwise tomorrow.
  const dueTime = time?.value ?? (tonight ? '20:00' : null)
  let dueDate = date?.value ?? null
  if (!dueDate && dueTime) {
    const [h, m] = dueTime.split(':').map(Number)
    dueDate = h * 60 + m > now.getHours() * 60 + now.getMinutes() ? today : addDays(today, 1)
  }
  const tokens: ParsedTask['tokens'] = []
  if (dueDate) tokens.push({ kind: 'date', text: date?.text ?? '', label: dateLabel(dueDate, now) })
  if (dueTime) tokens.push({ kind: 'time', text: time?.text ?? '', label: timeLabelOf(dueTime) })
  if (project) {
    const p = projects.find((x) => x.id === project.value)
    tokens.push({ kind: 'project', text: project.text, label: p ? p.name : project.text })
  }
  return { title, dueDate, dueTime, projectId: project?.value ?? null, tokens }
}

// The toast after adding: what was added and where it went, so a read word is never a surprise.
//   Added "Call mum" · Tomorrow, 5 PM · Home
export function addedMessage(
  task: { title: string; dueDate: string | null; dueTime: string | null },
  now: Date,
  projectName?: string,
): string {
  const when = task.dueDate
    ? `${dateLabel(task.dueDate, now)}${task.dueTime ? `, ${timeLabelOf(task.dueTime)}` : ''}`
    : ''
  return [`Added "${task.title}"`, when, projectName ?? ''].filter(Boolean).join(' · ')
}
