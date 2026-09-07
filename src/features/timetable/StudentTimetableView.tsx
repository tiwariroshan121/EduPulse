import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Coffee,
  BookOpen,
  CalendarDays,
  Sparkles,
  ArrowLeft,
  X,
  Layers,
  Info,
  Trash2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppProvider'
import type { TimetableEntry } from '../../types/domain'
import type { AcademicEventType, CustomTimetableEvent } from '../../types/customEvent'
import {
  timeToMinutes,
  formatTimeTo12Hour,
  getCurrentDayMinutes,
  detectBreaks,
  calculateClassProgress,
  findLiveAndNextClass,
  getSubjectAttendanceData,
  loadCustomEvents,
  saveCustomEvents,
  getMergedDaySchedule,
  courseMatches,
  semesterMatches,
  divisionMatches
} from '../../services/timetable/timetableUtils'
import './StudentTimetableView.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
type DayName = typeof DAYS[number]

export const StudentTimetableView: React.FC = () => {
  const { currentUser, timetableEntries, data, notify } = useApp()

  // State: Simple Table vs Day Detail view
  const [viewMode, setViewMode] = useState<'table' | 'day_detail'>('table')
  
  // Today's real weekday
  const todayWeekday = useMemo(() => {
    const raw = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayName
    return DAYS.includes(raw) ? raw : 'Monday'
  }, [])

  const [selectedDay, setSelectedDay] = useState<DayName>(todayWeekday)
  const [weekOffset, setWeekOffset] = useState<number>(0)
  const [nowMinutes, setNowMinutes] = useState<number>(getCurrentDayMinutes())

  // Custom events state
  const [customEvents, setCustomEvents] = useState<CustomTimetableEvent[]>(() => loadCustomEvents())
  const [showAddModal, setShowAddModal] = useState<boolean>(false)

  // Add event form fields
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventType, setNewEventType] = useState<AcademicEventType>('Study Session')
  const [newEventStartTime, setNewEventStartTime] = useState('14:00')
  const [newEventEndTime, setNewEventEndTime] = useState('15:00')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventDescription, setNewEventDescription] = useState('')

  // Live timer tick every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMinutes(getCurrentDayMinutes())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Calculate week dates based on weekOffset
  const weekDates = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDay()
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday + weekOffset * 7)

    return DAYS.map((dayName, idx) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + idx)
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const dateStr = `${yyyy}-${mm}-${dd}`
      const isToday = weekOffset === 0 && dayName === todayWeekday
      return {
        dayName,
        dateStr,
        dayNum: date.getDate(),
        monthShort: date.toLocaleDateString('en-US', { month: 'short' }),
        fullDateFormatted: date.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        isToday,
      }
    })
  }, [weekOffset, todayWeekday])

  const selectedDateObj = useMemo(() => {
    return weekDates.find((w) => w.dayName === selectedDay) || weekDates[0]
  }, [weekDates, selectedDay])

  // Filter student timetable entries for current user course/sem/div
  const studentEntries = useMemo(() => {
    const all: TimetableEntry[] = (timetableEntries && timetableEntries.length > 0)
      ? timetableEntries
      : (data?.timetableEntries && data.timetableEntries.length > 0)
      ? data.timetableEntries
      : ((data as any)?.timetable || [])

    if (!currentUser) return all

    return all.filter((entry: TimetableEntry) => {
      const cMatch = courseMatches(entry.course, currentUser.course)
      const sMatch = semesterMatches(entry.semester, currentUser.semester)
      const dMatch = divisionMatches(entry.division, currentUser.division)
      return cMatch && sMatch && dMatch
    })
  }, [timetableEntries, data, currentUser])

  // Classes for the selected day
  const dayClasses = useMemo(() => {
    return studentEntries
      .filter((entry: TimetableEntry) => (entry.dayOfWeek || entry.day) === selectedDay)
      .sort((a: TimetableEntry, b: TimetableEntry) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  }, [studentEntries, selectedDay])

  // Breaks for selected day
  const dayBreaks = useMemo(() => {
    return detectBreaks(dayClasses)
  }, [dayClasses])

  // Merged timeline (classes, breaks, custom events)
  const mergedSchedule = useMemo(() => {
    return getMergedDaySchedule(dayClasses, customEvents, selectedDateObj.dateStr)
  }, [dayClasses, customEvents, selectedDateObj.dateStr])

  // Attendance stats
  const attendanceData = useMemo(() => {
    return getSubjectAttendanceData()
  }, [])

  // Live / Next class spotlight for today
  const isSelectedDayToday = selectedDateObj.isToday
  const { liveClass, nextClass, nextStartsInMinutes } = useMemo(() => {
    if (!isSelectedDayToday) return { liveClass: null, nextClass: null, nextStartsInMinutes: null }
    return findLiveAndNextClass(dayClasses, nowMinutes)
  }, [isSelectedDayToday, dayClasses, nowMinutes])

  // Progress for live class
  const liveClassProgress = useMemo(() => {
    if (!liveClass) return null
    return calculateClassProgress(liveClass.startTime, liveClass.endTime, nowMinutes)
  }, [liveClass, nowMinutes])

  // Handle adding personal event
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventTitle.trim()) {
      notify('Please enter an event title', 'error')
      return
    }

    const newEv: CustomTimetableEvent = {
      id: `custom-${Date.now()}`,
      title: newEventTitle.trim(),
      eventType: newEventType,
      date: selectedDateObj.dateStr,
      startTime: newEventStartTime,
      endTime: newEventEndTime,
      location: newEventLocation.trim() || undefined,
      description: newEventDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
      completed: false,
    }

    const updated = [...customEvents, newEv]
    setCustomEvents(updated)
    saveCustomEvents(updated)
    setShowAddModal(false)

    // Reset form
    setNewEventTitle('')
    setNewEventLocation('')
    setNewEventDescription('')
    notify(`Added personal event: "${newEv.title}"`, 'success')
  }

  const handleDeleteCustomEvent = (id: string) => {
    const updated = customEvents.filter((ev) => ev.id !== id)
    setCustomEvents(updated)
    saveCustomEvents(updated)
    notify('Personal event removed', 'info')
  }

  // Week range label e.g. "01 Sep – 06 Sep 2026"
  const weekRangeLabel = useMemo(() => {
    const first = weekDates[0]
    const last = weekDates[weekDates.length - 1]
    return `${first.dayNum} ${first.monthShort} – ${last.dayNum} ${last.monthShort}`
  }, [weekDates])

  return (
    <div className="student-tt-root">
      {/* 1. TOP HEADER & WEEK NAVIGATION */}
      <div className="student-tt-topbar">
        <div className="student-tt-topbar__left">
          <div className="student-tt-badge">
            <CalendarDays size={14} />
            <span>Academic Timetable</span>
          </div>
          <h1 className="student-tt-title">
            {viewMode === 'table' ? 'College Schedule' : `${selectedDay} Detail`}
          </h1>
          <p className="student-tt-subtitle">
            {currentUser?.course ? `${currentUser.course} · Sem ${currentUser.semester || 2} · Div ${currentUser.division || 'A'}` : 'Semester Schedule'}
          </p>
        </div>

        <div className="student-tt-topbar__right">
          {/* Week Navigation */}
          <div className="student-tt-week-nav">
            <button
              className="student-tt-nav-btn"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="student-tt-week-label">
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `Week ${weekOffset > 0 ? `+${weekOffset}` : weekOffset}`}
              <small className="student-tt-week-dates">({weekRangeLabel})</small>
            </span>
            <button
              className="student-tt-nav-btn"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
            {weekOffset !== 0 && (
              <button
                className="student-tt-today-btn"
                onClick={() => {
                  setWeekOffset(0)
                  setSelectedDay(todayWeekday)
                }}
              >
                Today
              </button>
            )}
          </div>

          {/* View Mode Toggle Pill */}
          <div className="student-tt-view-toggle">
            <button
              className={`student-tt-toggle-btn ${viewMode === 'table' ? 'student-tt-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <Layers size={14} />
              <span>Simple Table</span>
            </button>
            <button
              className={`student-tt-toggle-btn ${viewMode === 'day_detail' ? 'student-tt-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('day_detail')}
            >
              <Clock size={14} />
              <span>Day Detail</span>
            </button>
          </div>

          {/* Add Personal Event Button */}
          <button
            className="student-tt-add-btn"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* 2. DAY SELECTOR PILLS (MON - SAT) */}
      <div className="student-tt-day-pills">
        {weekDates.map((item) => {
          const isSelected = item.dayName === selectedDay
          return (
            <button
              key={item.dayName}
              className={`student-tt-day-pill ${isSelected ? 'student-tt-day-pill--active' : ''} ${item.isToday ? 'student-tt-day-pill--today' : ''}`}
              onClick={() => {
                setSelectedDay(item.dayName)
              }}
            >
              <span className="student-tt-day-pill__name">{item.dayName.slice(0, 3).toUpperCase()}</span>
              <span className="student-tt-day-pill__num">{item.dayNum}</span>
              {item.isToday && <span className="student-tt-day-pill__dot" title="Today" />}
            </button>
          )
        })}
      </div>

      {/* 3. CONDITIONAL CONTENT: SIMPLE TABLE vs DAY DETAIL */}
      {viewMode === 'table' ? (
        /* SIMPLE TABLE VIEW */
        <div className="student-tt-table-container">
          <div className="student-tt-table-header-row">
            <div>
              <h2 className="student-tt-section-title">
                {selectedDay} Timetable
              </h2>
              <p className="student-tt-section-desc">
                {selectedDateObj.fullDateFormatted} · {dayClasses.length} {dayClasses.length === 1 ? 'Class' : 'Classes'}
                {dayBreaks.length > 0 ? ` · ${dayBreaks.length} Break` : ''}
              </p>
            </div>
            <button
              className="student-tt-detail-link"
              onClick={() => setViewMode('day_detail')}
            >
              <span>Open Day Detail & Live View</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {dayClasses.length === 0 ? (
            <div className="student-tt-empty-state">
              <Calendar size={36} className="student-tt-empty-icon" />
              <h3>No classes scheduled for {selectedDay}</h3>
              <p>Enjoy your free time or schedule a personal study session.</p>
              <button
                className="student-tt-btn-secondary"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} /> Add Personal Study Event
              </button>
            </div>
          ) : (
            <div className="student-tt-table-wrapper">
              <table className="student-tt-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>TIME</th>
                    <th style={{ width: '32%' }}>SUBJECT & TYPE</th>
                    <th style={{ width: '22%' }}>FACULTY</th>
                    <th style={{ width: '13%' }}>ROOM</th>
                    <th style={{ width: '15%' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedSchedule.map((item, idx) => {
                    if (item.type === 'break') {
                      const b = item.data as any
                      return (
                        <tr key={`break-${idx}`} className="student-tt-row--break">
                          <td className="student-tt-time-col">
                            <Clock size={13} className="student-tt-inline-icon" />
                            <span>{formatTimeTo12Hour(b.startTime)} – {formatTimeTo12Hour(b.endTime)}</span>
                          </td>
                          <td colSpan={4} className="student-tt-break-col">
                            <div className="student-tt-break-cell">
                              <Coffee size={15} className="student-tt-break-icon" />
                              <span className="student-tt-break-title">{b.label}</span>
                              <span className="student-tt-break-duration">({b.durationMinutes} min free period)</span>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    if (item.type === 'custom_event') {
                      const ev = item.data as CustomTimetableEvent
                      return (
                        <tr key={ev.id} className="student-tt-row--custom">
                          <td className="student-tt-time-col">
                            <Clock size={13} className="student-tt-inline-icon" />
                            <span>{formatTimeTo12Hour(ev.startTime)} – {formatTimeTo12Hour(ev.endTime)}</span>
                          </td>
                          <td>
                            <div className="student-tt-subject-cell">
                              <span className="student-tt-subject-name">{ev.title}</span>
                              <span className="student-tt-type-pill student-tt-type-pill--custom">{ev.eventType}</span>
                            </div>
                          </td>
                          <td className="student-tt-faculty-cell">
                            <User size={13} className="student-tt-inline-icon" />
                            <span>Personal Event</span>
                          </td>
                          <td>
                            <span className="student-tt-room-pill">{ev.location || 'Campus / Self'}</span>
                          </td>
                          <td>
                            <div className="student-tt-status-cell">
                              <span className="student-tt-status-badge student-tt-status-badge--custom">Self</span>
                              <button
                                className="student-tt-del-event-btn"
                                onClick={() => handleDeleteCustomEvent(ev.id)}
                                title="Remove Event"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    // Standard Timetable Class
                    const entry = item.data as TimetableEntry
                    const isCancelled = entry.status === 'Cancelled'
                    const isSubstitute = Boolean(entry.substituteTeacherName)
                    const subjectAtt = attendanceData.subjects.find((s) => s.subjectName.toLowerCase() === (entry.subjectName || '').toLowerCase())

                    return (
                      <tr
                        key={entry.id}
                        className={`student-tt-row ${isCancelled ? 'student-tt-row--cancelled' : ''}`}
                        onClick={() => setViewMode('day_detail')}
                        title="Click to view full Day Detail"
                      >
                        <td className="student-tt-time-col">
                          <Clock size={13} className="student-tt-inline-icon" />
                          <span>{formatTimeTo12Hour(entry.startTime)} – {formatTimeTo12Hour(entry.endTime)}</span>
                        </td>
                        <td>
                          <div className="student-tt-subject-cell">
                            <span className={`student-tt-subject-name ${isCancelled ? 'student-tt-cancelled-text' : ''}`}>
                              {entry.subjectName || entry.subject}
                            </span>
                            <span className={`student-tt-type-pill student-tt-type-pill--${(entry.type || 'Lecture').toLowerCase()}`}>
                              {entry.type || 'Lecture'}
                            </span>
                            {subjectAtt && (
                              <span className={`student-tt-att-mini ${subjectAtt.isLowAttendance ? 'student-tt-att-mini--low' : ''}`}>
                                {Math.round(subjectAtt.percentage)}% att.
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="student-tt-faculty-cell">
                          <User size={13} className="student-tt-inline-icon" />
                          <span>{entry.substituteTeacherName ? `${entry.substituteTeacherName} (Sub)` : (entry.teacherName || entry.teacher)}</span>
                        </td>
                        <td>
                          <span className="student-tt-room-pill">
                            <MapPin size={11} className="student-tt-inline-icon" />
                            {entry.room || 'TBA'}
                          </span>
                        </td>
                        <td>
                          {isCancelled ? (
                            <span className="student-tt-status-badge student-tt-status-badge--cancelled">
                              Cancelled
                            </span>
                          ) : isSubstitute ? (
                            <span className="student-tt-status-badge student-tt-status-badge--substitute">
                              Substitute
                            </span>
                          ) : (
                            <span className="student-tt-status-badge student-tt-status-badge--scheduled">
                              Scheduled
                            </span>
                          )}
                          {entry.reason && (
                            <div className="student-tt-reason-subtext">{entry.reason}</div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Notice footer */}
          <div className="student-tt-table-hint">
            <Info size={14} />
            <span>Click any class row or switch to <strong>Day Detail</strong> to see live lecture progress, countdowns, and notes.</span>
          </div>
        </div>
      ) : (
        /* DAY DETAIL VIEW (Advanced Experience) */
        <div className="student-tt-detail-container">
          {/* Back button & Day headline */}
          <div className="student-tt-detail-bar">
            <button
              className="student-tt-back-btn"
              onClick={() => setViewMode('table')}
            >
              <ArrowLeft size={16} />
              <span>Back to Simple Table</span>
            </button>
            <div className="student-tt-detail-meta">
              <span className="student-tt-detail-date">{selectedDateObj.fullDateFormatted}</span>
              <span className="student-tt-detail-count">{dayClasses.length} Classes</span>
            </div>
          </div>

          {/* SPOTLIGHT SECTION: If viewing today */}
          {isSelectedDayToday && (
            <div className="student-tt-spotlight-section">
              {liveClass && liveClassProgress && (
                <div className="student-tt-live-spotlight">
                  <div className="student-tt-live-spotlight__top">
                    <div className="student-tt-live-pulse-badge">
                      <span className="student-tt-pulse-dot" />
                      <strong>LIVE LECTURE NOW</strong>
                    </div>
                    <span className="student-tt-live-time">
                      {formatTimeTo12Hour(liveClass.startTime)} – {formatTimeTo12Hour(liveClass.endTime)}
                    </span>
                  </div>

                  <div className="student-tt-live-spotlight__body">
                    <div className="student-tt-live-info">
                      <h3 className="student-tt-live-title">{liveClass.subjectName || liveClass.subject}</h3>
                      <div className="student-tt-live-tags">
                        <span className="student-tt-room-pill student-tt-room-pill--lg">
                          <MapPin size={13} /> {liveClass.room || 'Room TBA'}
                        </span>
                        <span className="student-tt-teacher-pill">
                          <User size={13} /> {liveClass.substituteTeacherName || liveClass.teacherName || liveClass.teacher}
                        </span>
                        <span className="student-tt-type-pill student-tt-type-pill--live">
                          {liveClass.type || 'Lecture'}
                        </span>
                      </div>
                    </div>

                    <div className="student-tt-live-progress-box">
                      <div className="student-tt-progress-header">
                        <span>Class Progress</span>
                        <strong>{liveClassProgress.progressPercent}%</strong>
                      </div>
                      <div className="student-tt-progress-bar">
                        <div
                          className="student-tt-progress-fill"
                          style={{ width: `${liveClassProgress.progressPercent}%` }}
                        />
                      </div>
                      <div className="student-tt-progress-footer">
                        <span>{liveClassProgress.elapsedMinutes} mins elapsed</span>
                        <span className="student-tt-highlight-remaining">{liveClassProgress.remainingMinutes} mins left</span>
                      </div>
                    </div>
                  </div>

                  <div className="student-tt-live-actions">
                    <Link to="/student/notes" className="student-tt-action-btn">
                      <BookOpen size={14} /> Subject Materials
                    </Link>
                    <Link to="/student/doubts" className="student-tt-action-btn">
                      <Sparkles size={14} /> Ask Doubt to Teacher
                    </Link>
                  </div>
                </div>
              )}

              {!liveClass && nextClass && nextStartsInMinutes !== null && (
                <div className="student-tt-next-spotlight">
                  <div className="student-tt-next-spotlight__left">
                    <div className="student-tt-next-countdown-badge">
                      <Clock size={15} />
                      <span>Starts in {nextStartsInMinutes} minutes</span>
                    </div>
                    <h4>{nextClass.subjectName || nextClass.subject}</h4>
                    <p>
                      {formatTimeTo12Hour(nextClass.startTime)} · Room {nextClass.room || 'TBA'} · {nextClass.teacherName || nextClass.teacher}
                    </p>
                  </div>
                  <div className="student-tt-next-spotlight__right">
                    <span className="student-tt-type-pill student-tt-type-pill--lg">
                      {nextClass.type || 'Lecture'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CURRENT TIME INDICATOR BAR */}
          {isSelectedDayToday && (
            <div className="student-tt-current-time-line">
              <span className="student-tt-time-line-badge">
                <span className="student-tt-pulse-dot student-tt-pulse-dot--small" />
                Current Time: {formatTimeTo12Hour(new Date().toTimeString().slice(0, 5))}
              </span>
              <div className="student-tt-time-line-rule" />
            </div>
          )}

          {/* DETAILED TIMELINE CARDS */}
          <div className="student-tt-detail-timeline">
            {mergedSchedule.map((item, idx) => {
              if (item.type === 'break') {
                const b = item.data as any
                return (
                  <div key={`detail-break-${idx}`} className="student-tt-break-card">
                    <div className="student-tt-break-card__icon">
                      <Coffee size={20} />
                    </div>
                    <div className="student-tt-break-card__info">
                      <div className="student-tt-break-card__header">
                        <strong>{b.label}</strong>
                        <span>{formatTimeTo12Hour(b.startTime)} – {formatTimeTo12Hour(b.endTime)}</span>
                      </div>
                      <p>{b.durationMinutes} minutes free period · Great time for canteen lunch, study, or club tasks.</p>
                    </div>
                  </div>
                )
              }

              if (item.type === 'custom_event') {
                const ev = item.data as CustomTimetableEvent
                return (
                  <div key={ev.id} className="student-tt-card student-tt-card--custom">
                    <div className="student-tt-card__time">
                      <span className="student-tt-time-badge student-tt-time-badge--custom">
                        {formatTimeTo12Hour(ev.startTime)} – {formatTimeTo12Hour(ev.endTime)}
                      </span>
                      <span className="student-tt-custom-badge">{ev.eventType}</span>
                    </div>
                    <div className="student-tt-card__content">
                      <div className="student-tt-card__title-row">
                        <h3>{ev.title}</h3>
                        <button
                          className="student-tt-del-btn"
                          onClick={() => handleDeleteCustomEvent(ev.id)}
                          title="Remove personal event"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {ev.description && <p className="student-tt-custom-desc">{ev.description}</p>}
                      <div className="student-tt-card__meta">
                        {ev.location && (
                          <span className="student-tt-meta-pill">
                            <MapPin size={12} /> {ev.location}
                          </span>
                        )}
                        <span className="student-tt-meta-pill">
                          <CheckCircle2 size={12} /> Personal Schedule
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }

              // Standard Timetable Class
              const entry = item.data as TimetableEntry
              const isCancelled = entry.status === 'Cancelled'
              const isSubstitute = Boolean(entry.substituteTeacherName)
              const prog = isSelectedDayToday ? calculateClassProgress(entry.startTime, entry.endTime, nowMinutes) : null
              const subjectAtt = attendanceData.subjects.find((s) => s.subjectName.toLowerCase() === (entry.subjectName || '').toLowerCase())

              return (
                <div
                  key={entry.id}
                  className={`student-tt-card ${isCancelled ? 'student-tt-card--cancelled' : ''} ${prog?.isLive ? 'student-tt-card--live' : ''}`}
                >
                  <div className="student-tt-card__time">
                    <span className="student-tt-time-badge">
                      {formatTimeTo12Hour(entry.startTime)} – {formatTimeTo12Hour(entry.endTime)}
                    </span>
                    <span className={`student-tt-type-pill student-tt-type-pill--${(entry.type || 'Lecture').toLowerCase()}`}>
                      {entry.type || 'Lecture'}
                    </span>
                    {prog?.isLive && (
                      <span className="student-tt-live-pill">
                        <span className="student-tt-pulse-dot" /> LIVE
                      </span>
                    )}
                  </div>

                  <div className="student-tt-card__content">
                    <div className="student-tt-card__title-row">
                      <h3 className={isCancelled ? 'student-tt-cancelled-text' : ''}>
                        {entry.subjectName || entry.subject}
                      </h3>
                      {isCancelled ? (
                        <span className="student-tt-status-badge student-tt-status-badge--cancelled">Cancelled</span>
                      ) : isSubstitute ? (
                        <span className="student-tt-status-badge student-tt-status-badge--substitute">Substitute Teacher</span>
                      ) : (
                        <span className="student-tt-status-badge student-tt-status-badge--scheduled">Scheduled</span>
                      )}
                    </div>

                    {entry.reason && (
                      <div className="student-tt-card__alert">
                        <AlertCircle size={14} />
                        <span>{entry.reason}</span>
                      </div>
                    )}

                    <div className="student-tt-card__meta">
                      <span className="student-tt-meta-pill">
                        <User size={13} />
                        {entry.substituteTeacherName ? `${entry.substituteTeacherName} (Substitute)` : (entry.teacherName || entry.teacher)}
                      </span>
                      <span className="student-tt-meta-pill">
                        <MapPin size={13} /> Room {entry.room || 'TBA'}
                      </span>
                      {subjectAtt && (
                        <span className={`student-tt-meta-pill ${subjectAtt.isLowAttendance ? 'student-tt-meta-pill--danger' : 'student-tt-meta-pill--success'}`}>
                          {subjectAtt.isLowAttendance ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                          Attendance: {Math.round(subjectAtt.percentage)}% ({subjectAtt.attendedClasses}/{subjectAtt.totalClasses})
                        </span>
                      )}
                    </div>

                    {prog?.isLive && (
                      <div className="student-tt-inline-progress">
                        <div className="student-tt-inline-progress__bar">
                          <div className="student-tt-inline-progress__fill" style={{ width: `${prog.progressPercent}%` }} />
                        </div>
                        <small>{prog.remainingMinutes} min remaining</small>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. ADD PERSONAL EVENT MODAL */}
      {showAddModal && (
        <div className="student-tt-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="student-tt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="student-tt-modal__header">
              <div className="student-tt-modal__title">
                <Sparkles size={18} className="student-tt-modal-icon" />
                <h3>Add Personal Academic Event</h3>
              </div>
              <button className="student-tt-modal__close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="student-tt-modal__form">
              <div className="student-tt-field">
                <label>Event Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Algo Lab Practice, Study Group, Project Meet"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  required
                />
              </div>

              <div className="student-tt-form-row">
                <div className="student-tt-field">
                  <label>Event Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as AcademicEventType)}
                  >
                    <option value="Study Session">Study Session</option>
                    <option value="Lab">Lab Practice</option>
                    <option value="Project">Project Discussion</option>
                    <option value="Assignment">Assignment Work</option>
                    <option value="Exam">Exam Prep</option>
                    <option value="Meeting">Meeting / Club</option>
                    <option value="Personal">Personal Task</option>
                  </select>
                </div>

                <div className="student-tt-field">
                  <label>Date</label>
                  <input
                    type="text"
                    value={selectedDateObj.dateStr}
                    disabled
                    className="student-tt-input--disabled"
                  />
                </div>
              </div>

              <div className="student-tt-form-row">
                <div className="student-tt-field">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={newEventStartTime}
                    onChange={(e) => setNewEventStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="student-tt-field">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={newEventEndTime}
                    onChange={(e) => setNewEventEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="student-tt-field">
                <label>Location / Room</label>
                <input
                  type="text"
                  placeholder="e.g. Central Library 2nd floor, Campus Garden"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                />
              </div>

              <div className="student-tt-field">
                <label>Notes / Goal (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Complete Binary Tree traversal assignment questions"
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                />
              </div>

              <div className="student-tt-modal__footer">
                <button
                  type="button"
                  className="student-tt-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-tt-btn-primary"
                >
                  Save to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
