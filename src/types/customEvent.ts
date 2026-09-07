import type { TimetableEntry } from './domain'

export type AcademicEventType =
  | 'Lecture'
  | 'Practical'
  | 'Lab'
  | 'Tutorial'
  | 'Assignment'
  | 'Exam'
  | 'Seminar'
  | 'Presentation'
  | 'Project'
  | 'Study Session'
  | 'Meeting'
  | 'Personal'
  | 'Holiday'

export interface CustomTimetableEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  location?: string
  description?: string
  reminder?: boolean
  repeat?: 'none' | 'weekly' | 'daily'
  color?: string
  eventType: AcademicEventType
  completed?: boolean
  createdAt: string
}

export interface BreakPeriod {
  id: string
  startTime: string
  endTime: string
  durationMinutes: number
  label: string
  isLunch?: boolean
}

export interface SubjectAttendance {
  subjectId: string
  subjectName: string
  attendedClasses: number
  totalClasses: number
  percentage: number
  isLowAttendance: boolean // < 75%
  lastAttendedDate?: string
}

export type SmartDayPhase =
  | 'morning'        // Before first class starts
  | 'live_lecture'   // A class is currently running
  | 'break'          // Currently in a break/gap between classes
  | 'completed'      // All classes for today have ended
  | 'holiday'        // Today is an official holiday
  | 'no_classes'     // No classes scheduled for today

export interface ScheduleItem {
  type: 'class' | 'break' | 'custom_event'
  startTime: string
  endTime: string
  data: TimetableEntry | BreakPeriod | CustomTimetableEvent
}
