import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  FileText,
  BookOpen,
  MessageCircle,
  ChevronRight,
  Coffee,
  AlertCircle,
  CheckCircle2,
  Check,
  Plus,
  Radio,
  Flame,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import type { TimetableEntry } from '../../types/domain'
import {
  timeToMinutes,
  formatTimeTo12Hour,
  getCurrentDayMinutes,
  detectBreaks,
  calculateClassProgress,
  getSmartDayState,
  getSubjectAttendanceData
} from '../../services/timetable/timetableUtils'
import './StudentDashboardView.css'

interface StudentTask {
  id: string
  title: string
  completed: boolean
  dueDate?: string
}

const DEFAULT_TASKS: StudentTask[] = [
  { id: 'task-1', title: 'Review Web Development practical notes', completed: false },
  { id: 'task-2', title: 'Complete Data Structures assignment #2', completed: true },
  { id: 'task-3', title: 'Prepare questions for Operating Systems doubt session', completed: false }
]

export const StudentDashboardView: React.FC = () => {
  const { currentUser, data, resolveTodaySchedule, notify } = useApp()

  // Live minutes ticker for real-time accuracy
  const [nowMinutes, setNowMinutes] = useState<number>(getCurrentDayMinutes())
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMinutes(getCurrentDayMinutes())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Today's schedule resolved via AppProvider
  const todayResolved = resolveTodaySchedule(currentUser)
  const isHoliday = todayResolved.isHoliday
  const holidayName = todayResolved.holidayName
  const todayClasses: TimetableEntry[] = useMemo(() => {
    return (todayResolved.entries || []).sort(
      (a: TimetableEntry, b: TimetableEntry) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    )
  }, [todayResolved.entries])

  // Smart day state calculation
  const dayState = useMemo(() => {
    return getSmartDayState(todayClasses, isHoliday, nowMinutes)
  }, [todayClasses, isHoliday, nowMinutes])

  // Breaks between classes
  const todayBreaks = useMemo(() => {
    return detectBreaks(todayClasses)
  }, [todayClasses])

  // Attendance stats
  const attendanceData = useMemo(() => {
    return getSubjectAttendanceData()
  }, [])

  // Interactive student tasks (persisted in localStorage)
  const [tasks, setTasks] = useState<StudentTask[]>(() => {
    try {
      const stored = localStorage.getItem('edupulse_student_tasks')
      return stored ? JSON.parse(stored) : DEFAULT_TASKS
    } catch {
      return DEFAULT_TASKS
    }
  })
  const [newTaskInput, setNewTaskInput] = useState('')

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    setTasks(updated)
    try {
      localStorage.setItem('edupulse_student_tasks', JSON.stringify(updated))
    } catch (e) {
      console.warn(e)
    }
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskInput.trim()) return
    const newTask: StudentTask = {
      id: `task-${Date.now()}`,
      title: newTaskInput.trim(),
      completed: false,
    }
    const updated = [...tasks, newTask]
    setTasks(updated)
    try {
      localStorage.setItem('edupulse_student_tasks', JSON.stringify(updated))
    } catch (e) {
      console.warn(e)
    }
    setNewTaskInput('')
    notify('Task added to your daily focus list', 'success')
  }

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = tasks.filter((t) => t.id !== id)
    setTasks(updated)
    try {
      localStorage.setItem('edupulse_student_tasks', JSON.stringify(updated))
    } catch (err) {
      console.warn(err)
    }
  }

  // Greeting & Date formatting
  const todayFormatted = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [])

  const greetingTime = useMemo(() => {
    const hours = new Date().getHours()
    if (hours < 12) return 'Good morning'
    if (hours < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const pendingAssignments = (data.assignments || []).filter((a) => a.status === 'Pending')
  const urgentAssignment = pendingAssignments[0]

  // Find lowest attendance subject for warning banner
  const lowAttendanceSubject = attendanceData.subjects.find((s) => s.isLowAttendance || s.percentage < 75)

  return (
    <div className="student-db-root">
      {/* 1. HERO GREETING WITH LIVE CONTEXT */}
      <section className="student-db-hero">
        <div className="student-db-hero__greeting">
          <div className="student-db-eyebrow">
            <CalendarDays size={14} />
            <span>{todayFormatted}</span>
          </div>
          <h1>
            {greetingTime}, {currentUser?.name?.split(' ')[0] ?? 'Student'} 👋
          </h1>
          <p>
            {isHoliday
              ? `Campus Holiday: ${holidayName || 'All sessions suspended'}`
              : `You have ${todayClasses.length} lectures scheduled for today in ${currentUser?.course || 'BSc IT'}.`}
          </p>
        </div>

        <div className="student-db-hero__actions">
          <Link to="/student/timetable" className="student-db-btn student-db-btn--primary">
            <Clock3 size={16} /> My Timetable
          </Link>
          <Link to="/student/doubts" className="student-db-btn student-db-btn--secondary">
            <MessageCircle size={16} /> Ask Doubt
          </Link>
        </div>
      </section>

      {/* 2. SMART DAY STATE BANNER & TODAY'S PROGRESS BAR */}
      <section className={`student-db-smart-banner student-db-smart-banner--${dayState.phase}`}>
        <div className="student-db-smart-banner__left">
          <div className="student-db-banner-icon">
            {dayState.phase === 'live_lecture' && <Radio size={22} className="animate-pulse" />}
            {dayState.phase === 'break' && <Coffee size={22} />}
            {dayState.phase === 'completed' && <CheckCircle2 size={22} />}
            {dayState.phase === 'holiday' && <Sparkles size={22} />}
            {dayState.phase === 'morning' && <Clock3 size={22} />}
            {dayState.phase === 'no_classes' && <Sparkles size={22} />}
          </div>
          <div className="student-db-banner-texts">
            <h3>{dayState.headline}</h3>
            <p>{dayState.subtitle}</p>
          </div>
        </div>

        {!isHoliday && dayState.totalCount > 0 && (
          <div className="student-db-banner-progress">
            <div className="student-db-banner-progress__label">
              <span>Today's Classes</span>
              <span>{dayState.completedCount} / {dayState.totalCount} Done ({dayState.progressPercent}%)</span>
            </div>
            <div className="student-db-banner-progress__bar">
              <div
                className="student-db-banner-progress__fill"
                style={{ width: `${dayState.progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 3. METRIC SUMMARY ROW */}
      <div className="student-db-metrics">
        <div className="student-db-metric-card">
          <div className="student-db-metric-icon student-db-metric-icon--indigo">
            <CalendarDays size={22} />
          </div>
          <div className="student-db-metric-content">
            <span className="student-db-metric-label">Today's Classes</span>
            <span className="student-db-metric-val">
              {isHoliday ? 'Holiday' : `${todayClasses.length}`}
            </span>
            <span className="student-db-metric-sub">
              {isHoliday ? (holidayName || 'Holiday') : `${todayClasses.filter((e) => e.status === 'Cancelled').length} cancelled`}
            </span>
          </div>
        </div>

        <div className="student-db-metric-card">
          <div className="student-db-metric-icon student-db-metric-icon--cyan">
            <Clock3 size={22} />
          </div>
          <div className="student-db-metric-content">
            <span className="student-db-metric-label">Active / Next Class</span>
            <span className="student-db-metric-val" style={{ fontSize: '1.2rem', marginTop: '2px' }}>
              {dayState.activeClass
                ? (dayState.activeClass.subjectName || dayState.activeClass.subject)
                : dayState.nextClass
                ? (dayState.nextClass.subjectName || dayState.nextClass.subject)
                : 'All Done'}
            </span>
            <span className="student-db-metric-sub">
              {dayState.activeClass
                ? `Live in Room ${dayState.activeClass.room}`
                : dayState.nextClass
                ? `Starts at ${formatTimeTo12Hour(dayState.nextClass.startTime)} (${dayState.nextClass.room})`
                : 'No more classes today'}
            </span>
          </div>
        </div>

        <div className="student-db-metric-card">
          <div className="student-db-metric-icon student-db-metric-icon--emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="student-db-metric-content">
            <span className="student-db-metric-label">Overall Attendance</span>
            <span className="student-db-metric-val">
              {attendanceData.overallPercentage}%
            </span>
            <span className="student-db-metric-sub" style={{ color: lowAttendanceSubject ? '#f87171' : undefined }}>
              {lowAttendanceSubject ? '⚠️ 1 Subject below 75%' : 'Safe academic standing'}
            </span>
          </div>
        </div>

        <div className="student-db-metric-card">
          <div className="student-db-metric-icon student-db-metric-icon--amber">
            <FileText size={22} />
          </div>
          <div className="student-db-metric-content">
            <span className="student-db-metric-label">Pending Work</span>
            <span className="student-db-metric-val">{pendingAssignments.length}</span>
            <span className="student-db-metric-sub">
              {urgentAssignment ? `Due ${urgentAssignment.dueDate}` : 'All caught up'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN LAYOUT */}
      <div className="student-db-main-grid">
        {/* LEFT COLUMN: TODAY'S TIMELINE + TASKS */}
        <div className="student-db-col">
          {/* Today's Schedule Card */}
          <div className="student-db-card">
            <div className="student-db-card-header">
              <h2>
                <Clock3 size={18} style={{ color: 'var(--primary, #6366f1)' }} />
                Today's Schedule
              </h2>
              <Link to="/student/timetable" className="student-db-card-link">
                <span>Full Timetable</span>
                <ChevronRight size={15} />
              </Link>
            </div>

            {isHoliday ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
                <p>Campus Holiday today: {holidayName || 'All academic lectures suspended'}.</p>
              </div>
            ) : todayClasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
                <p>No classes scheduled for today. Enjoy your day off!</p>
              </div>
            ) : (
              <div className="student-db-timeline">
                {todayClasses.map((entry) => {
                  const isCancelled = entry.status === 'Cancelled'
                  const isSubstitute = Boolean(entry.substituteTeacherName)
                  const prog = calculateClassProgress(entry.startTime, entry.endTime, nowMinutes)

                  // Check if there is a break before this class
                  const breakBefore = todayBreaks.find((b) => b.endTime === entry.startTime)

                  return (
                    <React.Fragment key={entry.id}>
                      {breakBefore && (
                        <div className="student-db-timeline-item student-db-timeline-item--break">
                          <Coffee size={14} style={{ color: '#f59e0b', marginTop: '2px' }} />
                          <div className="student-db-timeline-details">
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}>
                              {breakBefore.label} ({breakBefore.durationMinutes} mins)
                            </span>
                            <span className="student-db-timeline-sub">
                              {formatTimeTo12Hour(breakBefore.startTime)} – {formatTimeTo12Hour(breakBefore.endTime)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div
                        className={`student-db-timeline-item ${prog.isLive ? 'student-db-timeline-item--live' : ''} ${isCancelled ? 'student-db-timeline-item--cancelled' : ''}`}
                      >
                        <div className="student-db-timeline-time">
                          <span>{formatTimeTo12Hour(entry.startTime)}</span>
                          <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>{formatTimeTo12Hour(entry.endTime)}</span>
                        </div>

                        <div className="student-db-timeline-details">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span className="student-db-timeline-subject">
                              {entry.subjectName || entry.subject}
                            </span>
                            {prog.isLive && (
                              <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="student-tt-pulse-dot" /> LIVE
                              </span>
                            )}
                            {isCancelled && (
                              <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                                Cancelled
                              </span>
                            )}
                          </div>

                          <span className="student-db-timeline-sub">
                            Room {entry.room || 'TBA'} · {isSubstitute ? `${entry.substituteTeacherName} (Sub)` : (entry.teacherName || entry.teacher)}
                            {entry.type ? ` · ${entry.type}` : ''}
                          </span>

                          {entry.reason && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '2px' }}>
                              Note: {entry.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            )}
          </div>

          {/* Daily Quick Task Checklist */}
          <div className="student-db-card">
            <div className="student-db-card-header">
              <h2>
                <CheckCircle2 size={18} style={{ color: 'var(--cyan-accent, #06b6d4)' }} />
                Daily Focus Checklist
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {tasks.filter((t) => t.completed).length} of {tasks.length} done
              </span>
            </div>

            <div className="student-db-tasks">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`student-db-task-item ${task.completed ? 'student-db-task-item--done' : ''}`}
                  onClick={() => handleToggleTask(task.id)}
                >
                  <div className="student-db-task-checkbox">
                    {task.completed && <Check size={12} />}
                  </div>
                  <span className="student-db-task-title">{task.title}</span>
                  <button
                    className="student-tt-del-btn"
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    title="Delete task"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddTask} className="student-db-task-input-row">
              <input
                type="text"
                placeholder="+ Add a study goal or homework for today..."
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                className="student-db-task-input"
              />
              <button type="submit" className="student-db-btn student-db-btn--primary" style={{ padding: '8px 14px' }}>
                <Plus size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: ATTENDANCE ALERT + ASSIGNMENT + MATERIALS */}
        <div className="student-db-col">
          {/* Attendance Health Alert Card */}
          <div className="student-db-card">
            <div className="student-db-card-header">
              <h2>
                <Flame size={18} style={{ color: '#f59e0b' }} />
                Attendance Monitor
              </h2>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: attendanceData.overallPercentage >= 75 ? '#34d399' : '#f87171' }}>
                {attendanceData.overallPercentage}% Overall
              </span>
            </div>

            {lowAttendanceSubject && (
              <div className="student-db-att-alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>{lowAttendanceSubject.subjectName} is at {Math.round(lowAttendanceSubject.percentage)}%</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                    Your attendance is below the 75% required threshold. Make sure to attend the upcoming lectures.
                  </p>
                </div>
              </div>
            )}

            <div className="student-db-att-list">
              {attendanceData.subjects.slice(0, 4).map((s) => (
                <div className="student-db-att-row" key={s.subjectId}>
                  <span>{s.subjectName}</span>
                  <span className={`student-db-att-row__pct ${s.isLowAttendance ? 'student-db-att-row__pct--low' : ''}`}>
                    {Math.round(s.percentage)}% ({s.attendedClasses}/{s.totalClasses})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Assignment Highlight */}
          <div className="student-db-card">
            <div className="student-db-card-header">
              <h2>
                <FileText size={18} style={{ color: '#818cf8' }} />
                Upcoming Work
              </h2>
              <Link to="/student/assignments" className="student-db-card-link">
                <span>All ({pendingAssignments.length})</span>
                <ChevronRight size={15} />
              </Link>
            </div>

            {urgentAssignment ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main, #f3f4f6)' }}>
                  {urgentAssignment.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted, #9ca3af)' }}>
                  {urgentAssignment.subject} · {urgentAssignment.teacher}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#f59e0b', marginTop: '4px' }}>
                  <Clock3 size={14} />
                  <span>Due date: {urgentAssignment.dueDate}</span>
                </div>
                <Link
                  to={`/student/assignments/${urgentAssignment.id}`}
                  className="student-db-btn student-db-btn--primary"
                  style={{ marginTop: '8px', justifyContent: 'center' }}
                >
                  <span>Submit Assignment</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No pending assignments right now. All caught up!
              </p>
            )}
          </div>

          {/* Latest Campus Notices Card */}
          <div className="student-db-card">
            <div className="student-db-card-header">
              <h2>
                <BookOpen size={18} style={{ color: '#34d399' }} />
                Campus Notices
              </h2>
              <Link to="/student/notices" className="student-db-card-link">
                <span>View All</span>
                <ChevronRight size={15} />
              </Link>
            </div>

            {(data.announcements || []).slice(0, 3).map((notice) => (
              <div
                key={notice.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main, #f3f4f6)' }}>
                    {notice.title}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{notice.date}</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {notice.postedBy} · {notice.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
