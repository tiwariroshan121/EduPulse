import type { TimetableEntry } from '../../types/domain'
import type { BreakPeriod, CustomTimetableEvent, ScheduleItem, SmartDayPhase, SubjectAttendance } from '../../types/customEvent'

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.trim().split(':')
  if (parts.length < 2) return 0
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m)
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatTimeTo12Hour(time24: string): string {
  if (!time24) return ''
  const parts = time24.trim().split(':')
  if (parts.length < 2) return time24
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1].slice(0, 2)
  if (isNaN(hours)) return time24
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`
}

export function getCurrentDayMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * Detects breaks and free periods between scheduled classes
 */
export function detectBreaks(entries: TimetableEntry[]): BreakPeriod[] {
  const valid = entries
    .filter((e) => e.status !== 'Cancelled' && e.startTime && e.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const breaks: BreakPeriod[] = []

  for (let i = 0; i < valid.length - 1; i++) {
    const currentEnd = timeToMinutes(valid[i].endTime)
    const nextStart = timeToMinutes(valid[i + 1].startTime)
    const diff = nextStart - currentEnd

    // Gaps of 10 minutes or more qualify as breaks
    if (diff >= 10) {
      const isLunch = currentEnd >= 12 * 60 && currentEnd < 14 * 60 && diff >= 30
      breaks.push({
        id: `break-${valid[i].id}-${valid[i + 1].id}`,
        startTime: valid[i].endTime,
        endTime: valid[i + 1].startTime,
        durationMinutes: diff,
        label: isLunch ? 'Lunch Break' : diff >= 45 ? 'Free Period' : 'Recess / Break',
        isLunch,
      })
    }
  }

  return breaks
}

/**
 * Calculates live class progress and remaining time
 */
export function calculateClassProgress(
  startTime: string,
  endTime: string,
  nowMinutes: number = getCurrentDayMinutes()
): {
  isLive: boolean
  isCompleted: boolean
  isUpcoming: boolean
  progressPercent: number
  remainingMinutes: number
  elapsedMinutes: number
} {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const duration = Math.max(1, end - start)

  if (nowMinutes < start) {
    return {
      isLive: false,
      isCompleted: false,
      isUpcoming: true,
      progressPercent: 0,
      remainingMinutes: duration,
      elapsedMinutes: 0,
    }
  }

  if (nowMinutes >= end) {
    return {
      isLive: false,
      isCompleted: true,
      isUpcoming: false,
      progressPercent: 100,
      remainingMinutes: 0,
      elapsedMinutes: duration,
    }
  }

  const elapsed = nowMinutes - start
  const remaining = end - nowMinutes
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)))

  return {
    isLive: true,
    isCompleted: false,
    isUpcoming: false,
    progressPercent,
    remainingMinutes: remaining,
    elapsedMinutes: elapsed,
  }
}

/**
 * Identifies currently active lecture and the next upcoming lecture
 */
export function findLiveAndNextClass(
  entries: TimetableEntry[],
  nowMinutes: number = getCurrentDayMinutes()
): {
  liveClass: TimetableEntry | null
  nextClass: TimetableEntry | null
  nextStartsInMinutes: number | null
} {
  const activeEntries = entries
    .filter((e) => e.status !== 'Cancelled' && e.startTime && e.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  let liveClass: TimetableEntry | null = null
  let nextClass: TimetableEntry | null = null
  let minNextDiff = Infinity

  for (const entry of activeEntries) {
    const s = timeToMinutes(entry.startTime)
    const e = timeToMinutes(entry.endTime)

    if (nowMinutes >= s && nowMinutes < e) {
      liveClass = entry
    } else if (s > nowMinutes) {
      const diff = s - nowMinutes
      if (diff < minNextDiff) {
        minNextDiff = diff
        nextClass = entry
      }
    }
  }

  return {
    liveClass,
    nextClass,
    nextStartsInMinutes: minNextDiff !== Infinity ? minNextDiff : null,
  }
}

/**
 * Determines the intelligent day phase for the dashboard
 */
export function getSmartDayState(
  entries: TimetableEntry[],
  isHoliday: boolean,
  nowMinutes: number = getCurrentDayMinutes()
): {
  phase: SmartDayPhase
  headline: string
  subtitle: string
  completedCount: number
  totalCount: number
  progressPercent: number
  activeClass: TimetableEntry | null
  nextClass: TimetableEntry | null
  currentBreak: BreakPeriod | null
} {
  if (isHoliday) {
    return {
      phase: 'holiday',
      headline: 'Campus Holiday Today 🏖',
      subtitle: 'All academic lecture sessions are suspended. Take time to relax or work on personal projects.',
      completedCount: 0,
      totalCount: 0,
      progressPercent: 0,
      activeClass: null,
      nextClass: null,
      currentBreak: null,
    }
  }

  const validEntries = entries
    .filter((e) => e.status !== 'Cancelled' && e.startTime && e.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const totalCount = validEntries.length

  if (totalCount === 0) {
    return {
      phase: 'no_classes',
      headline: 'No Classes Scheduled Today 🎉',
      subtitle: 'Your schedule is completely clear for the day.',
      completedCount: 0,
      totalCount: 0,
      progressPercent: 100,
      activeClass: null,
      nextClass: null,
      currentBreak: null,
    }
  }

  let completedCount = 0
  for (const entry of validEntries) {
    if (nowMinutes >= timeToMinutes(entry.endTime)) {
      completedCount++
    }
  }

  const progressPercent = Math.round((completedCount / totalCount) * 100)
  const { liveClass, nextClass, nextStartsInMinutes } = findLiveAndNextClass(validEntries, nowMinutes)
  const breaks = detectBreaks(validEntries)

  const currentBreak = breaks.find((b) => {
    const s = timeToMinutes(b.startTime)
    const e = timeToMinutes(b.endTime)
    return nowMinutes >= s && nowMinutes < e
  }) || null

  const firstClassStart = timeToMinutes(validEntries[0].startTime)
  const lastClassEnd = timeToMinutes(validEntries[validEntries.length - 1].endTime)

  if (nowMinutes < firstClassStart) {
    const diff = firstClassStart - nowMinutes
    return {
      phase: 'morning',
      headline: `Good Morning 👋 You have ${totalCount} class${totalCount === 1 ? '' : 'es'} today`,
      subtitle: `First lecture starts in ${diff > 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff} minutes`} (${formatTimeTo12Hour(validEntries[0].startTime)}).`,
      completedCount: 0,
      totalCount,
      progressPercent: 0,
      activeClass: null,
      nextClass: validEntries[0],
      currentBreak: null,
    }
  }

  if (liveClass) {
    const prog = calculateClassProgress(liveClass.startTime, liveClass.endTime, nowMinutes)
    return {
      phase: 'live_lecture',
      headline: `🔴 Lecture Live: ${liveClass.subjectName || liveClass.subject}`,
      subtitle: `Room ${liveClass.room || 'TBA'} · ${prog.remainingMinutes} minutes remaining.`,
      completedCount,
      totalCount,
      progressPercent,
      activeClass: liveClass,
      nextClass,
      currentBreak: null,
    }
  }

  if (currentBreak) {
    const remaining = timeToMinutes(currentBreak.endTime) - nowMinutes
    const nextSubject = nextClass ? (nextClass.subjectName || nextClass.subject) : 'your next session'
    return {
      phase: 'break',
      headline: `☕ ${currentBreak.label}: You are currently free`,
      subtitle: `${remaining} minutes free until ${nextSubject} at ${formatTimeTo12Hour(currentBreak.endTime)}.`,
      completedCount,
      totalCount,
      progressPercent,
      activeClass: null,
      nextClass,
      currentBreak,
    }
  }

  if (nowMinutes >= lastClassEnd) {
    return {
      phase: 'completed',
      headline: '🎉 All Classes Completed for Today!',
      subtitle: 'Great job today! You have completed all scheduled academic lectures.',
      completedCount: totalCount,
      totalCount,
      progressPercent: 100,
      activeClass: null,
      nextClass: null,
      currentBreak: null,
    }
  }

  return {
    phase: 'morning',
    headline: `Today\'s Academic Progress: ${completedCount} / ${totalCount} Completed`,
    subtitle: nextClass
      ? `Next class starts in ${nextStartsInMinutes} min (${formatTimeTo12Hour(nextClass.startTime)}).`
      : 'All remaining classes are completed.',
    completedCount,
    totalCount,
    progressPercent,
    activeClass: null,
    nextClass,
    currentBreak: null,
  }
}

/**
 * Calculates subject-level and overall attendance records
 */
const ATTENDANCE_STORAGE_KEY = 'edupulse_student_attendance'

const defaultSubjectAttendance: SubjectAttendance[] = [
  {
    subjectId: 'sub-1',
    subjectName: 'Data Structures',
    attendedClasses: 25,
    totalClasses: 30,
    percentage: 83.3,
    isLowAttendance: false,
    lastAttendedDate: 'Yesterday',
  },
  {
    subjectId: 'sub-2',
    subjectName: 'Operating Systems',
    attendedClasses: 23,
    totalClasses: 26,
    percentage: 88.5,
    isLowAttendance: false,
    lastAttendedDate: 'Today',
  },
  {
    subjectId: 'sub-3',
    subjectName: 'Java Programming',
    attendedClasses: 26,
    totalClasses: 30,
    percentage: 86.7,
    isLowAttendance: false,
    lastAttendedDate: '04 Sep 2026',
  },
  {
    subjectId: 'sub-4',
    subjectName: 'Web Development',
    attendedClasses: 19,
    totalClasses: 28,
    percentage: 67.9,
    isLowAttendance: true, // Warning: < 75%
    lastAttendedDate: '02 Sep 2026',
  },
  {
    subjectId: 'sub-5',
    subjectName: 'Database Management Systems',
    attendedClasses: 26,
    totalClasses: 31,
    percentage: 83.9,
    isLowAttendance: false,
    lastAttendedDate: 'Yesterday',
  },
  {
    subjectId: 'sub-6',
    subjectName: 'Computer Networks',
    attendedClasses: 22,
    totalClasses: 27,
    percentage: 81.5,
    isLowAttendance: false,
    lastAttendedDate: '03 Sep 2026',
  },
]

export function getSubjectAttendanceData(): {
  subjects: SubjectAttendance[]
  overallPercentage: number
  lowAttendanceCount: number
} {
  try {
    const stored = localStorage.getItem(ATTENDANCE_STORAGE_KEY)
    const list: SubjectAttendance[] = stored ? JSON.parse(stored) : defaultSubjectAttendance

    const totalAttended = list.reduce((sum, s) => sum + s.attendedClasses, 0)
    const totalConducted = list.reduce((sum, s) => sum + s.totalClasses, 0)
    const overallPercentage = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 1000) / 10 : 85

    const lowAttendanceCount = list.filter((s) => s.isLowAttendance || s.percentage < 75).length

    return {
      subjects: list,
      overallPercentage,
      lowAttendanceCount,
    }
  } catch {
    return {
      subjects: defaultSubjectAttendance,
      overallPercentage: 82.0,
      lowAttendanceCount: 1,
    }
  }
}

/**
 * Custom student timetable events storage
 */
const CUSTOM_EVENTS_STORAGE_KEY = 'edupulse_custom_timetable_events'

export function loadCustomEvents(): CustomTimetableEvent[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomEvents(events: CustomTimetableEvent[]): void {
  try {
    localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(events))
  } catch (err) {
    console.warn('Failed to save custom timetable events:', err)
  }
}

/**
 * Merges scheduled classes, breaks, and custom events into a unified chronological schedule
 */
export function getMergedDaySchedule(
  classes: TimetableEntry[],
  customEvents: CustomTimetableEvent[],
  targetDate: string
): ScheduleItem[] {
  const items: ScheduleItem[] = []

  // 1. Scheduled Classes
  for (const c of classes) {
    if (!c.startTime || !c.endTime) continue
    items.push({
      type: 'class',
      startTime: c.startTime,
      endTime: c.endTime,
      data: c,
    })
  }

  // 2. Custom Events for this date
  const eventsForDate = customEvents.filter((ev) => ev.date === targetDate)
  for (const ev of eventsForDate) {
    items.push({
      type: 'custom_event',
      startTime: ev.startTime,
      endTime: ev.endTime,
      data: ev,
    })
  }

  // Sort chronologically
  items.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  // 3. Detect and insert breaks between class items
  const breaks = detectBreaks(classes)
  for (const b of breaks) {
    items.push({
      type: 'break',
      startTime: b.startTime,
      endTime: b.endTime,
      data: b,
    })
  }

  // Final sort by start time
  items.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  return items
}

export function courseMatches(courseA?: string, courseB?: string): boolean {
  if (!courseA || !courseB) return true
  const a = courseA.trim().toLowerCase()
  const b = courseB.trim().toLowerCase()
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  const simplify = (s: string) =>
    s
      .replace(/information\s*technology/gi, 'it')
      .replace(/computer\s*science/gi, 'cs')
      .replace(/data\s*science/gi, 'ds')
      .replace(/bachelor\s*of\s*commerce/gi, 'bcom')
      .replace(/bachelor\s*of\s*computer\s*applications/gi, 'bca')
      .replace(/b\.?sc\.?/gi, '')
      .replace(/[^a-z0-9]/g, '')
  return simplify(a) === simplify(b)
}

export function semesterMatches(semA?: string, semB?: string): boolean {
  if (!semA || !semB) return true
  return semA.trim() === semB.trim()
}

export function divisionMatches(divA?: string, divB?: string): boolean {
  if (!divA || !divB) return true
  return divA.trim().toUpperCase() === divB.trim().toUpperCase()
}

