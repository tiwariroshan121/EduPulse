import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  CornerDownRight,
  Download,
  Eye,
  FileText,
  FileUp,
  GraduationCap,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  User as UserIcon,
  UserCheck,
  Users,
  UserX,
  X,
  ZoomIn,
  ZoomOut,
  BookOpen,
  Edit3,
  Archive,
  Layers,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppProvider'
import { Button, Card, EmptyState, Modal, SectionHeading } from '../../components/common/UI'
import type {
  Course,
  AcademicClass,
  TeacherLeave,
  TeacherLeaveStatus,
  TeacherLeaveType,
  TimetableDocument,
  TimetableEntry,
  TimetableEntryStatus,
  User,
} from '../../types/domain'
import './TimetableView.css'

interface TimetableViewProps {
  mode: 'student' | 'teacher' | 'admin'
  defaultClass?: {
    course: string
    semester: string
    division: string
  }
  defaultTab?: string
}

const DAYS_OF_WEEK: Array<TimetableEntry['dayOfWeek']> = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const COURSES = [
  'BSc Information Technology',
  'BSc Computer Science',
  'Bachelor of Computer Applications (BCA)',
]

const SEMESTERS = ['1', '2', '3', '4', '5', '6']
const DIVISIONS = ['A', 'B', 'C']
const STANDARD_ROOMS = [
  'Lab 101',
  'Lab 102',
  'Room 201',
  'Room 202',
  'Room 301',
  'Room 302',
  'Auditorium',
]

function getTodayISODate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDayOfWeekFromDate(dateStr: string): TimetableEntry['dayOfWeek'] {
  const safeStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`
  const d = new Date(safeStr)
  const days: Array<TimetableEntry['dayOfWeek']> = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
  const idx = d.getDay()
  return days[idx] || 'Monday'
}

function formatTimeTo12Hour(time24: string): string {
  if (!time24) return ''
  const parts = time24.split(':')
  if (parts.length < 2) return time24
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`
}

function formatReadableDate(dateStr: string): string {
  const safeStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`
  const d = new Date(safeStr)
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function courseMatches(courseA?: string, courseB?: string): boolean {
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

function semesterMatches(semA?: string, semB?: string): boolean {
  if (!semA || !semB) return true
  return semA.trim() === semB.trim()
}

function divisionMatches(divA?: string, divB?: string): boolean {
  if (!divA || !divB) return true
  return divA.trim().toUpperCase() === divB.trim().toUpperCase()
}

function parseTimeToMinutes(timeStr?: string, fallback: number = 540): number {
  if (!timeStr) return fallback
  const clean = timeStr.trim()
  const parts = clean.split(':')
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m
    }
  }
  return fallback
}

function getEntryMinutes(entry: TimetableEntry): { startMin: number; endMin: number } {
  if (entry.startTime && entry.endTime) {
    const s = parseTimeToMinutes(entry.startTime, 540)
    const e = parseTimeToMinutes(entry.endTime, s + 60)
    return { startMin: s, endMin: Math.max(e, s + 30) }
  }
  if (entry.time) {
    const parts = entry.time.split(/[-–—]/)
    if (parts.length >= 2) {
      const s = parseTimeToMinutes(parts[0].trim(), 540)
      const e = parseTimeToMinutes(parts[1].trim(), s + 60)
      return { startMin: s, endMin: Math.max(e, s + 30) }
    }
  }
  return { startMin: 540, endMin: 600 }
}

const HOUR_HEIGHT = 80

const STATUS_TONE: Record<
  TimetableEntryStatus,
  'scheduled' | 'cancelled' | 'rescheduled' | 'substitute' | 'room_changed'
> = {
  Scheduled: 'scheduled',
  Cancelled: 'cancelled',
  Rescheduled: 'rescheduled',
  Substitute: 'substitute',
  Room_Changed: 'room_changed',
  Special: 'scheduled',
}

interface PositionedLecture {
  entry: TimetableEntry
  top: number
  height: number
  leftPercent: number
  widthPercent: number
}

function layoutDayLectures(
  entries: TimetableEntry[],
  minHour: number,
  hourHeight: number
): PositionedLecture[] {
  if (!entries.length) return []

  // 1. Deduplicate entries by unique ID or signature
  const seen = new Set<string>()
  const uniqueEntries: TimetableEntry[] = []
  for (const e of entries) {
    const key = e.id || `${e.dayOfWeek}_${e.startTime}_${e.endTime}_${e.subjectName || e.subject}_${e.teacherId}_${e.classId}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueEntries.push(e)
    }
  }

  // 2. Map entries to timeline minutes
  const items = uniqueEntries.map((entry, idx) => {
    const { startMin, endMin } = getEntryMinutes(entry)
    const validEnd = Math.max(endMin, startMin + 30)
    return {
      index: idx,
      entry,
      startMin,
      endMin: validEnd,
      duration: validEnd - startMin,
    }
  })

  // Sort chronologically: earlier start first, longer duration first
  items.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin))

  // 3. Cluster overlapping items (Connected components in interval graph)
  const clusters: Array<typeof items> = []
  let currentCluster: typeof items = []
  let currentClusterEnd = -1

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item)
      currentClusterEnd = item.endMin
    } else if (item.startMin < currentClusterEnd) {
      // Overlaps with the current cluster
      currentCluster.push(item)
      if (item.endMin > currentClusterEnd) {
        currentClusterEnd = item.endMin
      }
    } else {
      clusters.push(currentCluster)
      currentCluster = [item]
      currentClusterEnd = item.endMin
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster)
  }

  const result: PositionedLecture[] = []
  const pixelsPerMinute = hourHeight / 60

  // 4. Assign columns & calculate horizontal spans within each cluster
  for (const cluster of clusters) {
    const columns: Array<Array<(typeof items)[0]>> = []
    const itemToCol = new Map<number, number>()

    for (const item of cluster) {
      let placedCol = -1
      for (let c = 0; c < columns.length; c++) {
        // True interval overlap check with all items in column c
        const hasOverlap = columns[c].some(
          (other) => Math.max(item.startMin, other.startMin) < Math.min(item.endMin, other.endMin)
        )
        if (!hasOverlap) {
          placedCol = c
          columns[c].push(item)
          break
        }
      }
      if (placedCol === -1) {
        placedCol = columns.length
        columns.push([item])
      }
      itemToCol.set(item.index, placedCol)
    }

    const totalCols = columns.length
    const colWidth = 100 / totalCols

    for (const item of cluster) {
      const col = itemToCol.get(item.index) ?? 0

      // Dynamic column spanning: can this item span to adjacent vacant columns?
      let span = 1
      while (col + span < totalCols) {
        const nextColItems = columns[col + span]
        const hasCollision = nextColItems.some(
          (other) => Math.max(item.startMin, other.startMin) < Math.min(item.endMin, other.endMin)
        )
        if (hasCollision) break
        span++
      }

      const top = (item.startMin - minHour * 60) * pixelsPerMinute
      const height = Math.max(item.duration * pixelsPerMinute - 4, 48)
      const leftPercent = col * colWidth
      const widthPercent = span * colWidth

      result.push({
        entry: item.entry,
        top,
        height,
        leftPercent,
        widthPercent,
      })
    }
  }

  return result
}

export function TimetableView({ mode, defaultClass, defaultTab: propDefaultTab }: TimetableViewProps) {
  const {
    currentUser,
    data,
    courses,
    classes,
    createCourse,
    updateCourse,
    deleteCourse,
    archiveCourse,
    restoreCourse,
    createAcademicClass,
    updateAcademicClass,
    deleteAcademicClass,
    archiveAcademicClass,
    restoreAcademicClass,
    timetableDocuments,
    timetableEntries,
    holidays,
    teacherLeaves,
    subjects,
    uploadTimetableDocument,
    createTimetableEntry,
    deleteTimetableEntry,
    cancelLecture,
    rescheduleLecture,
    assignSubstituteTeacher,
    changeRoom,
    addHoliday,
    deleteHoliday,
    resolveTodaySchedule,
    createTeacherLeave,
    deleteTeacherLeave,
    endTeacherLeaveEarly,
    cancelLeaveAffectedLecture,
    substituteLeaveAffectedLecture,
    rescheduleLeaveAffectedLecture,
    cancelAllPendingAffectedLectures,
    restoreLecture,
    getTeacherAvailability,
    getAffectedLecturesForLeave,
    checkSubstituteConflict,
  } = useApp()

  // URL search params support (e.g. ?tab=leaves or ?tab=academic)
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Class Selection
  const [selectedCourse, setSelectedCourse] = useState<string>(
    defaultClass?.course || currentUser?.course || 'BSc Information Technology'
  )
  const [selectedSemester, setSelectedSemester] = useState<string>(
    defaultClass?.semester || currentUser?.semester || '2'
  )
  const [selectedDivision, setSelectedDivision] = useState<string>(
    defaultClass?.division || currentUser?.division || 'A'
  )
  const [selectedClassId, setSelectedClassId] = useState<string>(currentUser?.academicClassId || 'custom')

  // Sync selected class strictly with student profile when in student mode
  useEffect(() => {
    if (mode === 'student' && currentUser) {
      if (currentUser.course) setSelectedCourse(currentUser.course)
      if (currentUser.semester) setSelectedSemester(currentUser.semester)
      if (currentUser.division) setSelectedDivision(currentUser.division)
      if (currentUser.academicClassId) setSelectedClassId(currentUser.academicClassId)
    }
  }, [mode, currentUser])

  // Dynamic Course, Semester, Division options
  const dynamicCourses = useMemo(() => {
    const set = new Set<string>()
    COURSES.forEach((c) => set.add(c))
    ;(courses || []).forEach((c) => set.add(c.name))
    ;(classes || []).forEach((c) => set.add(c.courseName))
    ;(timetableEntries || []).forEach((e) => {
      if (e.course) set.add(e.course)
    })
    return Array.from(set)
  }, [courses, classes, timetableEntries])

  const dynamicSemesters = useMemo(() => {
    const set = new Set<string>(SEMESTERS)
    ;(classes || []).forEach((c) => {
      if (c.semester) set.add(c.semester)
    })
    ;(timetableEntries || []).forEach((e) => {
      if (e.semester) set.add(e.semester)
    })
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  }, [classes, timetableEntries])

  const dynamicDivisions = useMemo(() => {
    const set = new Set<string>(DIVISIONS)
    ;(classes || []).forEach((c) => {
      if (c.division) set.add(c.division.toUpperCase())
    })
    ;(timetableEntries || []).forEach((e) => {
      if (e.division) set.add(e.division.toUpperCase())
    })
    return Array.from(set).sort()
  }, [classes, timetableEntries])

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId)
    if (classId === 'custom') return
    const cls = (classes || []).find((c) => c.id === classId)
    if (cls) {
      setSelectedCourse(cls.courseName)
      setSelectedSemester(cls.semester)
      setSelectedDivision(cls.division)
    }
  }

  // Academic Structure State (Admin)
  const [academicSearchQuery, setAcademicSearchQuery] = useState<string>('')
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('2026-27')
  const [academicStatusFilter, setAcademicStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [academicSubTab, setAcademicSubTab] = useState<'tree' | 'classes' | 'courses'>('tree')

  // View Students Modal State
  const [viewStudentsClass, setViewStudentsClass] = useState<AcademicClass | null>(null)

  // View Subjects Modal State
  const [viewSubjectsClass, setViewSubjectsClass] = useState<AcademicClass | null>(null)

  // Add Course Modal
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState<boolean>(false)
  const [courseFormName, setCourseFormName] = useState<string>('')
  const [courseFormCode, setCourseFormCode] = useState<string>('')
  const [courseFormDepartment, setCourseFormDepartment] = useState<string>('Information Technology')
  const [courseFormDuration, setCourseFormDuration] = useState<number>(3)
  const [courseFormSemesters, setCourseFormSemesters] = useState<number>(6)
  const [courseFormError, setCourseFormError] = useState<string | null>(null)
  const [isSubmittingCourse, setIsSubmittingCourse] = useState<boolean>(false)

  // Edit Course Modal State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editCourseFormName, setEditCourseFormName] = useState<string>('')
  const [editCourseFormCode, setEditCourseFormCode] = useState<string>('')
  const [editCourseFormDepartment, setEditCourseFormDepartment] = useState<string>('Information Technology')
  const [editCourseFormDuration, setEditCourseFormDuration] = useState<number>(3)
  const [editCourseFormSemesters, setEditCourseFormSemesters] = useState<number>(6)
  const [editCourseFormStatus, setEditCourseFormStatus] = useState<'active' | 'archived'>('active')
  const [editCourseFormError, setEditCourseFormError] = useState<string | null>(null)
  const [isSubmittingEditCourse, setIsSubmittingEditCourse] = useState<boolean>(false)

  // Add Class Modal
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState<boolean>(false)
  const [classFormCourseName, setClassFormCourseName] = useState<string>('BSc IT')
  const [classFormYear, setClassFormYear] = useState<string>('FY')
  const [classFormSemester, setClassFormSemester] = useState<string>('2')
  const [classFormDivision, setClassFormDivision] = useState<string>('A')
  const [classFormName, setClassFormName] = useState<string>('')
  const [classFormAcademicYear, setClassFormAcademicYear] = useState<string>('2026-27')
  const [classFormError, setClassFormError] = useState<string | null>(null)
  const [isSubmittingClass, setIsSubmittingClass] = useState<boolean>(false)

  // Edit Class Modal State
  const [editingClass, setEditingClass] = useState<AcademicClass | null>(null)
  const [editClassFormName, setEditClassFormName] = useState<string>('')
  const [editClassFormDivision, setEditClassFormDivision] = useState<string>('A')
  const [editClassFormSemester, setEditClassFormSemester] = useState<string>('2')
  const [editClassFormYear, setEditClassFormYear] = useState<string>('FY')
  const [editClassFormAcademicYear, setEditClassFormAcademicYear] = useState<string>('2026-27')
  const [editClassFormStatus, setEditClassFormStatus] = useState<'active' | 'archived'>('active')
  const [editClassFormError, setEditClassFormError] = useState<string | null>(null)
  const [isSubmittingEditClass, setIsSubmittingEditClass] = useState<boolean>(false)

  // Active Tab
  const defaultTab = tabParam || propDefaultTab || 'weekly'
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  useEffect(() => {
    if (activeTab === 'create') {
      setIsAddLectureModalOpen(true)
      setActiveTab('weekly')
    }
  }, [activeTab])

  // Date Navigator State (For Today & Day view)
  const [navDate, setNavDate] = useState<string>(getTodayISODate())

  // Teacher Selection & Filtering (Defaults to 'all' for Master Comprehensive Faculty Timetable)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all')
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('')
  const [adminTimetableCategory, setAdminTimetableCategory] = useState<'class' | 'teacher'>('class')
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [timetableError, setTimetableError] = useState<string | null>(null)

  // Teacher Leave & Return Management State (Feature #21)
  const [leaveSearchQuery, setLeaveSearchQuery] = useState<string>('')
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | TeacherLeaveStatus>('all')
  const [leaveDeptFilter, setLeaveDeptFilter] = useState<string>('all')

  // Leave Creation Modal
  const [isAddLeaveModalOpen, setIsAddLeaveModalOpen] = useState<boolean>(false)
  const [leaveFormTeacherId, setLeaveFormTeacherId] = useState<string>('')
  const [leaveFormType, setLeaveFormType] = useState<TeacherLeaveType>('Full Day')
  const [leaveFormStartDate, setLeaveFormStartDate] = useState<string>(getTodayISODate())
  const [leaveFormEndDate, setLeaveFormEndDate] = useState<string>(getTodayISODate())
  const [leaveFormStartTime, setLeaveFormStartTime] = useState<string>('09:00')
  const [leaveFormEndTime, setLeaveFormEndTime] = useState<string>('12:00')
  const [leaveFormReason, setLeaveFormReason] = useState<string>('')
  const [leaveFormNotes, setLeaveFormNotes] = useState<string>('')
  const [leaveFormError, setLeaveFormError] = useState<string | null>(null)
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false)

  // Interactive Affected Lectures Management Modal
  const [affectedModalLeave, setAffectedModalLeave] = useState<TeacherLeave | null>(null)
  const [substitutePickerLecture, setSubstitutePickerLecture] = useState<any | null>(null)
  const [substituteTargetTeacherId, setSubstituteTargetTeacherId] = useState<string>('')
  const [substituteReasonNote, setSubstituteReasonNote] = useState<string>('')
  const [reschedulePickerLecture, setReschedulePickerLecture] = useState<any | null>(null)
  const [reschedulePickerDate, setReschedulePickerDate] = useState<string>(getTodayISODate())
  const [reschedulePickerStart, setReschedulePickerStart] = useState<string>('14:00')
  const [reschedulePickerEnd, setReschedulePickerEnd] = useState<string>('15:00')
  const [reschedulePickerRoom, setReschedulePickerRoom] = useState<string>('')
  const [reschedulePickerReason, setReschedulePickerReason] = useState<string>('')
  const [isHandlingAffectedAction, setIsHandlingAffectedAction] = useState<boolean>(false)

  // Early Return Confirmation Modal
  const [returnConfirmLeave, setReturnConfirmLeave] = useState<TeacherLeave | null>(null)
  const [returnConfirmDate, setReturnConfirmDate] = useState<string>(getTodayISODate())
  const [returnConfirmNotes, setReturnConfirmNotes] = useState<string>('')
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false)

  // Delete Leave Confirmation
  const [deleteLeaveConfirm, setDeleteLeaveConfirm] = useState<TeacherLeave | null>(null)

  // Mobile/Week day selection
  const [selectedDay, setSelectedDay] = useState<TimetableEntry['dayOfWeek']>('Monday')
  const [mobileWeekMode, setMobileWeekMode] = useState<'day' | 'all'>('day')

  // Calendar Date selection
  const [calendarDate, setCalendarDate] = useState<string>(getTodayISODate())

  // Document Viewer Modal State
  const [viewingDocument, setViewingDocument] = useState<TimetableDocument | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(100)

  // Interactive Lecture Details Modal
  const [selectedLectureDetails, setSelectedLectureDetails] = useState<TimetableEntry | null>(null)

  // Action Modals
  const [cancelModalEntry, setCancelModalEntry] = useState<TimetableEntry | null>(null)
  const [cancelReason, setCancelReason] = useState<string>('')

  const [rescheduleModalEntry, setRescheduleModalEntry] = useState<TimetableEntry | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<string>(getTodayISODate())
  const [rescheduleStart, setRescheduleStart] = useState<string>('14:00')
  const [rescheduleEnd, setRescheduleEnd] = useState<string>('15:00')
  const [rescheduleRoom, setRescheduleRoom] = useState<string>('')
  const [rescheduleReason, setRescheduleReason] = useState<string>('')

  const [overrideModalEntry, setOverrideModalEntry] = useState<TimetableEntry | null>(null)
  const [overrideType, setOverrideType] = useState<'substitute' | 'room'>('substitute')
  const [overrideDate, setOverrideDate] = useState<string>(getTodayISODate())
  const [overrideSubTeacherId, setOverrideSubTeacherId] = useState<string>('')
  const [overrideRoom, setOverrideRoom] = useState<string>('')
  const [overrideReason, setOverrideReason] = useState<string>('')

  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<TimetableEntry | null>(null)
  const [isActionSubmitting, setIsActionSubmitting] = useState<boolean>(false)

  // Create Lecture Form State (Admin)
  const [isAddLectureModalOpen, setIsAddLectureModalOpen] = useState<boolean>(false)
  const [newLectureDay, setNewLectureDay] = useState<TimetableEntry['dayOfWeek']>('Monday')
  const [newLectureStart, setNewLectureStart] = useState<string>('08:00')
  const [newLectureEnd, setNewLectureEnd] = useState<string>('09:00')
  const [newLectureSubject, setNewLectureSubject] = useState<string>('')
  const [newLectureTeacherId, setNewLectureTeacherId] = useState<string>('')
  const [newLectureRoom, setNewLectureRoom] = useState<string>('Lab 101')
  const [newLectureType, setNewLectureType] = useState<TimetableEntry['type']>('Regular')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const handleOpenAddLectureModal = (
    day?: TimetableEntry['dayOfWeek'],
    startTime?: string,
    endTime?: string
  ) => {
    if (day) setNewLectureDay(day)
    if (startTime) setNewLectureStart(startTime)
    if (endTime) setNewLectureEnd(endTime)
    setCreateError(null)
    setCreateSuccess(null)
    setIsAddLectureModalOpen(true)
  }

  // Upload Document Form State (Admin)
  const [uploadAcademicYear, setUploadAcademicYear] = useState<string>('2024-2025')
  const [uploadEffectiveFrom, setUploadEffectiveFrom] = useState<string>(getTodayISODate())
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState<boolean>(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Holiday Form State (Admin)
  const [holidayName, setHolidayName] = useState<string>('')
  const [holidayDate, setHolidayDate] = useState<string>(getTodayISODate())
  const [holidayScope, setHolidayScope] = useState<'all' | 'course' | 'semester' | 'division'>('all')
  const [holidayDesc, setHolidayDesc] = useState<string>('')
  const [holidaySuccess, setHolidaySuccess] = useState<string | null>(null)

  // List of teachers for assignment dropdowns
  const availableTeachers = useMemo(() => {
    return data.users.filter((u) => u.role === 'teacher')
  }, [data.users])

  // Teachers strictly belonging to the current user's college
  const accessibleTeachers = useMemo(() => {
    const currentCollege = currentUser?.college
    return data.users.filter((u) => {
      if (u.role !== 'teacher') return false
      if (currentCollege && u.college && u.college !== currentCollege) return false
      return true
    })
  }, [data.users, currentUser?.college])

  // Real-time case-insensitive search matching name, department, identifier, or email
  const searchedTeachers = useMemo(() => {
    if (!teacherSearchQuery.trim()) return accessibleTeachers
    const q = teacherSearchQuery.trim().toLowerCase()
    return accessibleTeachers.filter((t) => {
      const nameMatch = t.name?.toLowerCase().includes(q)
      const deptMatch = t.department?.toLowerCase().includes(q)
      const idMatch =
        t.identifier?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q)
      const emailMatch = t.email?.toLowerCase().includes(q)
      return nameMatch || deptMatch || idMatch || emailMatch
    })
  }, [accessibleTeachers, teacherSearchQuery])

  // Active selected teacher object
  const selectedTeacher = useMemo(() => {
    if (selectedTeacherId === 'all') return null
    return accessibleTeachers.find((t) => t.id === selectedTeacherId) || null
  }, [accessibleTeachers, selectedTeacherId])

  const handleClearTeacherFilter = () => {
    setSelectedTeacherId('all')
    setTeacherSearchQuery('')
  }

  const handleRetry = () => {
    setIsRefreshing(true)
    setTimetableError(null)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 400)
  }

  // Teacher Leaves Memos & Calculations (Feature #21)
  const collegeLeaves = useMemo(() => {
    const col = currentUser?.college || 'Bonsalo College'
    return (teacherLeaves || []).filter((l) => !l.collegeId || l.collegeId === col)
  }, [teacherLeaves, currentUser?.college])

  const collegeDepartments = useMemo(() => {
    const depts = new Set<string>()
    for (const t of accessibleTeachers) {
      if (t.department) depts.add(t.department)
    }
    return Array.from(depts).sort()
  }, [accessibleTeachers])

  const teacherAvailMap = useMemo(() => {
    const map = new Map<string, { onLeave: boolean; reason?: string; statusLabel: string }>()
    for (const t of accessibleTeachers) {
      const avail = getTeacherAvailability(t.id, navDate)
      map.set(t.id, avail)
    }
    return map
  }, [accessibleTeachers, getTeacherAvailability, navDate])

  const filteredLeaves = useMemo(() => {
    const todayStr = getTodayISODate()
    return collegeLeaves
      .filter((l) => {
        if (leaveStatusFilter !== 'all') {
          if (leaveStatusFilter === 'ACTIVE') {
            const isAct =
              l.status === 'ACTIVE' ||
              (!l.actualReturnDate && todayStr >= l.startDate && todayStr <= l.endDate)
            if (!isAct) return false
          } else if (leaveStatusFilter === 'UPCOMING') {
            const isUp = l.status === 'UPCOMING' || todayStr < l.startDate
            if (!isUp) return false
          } else if (leaveStatusFilter === 'EARLY_RETURN') {
            if (l.status !== 'EARLY_RETURN') return false
          } else if (leaveStatusFilter === 'COMPLETED') {
            const isComp =
              l.status === 'COMPLETED' ||
              l.status === 'EARLY_RETURN' ||
              (l.actualReturnDate && todayStr >= l.actualReturnDate) ||
              todayStr > l.endDate
            if (!isComp) return false
          }
        }
        if (leaveDeptFilter !== 'all' && l.teacherDepartment !== leaveDeptFilter) return false
        if (leaveSearchQuery.trim()) {
          const q = leaveSearchQuery.trim().toLowerCase()
          const matchName = l.teacherName.toLowerCase().includes(q)
          const matchReason = l.reason?.toLowerCase().includes(q)
          const matchDept = l.teacherDepartment?.toLowerCase().includes(q)
          if (!matchName && !matchReason && !matchDept) return false
        }
        return true
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [collegeLeaves, leaveStatusFilter, leaveDeptFilter, leaveSearchQuery])

  const leaveMetrics = useMemo(() => {
    const todayStr = getTodayISODate()
    let active = 0
    let upcoming = 0
    let completed = 0

    for (const l of collegeLeaves) {
      if (l.status === 'CANCELLED') continue
      if (l.status === 'EARLY_RETURN') {
        completed++
      } else if (l.status === 'COMPLETED' || (l.actualReturnDate && todayStr >= l.actualReturnDate) || todayStr > l.endDate) {
        completed++
      } else if (todayStr >= l.startDate && todayStr <= l.endDate) {
        active++
      } else if (todayStr < l.startDate) {
        upcoming++
      }
    }

    const availableFacultyCount = accessibleTeachers.filter(
      (t) => !getTeacherAvailability(t.id, todayStr).onLeave
    ).length

    return { active, upcoming, completed, availableFacultyCount }
  }, [collegeLeaves, accessibleTeachers, getTeacherAvailability])

  const previewAffectedLectures = useMemo(() => {
    if (!leaveFormTeacherId || !leaveFormStartDate || !leaveFormEndDate) return []
    if (leaveFormStartDate > leaveFormEndDate) return []
    return getAffectedLecturesForLeave({
      teacherId: leaveFormTeacherId,
      startDate: leaveFormStartDate,
      endDate: leaveFormEndDate,
      leaveType: leaveFormType,
      startTime: leaveFormType === 'Partial Day' ? leaveFormStartTime : undefined,
      endTime: leaveFormType === 'Partial Day' ? leaveFormEndTime : undefined,
    })
  }, [
    leaveFormTeacherId,
    leaveFormStartDate,
    leaveFormEndDate,
    leaveFormType,
    leaveFormStartTime,
    leaveFormEndTime,
    getAffectedLecturesForLeave,
  ])

  const activeLeaveAffectedLectures = useMemo(() => {
    if (!affectedModalLeave) return []
    return getAffectedLecturesForLeave({
      teacherId: affectedModalLeave.teacherId,
      startDate: affectedModalLeave.startDate,
      endDate: affectedModalLeave.endDate,
      leaveType: affectedModalLeave.leaveType,
      startTime: affectedModalLeave.startTime,
      endTime: affectedModalLeave.endTime,
    })
  }, [affectedModalLeave, getAffectedLecturesForLeave, timetableEntries])

  const substituteConflict = useMemo(() => {
    if (!substitutePickerLecture || !substituteTargetTeacherId) return null
    const w = substitutePickerLecture.weeklyEntry
    const sTime = w.startTime || (w.time ? w.time.split('–')[0].trim() : '09:00')
    const eTime = w.endTime || (w.time ? w.time.split('–')[1].trim() : '10:00')
    return checkSubstituteConflict(
      substituteTargetTeacherId,
      substitutePickerLecture.date,
      sTime,
      eTime
    )
  }, [substitutePickerLecture, substituteTargetTeacherId, checkSubstituteConflict])


  // Active Official Timetable Document for Selected Class
  const activeDocument = useMemo(() => {
    return timetableDocuments.find(
      (doc) =>
        courseMatches(doc.course, selectedCourse) &&
        semesterMatches(doc.semester, selectedSemester) &&
        divisionMatches(doc.division, selectedDivision) &&
        doc.isActive
    )
  }, [timetableDocuments, selectedCourse, selectedSemester, selectedDivision])

  // Archived Documents for Selected Class
  const classDocuments = useMemo(() => {
    return timetableDocuments
      .filter(
        (doc) =>
          courseMatches(doc.course, selectedCourse) &&
          semesterMatches(doc.semester, selectedSemester) &&
          divisionMatches(doc.division, selectedDivision)
      )
      .sort((a, b) => b.version - a.version)
  }, [timetableDocuments, selectedCourse, selectedSemester, selectedDivision])

  // Helper to construct resolution context
  const getResolutionUser = useMemo((): User | null => {
    if (mode === 'admin') {
      if (adminTimetableCategory === 'teacher') {
        if (selectedTeacherId === 'all') {
          return {
            id: 'all-teachers-view',
            role: 'admin',
            college: currentUser?.college || 'Bonsalo College',
            name: 'All Teachers',
            email: 'all@edupulse.dev',
            avatar: 'AT',
            identifier: 'ALL',
            status: 'active',
            createdAt: new Date().toISOString(),
          }
        }
        return (
          selectedTeacher || {
            id: selectedTeacherId,
            role: 'teacher',
            college: currentUser?.college || 'Bonsalo College',
            name: 'Teacher',
            email: 'teacher@edupulse.dev',
            avatar: 'TC',
            identifier: 'TCH',
            status: 'active',
            createdAt: new Date().toISOString(),
          }
        )
      }
      return {
        id: 'admin-preview',
        college: currentUser?.college || 'Bonsalo College',
        name: 'Admin',
        email: 'admin@edupulse.dev',
        avatar: 'AD',
        identifier: 'ADM-01',
        role: 'student',
        course: selectedCourse,
        semester: selectedSemester,
        division: selectedDivision,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
    }
    if (mode === 'teacher') {
      if (selectedTeacherId === 'all') {
        return {
          id: 'all-teachers-view',
          role: 'admin',
          college: currentUser?.college || 'Bonsalo College',
          name: 'All Teachers',
          email: 'all@edupulse.dev',
          avatar: 'AT',
          identifier: 'ALL',
          status: 'active',
          createdAt: new Date().toISOString(),
        }
      }
      return selectedTeacher || currentUser
    }
    return currentUser
  }, [
    mode,
    adminTimetableCategory,
    selectedTeacherId,
    selectedTeacher,
    currentUser,
    selectedCourse,
    selectedSemester,
    selectedDivision,
  ])

  // Nav Date Schedule (Priority resolved for today or selected nav date)
  const navSchedule = useMemo(() => {
    return resolveTodaySchedule(getResolutionUser, navDate)
  }, [getResolutionUser, navDate, resolveTodaySchedule])

  // Calendar Date Schedule (Single Source of Truth)
  const calendarSchedule = useMemo(() => {
    return resolveTodaySchedule(getResolutionUser, calendarDate)
  }, [getResolutionUser, calendarDate, resolveTodaySchedule])

  // Weekly Entries for Selected Class (Recurring entries only)
  const weeklyClassEntries = useMemo(() => {
    const currentCollege = currentUser?.college
    return timetableEntries.filter(
      (entry) => {
        if (currentCollege && entry.collegeId && entry.collegeId !== currentCollege) return false
        return (
          courseMatches(entry.course, selectedCourse) &&
          semesterMatches(entry.semester, selectedSemester) &&
          divisionMatches(entry.division, selectedDivision) &&
          entry.entryType === 'weekly'
        )
      }
    )
  }, [timetableEntries, currentUser?.college, selectedCourse, selectedSemester, selectedDivision])

  // Weekly Entries for Teacher (All College Teachers OR Specific Selected Teacher)
  const teacherWeeklyEntries = useMemo(() => {
    const currentCollege = currentUser?.college
    return timetableEntries.filter((entry) => {
      if (entry.entryType !== 'weekly') return false
      if (currentCollege && entry.collegeId && entry.collegeId !== currentCollege) return false

      if (selectedTeacherId === 'all') {
        return true
      }

      return (
        entry.teacherId === selectedTeacherId ||
        entry.substituteTeacherId === selectedTeacherId ||
        (selectedTeacher &&
          (entry.teacherName === selectedTeacher.name ||
            entry.teacher === selectedTeacher.name))
      )
    })
  }, [timetableEntries, currentUser?.college, selectedTeacherId, selectedTeacher])

  // Active Weekly Entries across student class or teacher/faculty view
  const activeWeeklyEntries = useMemo(() => {
    if (mode === 'teacher') {
      return teacherWeeklyEntries
    }
    if (mode === 'admin' && adminTimetableCategory === 'teacher') {
      return teacherWeeklyEntries
    }
    return weeklyClassEntries
  }, [mode, adminTimetableCategory, teacherWeeklyEntries, weeklyClassEntries])

  // Total active weekly entries count
  const weeklyEntriesCount = useMemo(() => {
    return activeWeeklyEntries.length
  }, [activeWeeklyEntries])

  // Dynamic Hour boundaries for Weekly Time Grid
  const { minHour, maxHour } = useMemo(() => {
    let earliest = 8 * 60 // default 08:00 AM
    let latest = 17 * 60 // default 05:00 PM

    const allWeekly = activeWeeklyEntries
    for (const e of allWeekly) {
      const { startMin, endMin } = getEntryMinutes(e)
      if (startMin < earliest) earliest = startMin
      if (endMin > latest) latest = endMin
    }

    const calculatedMin = Math.max(6, Math.min(8, Math.floor(earliest / 60)))
    const calculatedMax = Math.min(22, Math.max(17, Math.ceil(latest / 60)))
    return { minHour: calculatedMin, maxHour: calculatedMax }
  }, [activeWeeklyEntries])

  // Hour slots for Sticky Left Time Column
  const timeSlots = useMemo(() => {
    const slots: Array<{ hour: number; label: string; time24: string }> = []
    for (let h = minHour; h < maxHour; h++) {
      const period = h >= 12 ? 'PM' : 'AM'
      const displayH = h % 12 === 0 ? 12 : h % 12
      const label = `${String(displayH).padStart(2, '0')}:00 ${period}`
      const time24 = `${String(h).padStart(2, '0')}:00`
      slots.push({ hour: h, label, time24 })
    }
    return slots
  }, [minHour, maxHour])

  const totalCanvasHeight = useMemo(() => {
    return timeSlots.length * HOUR_HEIGHT
  }, [timeSlots.length])

  // Real-time weekday and Now indicator position
  const { currentWeekdayName, nowIndicatorTop } = useMemo(() => {
    const now = new Date()
    const weekday = now.toLocaleDateString('en-IN', { weekday: 'long' }) as TimetableEntry['dayOfWeek']
    const currentMins = now.getHours() * 60 + now.getMinutes()
    const top = (currentMins - minHour * 60) * (HOUR_HEIGHT / 60)
    return { currentWeekdayName: weekday, nowIndicatorTop: top }
  }, [minHour])

  // Active Overrides (Emergency, substitute, room change, rescheduled)
  const activeOverrides = useMemo(() => {
    const currentCollege = currentUser?.college
    return timetableEntries.filter((entry) => {
      if (entry.entryType === 'weekly' && entry.status === 'Scheduled') return false
      if (currentCollege && entry.collegeId && entry.collegeId !== currentCollege) return false
      if (mode === 'teacher' || (mode === 'admin' && adminTimetableCategory === 'teacher')) {
        if (selectedTeacherId === 'all') return true
        return (
          entry.teacherId === selectedTeacherId ||
          entry.substituteTeacherId === selectedTeacherId ||
          (selectedTeacher &&
            (entry.teacherName === selectedTeacher.name ||
              entry.teacher === selectedTeacher.name))
        )
      }
      if (mode === 'student') {
        return (
          courseMatches(entry.course, selectedCourse) &&
          semesterMatches(entry.semester, selectedSemester) &&
          divisionMatches(entry.division, selectedDivision)
        )
      }
      return true
    })
  }, [
    timetableEntries,
    mode,
    currentUser?.college,
    adminTimetableCategory,
    selectedTeacherId,
    selectedTeacher,
    selectedCourse,
    selectedSemester,
    selectedDivision,
  ])

  // Real-Time Next Class / In-Progress Class Spotlight
  const spotlightInfo = useMemo(() => {
    if (navDate !== getTodayISODate()) return null
    if (navSchedule.isHoliday || navSchedule.entries.length === 0) return null

    const now = new Date()
    const currentMin = now.getHours() * 60 + now.getMinutes()
    const activeEntries = navSchedule.entries.filter((e) => e.status !== 'Cancelled')

    let inProgress: TimetableEntry | null = null
    let nextUpcoming: TimetableEntry | null = null
    let minDiff = Infinity

    for (const entry of activeEntries) {
      if (!entry.startTime || !entry.endTime) continue
      const [sH, sM] = entry.startTime.split(':').map(Number)
      const [eH, eM] = entry.endTime.split(':').map(Number)
      const startMin = sH * 60 + sM
      const endMin = eH * 60 + eM

      if (currentMin >= startMin && currentMin < endMin) {
        inProgress = entry
        break
      } else if (startMin > currentMin) {
        const diff = startMin - currentMin
        if (diff < minDiff) {
          minDiff = diff
          nextUpcoming = entry
        }
      }
    }

    if (inProgress) {
      return {
        entry: inProgress,
        statusLabel:
          mode === 'teacher' && selectedTeacherId === 'all'
            ? 'CAMPUS IN PROGRESS'
            : 'NOW IN PROGRESS',
        timingNote: `Session ends at ${formatTimeTo12Hour(inProgress.endTime)}`,
      }
    } else if (nextUpcoming) {
      const [sH, sM] = nextUpcoming.startTime.split(':').map(Number)
      const diffMin = sH * 60 + sM - currentMin
      const timingNote =
        diffMin <= 60
          ? `Starts in ${diffMin} minute${diffMin === 1 ? '' : 's'}`
          : `Starts at ${formatTimeTo12Hour(nextUpcoming.startTime)}`
      return {
        entry: nextUpcoming,
        statusLabel:
          mode === 'teacher' && selectedTeacherId === 'all'
            ? 'CAMPUS NEXT CLASS'
            : 'NEXT CLASS',
        timingNote,
      }
    }
    return null
  }, [navDate, navSchedule, mode, selectedTeacherId])

  // Live Conflict Detection for Admin "Create Lecture" Form
  const liveConflict = useMemo(() => {
    if (!newLectureStart || !newLectureEnd) return null

    const sameDayEntries = timetableEntries.filter(
      (e) => e.dayOfWeek === newLectureDay && e.entryType === 'weekly'
    )

    const checkOverlap = (startA: string, endA: string, startB: string, endB: string) => {
      const [sAh, sAm] = startA.split(':').map(Number)
      const [eAh, eAm] = endA.split(':').map(Number)
      const [sBh, sBm] = startB.split(':').map(Number)
      const [eBh, eBm] = endB.split(':').map(Number)
      const startMinA = sAh * 60 + sAm
      const endMinA = eAh * 60 + eAm
      const startMinB = sBh * 60 + sBm
      const endMinB = eBh * 60 + eBm
      return Math.max(startMinA, startMinB) < Math.min(endMinA, endMinB)
    }

    if (newLectureTeacherId) {
      const teacherConflict = sameDayEntries.find(
        (e) =>
          e.teacherId === newLectureTeacherId &&
          checkOverlap(newLectureStart, newLectureEnd, e.startTime, e.endTime)
      )
      if (teacherConflict) {
        return `Teacher conflict: ${teacherConflict.teacherName} is already assigned to "${teacherConflict.subjectName}" (${teacherConflict.course} Sem ${teacherConflict.semester} Div ${teacherConflict.division}) from ${teacherConflict.startTime} to ${teacherConflict.endTime}.`
      }
    }

    if (newLectureRoom) {
      const roomConflict = sameDayEntries.find(
        (e) =>
          e.room === newLectureRoom &&
          checkOverlap(newLectureStart, newLectureEnd, e.startTime, e.endTime)
      )
      if (roomConflict) {
        return `Room conflict: ${newLectureRoom} is already booked for "${roomConflict.subjectName}" (${roomConflict.course} Sem ${roomConflict.semester}) from ${roomConflict.startTime} to ${roomConflict.endTime}.`
      }
    }

    const classConflict = sameDayEntries.find(
      (e) =>
        courseMatches(e.course, selectedCourse) &&
        semesterMatches(e.semester, selectedSemester) &&
        divisionMatches(e.division, selectedDivision) &&
        checkOverlap(newLectureStart, newLectureEnd, e.startTime, e.endTime)
    )
    if (classConflict) {
      return `Class slot conflict: This class already has "${classConflict.subjectName}" scheduled from ${classConflict.startTime} to ${classConflict.endTime}.`
    }

    return null
  }, [
    timetableEntries,
    newLectureDay,
    newLectureStart,
    newLectureEnd,
    newLectureTeacherId,
    newLectureRoom,
    selectedCourse,
    selectedSemester,
    selectedDivision,
  ])

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  const handlePrevDay = () => {
    const safeStr = navDate.includes('T') ? navDate : `${navDate}T12:00:00`
    const d = new Date(safeStr)
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setNavDate(`${y}-${m}-${day}`)
  }

  const handleNextDay = () => {
    const safeStr = navDate.includes('T') ? navDate : `${navDate}T12:00:00`
    const d = new Date(safeStr)
    d.setDate(d.getDate() + 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setNavDate(`${y}-${m}-${day}`)
  }

  const handleToday = () => {
    setNavDate(getTodayISODate())
  }

  const handleCreateLecture = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (!newLectureSubject.trim()) {
      setCreateError('Please specify a subject name.')
      return
    }
    if (!newLectureTeacherId) {
      setCreateError('Please select a teacher.')
      return
    }
    if (newLectureStart >= newLectureEnd) {
      setCreateError('Start time must be before end time.')
      return
    }

    const teacherObj = availableTeachers.find((t) => t.id === newLectureTeacherId)
    const teacherName = teacherObj ? teacherObj.name : 'Assigned Faculty'

    try {
      const matchingClass = (classes || []).find(
        (c) =>
          (selectedClassId !== 'custom' && c.id === selectedClassId) ||
          (courseMatches(c.courseName, selectedCourse) &&
            semesterMatches(c.semester, selectedSemester) &&
            divisionMatches(c.division, selectedDivision))
      )
      const dynamicClassName = matchingClass
        ? matchingClass.name
        : `${selectedCourse.split(' ').map((w) => (w.length <= 4 ? w : w[0])).join('')}-S${selectedSemester}${selectedDivision}`

      await createTimetableEntry({
        course: selectedCourse,
        semester: selectedSemester,
        division: selectedDivision,
        classId: matchingClass?.id,
        className: dynamicClassName,
        academicYear: uploadAcademicYear,
        dayOfWeek: newLectureDay,
        startTime: newLectureStart,
        endTime: newLectureEnd,
        subjectName: newLectureSubject.trim(),
        teacherId: newLectureTeacherId,
        teacherName,
        room: newLectureRoom,
        type: newLectureType,
        status: 'Scheduled',
        entryType: 'weekly',
      })

      setCreateSuccess(
        `Lecture created successfully for ${newLectureSubject} on ${newLectureDay} (${newLectureStart} - ${newLectureEnd})!`
      )
      setNewLectureSubject('')
      setTimeout(() => {
        setIsAddLectureModalOpen(false)
        setCreateSuccess(null)
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create timetable lecture.'
      setCreateError(msg)
    }
  }

  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    setUploadSuccess(null)

    if (!uploadFile) {
      setUploadError('Please choose a timetable file (PDF or Image under 20MB).')
      return
    }

    setUploadLoading(true)
    try {
      await uploadTimetableDocument({
        course: selectedCourse,
        semester: selectedSemester,
        division: selectedDivision,
        academicYear: uploadAcademicYear,
        effectiveFrom: uploadEffectiveFrom,
        file: uploadFile,
      })
      setUploadSuccess(`Official timetable uploaded and published successfully as active version!`)
      setUploadFile(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload timetable document.'
      setUploadError(msg)
    } finally {
      setUploadLoading(false)
    }
  }

  const handleCancelSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!cancelModalEntry || isActionSubmitting) return
    if (!cancelReason.trim()) {
      alert('A reason is mandatory when cancelling a lecture.')
      return
    }
    setIsActionSubmitting(true)
    try {
      await cancelLecture(cancelModalEntry.id, cancelReason.trim(), cancelModalEntry.date || navDate)
      setCancelModalEntry(null)
      setSelectedLectureDetails(null)
      setCancelReason('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel lecture.')
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const handleRescheduleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!rescheduleModalEntry || isActionSubmitting) return
    if (rescheduleStart >= rescheduleEnd) {
      alert('Rescheduled start time must be before end time.')
      return
    }
    setIsActionSubmitting(true)
    try {
      await rescheduleLecture(rescheduleModalEntry.id, {
        newDate: rescheduleDate,
        newStartTime: rescheduleStart,
        newEndTime: rescheduleEnd,
        newRoom: rescheduleRoom || rescheduleModalEntry.room,
        reason: rescheduleReason || 'Faculty rescheduled slot',
        originalDate: rescheduleModalEntry.date || navDate,
      })
      setRescheduleModalEntry(null)
      setSelectedLectureDetails(null)
      setRescheduleReason('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reschedule lecture.')
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const handleOverrideSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!overrideModalEntry || isActionSubmitting) return

    setIsActionSubmitting(true)
    try {
      if (overrideType === 'substitute') {
        if (!overrideSubTeacherId) {
          alert('Please select a substitute teacher.')
          setIsActionSubmitting(false)
          return
        }
        const subTeacher = availableTeachers.find((t) => t.id === overrideSubTeacherId)
        await assignSubstituteTeacher(overrideModalEntry.id, {
          date: overrideDate,
          substituteTeacherId: overrideSubTeacherId,
          substituteTeacherName: subTeacher ? subTeacher.name : 'Substitute Teacher',
          reason: overrideReason || 'Substitute teacher assigned',
        })
        setOverrideModalEntry(null)
        setSelectedLectureDetails(null)
        setOverrideReason('')
      } else {
        if (!overrideRoom.trim()) {
          alert('Please specify the new room.')
          setIsActionSubmitting(false)
          return
        }
        await changeRoom(overrideModalEntry.id, {
          date: overrideDate,
          newRoom: overrideRoom.trim(),
          reason: overrideReason || 'Room shifted due to campus requirements',
        })
        setOverrideModalEntry(null)
        setSelectedLectureDetails(null)
        setOverrideReason('')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to apply override.')
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmEntry || isActionSubmitting) return
    setIsActionSubmitting(true)
    try {
      await deleteTimetableEntry(deleteConfirmEntry.id)
      setDeleteConfirmEntry(null)
      setSelectedLectureDetails(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete lecture entry.')
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const handleAddHolidaySubmit = async (e: FormEvent) => {
    e.preventDefault()
    setHolidaySuccess(null)
    if (!holidayName.trim()) {
      alert('Please enter a holiday title.')
      return
    }
    try {
      await addHoliday({
        name: holidayName.trim(),
        date: holidayDate,
        scope: holidayScope,
        course: holidayScope !== 'all' ? selectedCourse : undefined,
        semester: holidayScope !== 'all' ? selectedSemester : undefined,
        division: holidayScope !== 'all' ? selectedDivision : undefined,
        description: holidayDesc.trim() || undefined,
      })
      setHolidaySuccess(`Holiday "${holidayName}" added successfully!`)
      setHolidayName('')
      setHolidayDesc('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add holiday.')
    }
  }

  // Teacher Leave Handlers (Feature #21)
  const handleCreateLeaveSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLeaveFormError(null)

    if (!leaveFormTeacherId) {
      setLeaveFormError('Please select a faculty member.')
      return
    }

    if (leaveFormStartDate > leaveFormEndDate) {
      setLeaveFormError('End date cannot be before start date.')
      return
    }

    if (leaveFormType === 'Partial Day' && leaveFormStartTime >= leaveFormEndTime) {
      setLeaveFormError('End time must be after start time for partial day leave.')
      return
    }

    setIsSubmittingLeave(true)
    try {
      const teacherObj = accessibleTeachers.find((t) => t.id === leaveFormTeacherId)
      const createdLeaveId = await createTeacherLeave({
        teacherId: leaveFormTeacherId,
        teacherName: teacherObj?.name || 'Faculty Member',
        teacherEmail: teacherObj?.email,
        teacherDepartment: teacherObj?.department,
        startDate: leaveFormStartDate,
        endDate: leaveFormEndDate,
        leaveType: leaveFormType,
        startTime: leaveFormType === 'Partial Day' ? leaveFormStartTime : undefined,
        endTime: leaveFormType === 'Partial Day' ? leaveFormEndTime : undefined,
        reason: leaveFormReason.trim() || 'Personal Leave',
        notes: leaveFormNotes.trim() || undefined,
        status: 'ACTIVE',
      })

      setIsAddLeaveModalOpen(false)
      setLeaveFormReason('')
      setLeaveFormNotes('')

      const newLeaveObj: TeacherLeave = {
        id: createdLeaveId,
        collegeId: currentUser?.college || 'Bonsalo College',
        teacherId: leaveFormTeacherId,
        teacherName: teacherObj?.name || 'Faculty Member',
        teacherEmail: teacherObj?.email,
        teacherDepartment: teacherObj?.department,
        startDate: leaveFormStartDate,
        endDate: leaveFormEndDate,
        leaveType: leaveFormType,
        startTime: leaveFormType === 'Partial Day' ? leaveFormStartTime : undefined,
        endTime: leaveFormType === 'Partial Day' ? leaveFormEndTime : undefined,
        reason: leaveFormReason.trim() || 'Personal Leave',
        status: 'ACTIVE',
        createdBy: currentUser?.id || 'admin-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setAffectedModalLeave(newLeaveObj)
    } catch (err: unknown) {
      setLeaveFormError(err instanceof Error ? err.message : 'Failed to record faculty leave.')
    } finally {
      setIsSubmittingLeave(false)
    }
  }

  const handleConfirmReturnSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!returnConfirmLeave) return
    setIsSubmittingReturn(true)
    try {
      await endTeacherLeaveEarly(
        returnConfirmLeave.id,
        returnConfirmDate,
        returnConfirmNotes.trim() || undefined
      )
      setReturnConfirmLeave(null)
      setReturnConfirmNotes('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  const handleSubstituteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!affectedModalLeave || !substitutePickerLecture || !substituteTargetTeacherId) return
    setIsHandlingAffectedAction(true)
    try {
      const subTeacher = accessibleTeachers.find((t) => t.id === substituteTargetTeacherId)
      await substituteLeaveAffectedLecture(
        affectedModalLeave.id,
        substitutePickerLecture.weeklyEntry.id,
        substitutePickerLecture.date,
        substituteTargetTeacherId,
        subTeacher?.name || 'Substitute Faculty',
        substituteReasonNote.trim() || undefined
      )
      setSubstitutePickerLecture(null)
      setSubstituteTargetTeacherId('')
      setSubstituteReasonNote('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsHandlingAffectedAction(false)
    }
  }

  const handleLeaveAffectedRescheduleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!affectedModalLeave || !reschedulePickerLecture) return
    setIsHandlingAffectedAction(true)
    try {
      await rescheduleLeaveAffectedLecture(
        affectedModalLeave.id,
        reschedulePickerLecture.weeklyEntry.id,
        reschedulePickerLecture.date,
        reschedulePickerDate,
        reschedulePickerStart,
        reschedulePickerEnd,
        reschedulePickerRoom.trim() || undefined,
        reschedulePickerReason.trim() || undefined
      )
      setReschedulePickerLecture(null)
      setReschedulePickerReason('')
      setReschedulePickerRoom('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsHandlingAffectedAction(false)
    }
  }

  const handleBulkCancelPending = async () => {
    if (!affectedModalLeave) return
    setIsHandlingAffectedAction(true)
    try {
      await cancelAllPendingAffectedLectures(affectedModalLeave.id)
    } catch (err) {
      console.error(err)
    } finally {
      setIsHandlingAffectedAction(false)
    }
  }

  const handleDeleteLeaveSubmit = async () => {
    if (!deleteLeaveConfirm) return
    try {
      await deleteTeacherLeave(deleteLeaveConfirm.id)
      setDeleteLeaveConfirm(null)
    } catch (err) {
      console.error(err)
    }
  }

  const openDocumentViewer = (doc: TimetableDocument) => {
    setViewingDocument(doc)
    setZoomLevel(100)
  }

  const handleCreateCourseSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCourseFormError(null)
    if (!courseFormName.trim() || !courseFormCode.trim()) {
      setCourseFormError('Course Name and Course Code are required.')
      return
    }
    setIsSubmittingCourse(true)
    try {
      await createCourse({
        name: courseFormName.trim(),
        code: courseFormCode.trim().toUpperCase(),
        department: courseFormDepartment.trim() || 'General',
        durationYears: Number(courseFormDuration) || 3,
        totalSemesters: Number(courseFormSemesters) || 6,
        years: ['FY', 'SY', 'TY'],
        isActive: true,
      })
      setIsAddCourseModalOpen(false)
      setCourseFormName('')
      setCourseFormCode('')
    } catch (err: any) {
      setCourseFormError(err?.message || 'Failed to create course.')
    } finally {
      setIsSubmittingCourse(false)
    }
  }

  const handleCreateClassSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setClassFormError(null)
    const displayName = classFormName.trim() || `${classFormYear}${classFormCourseName.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}-${classFormDivision}`
    setIsSubmittingClass(true)
    try {
      const courseObj = (courses || []).find((c) => c.name === classFormCourseName)
      await createAcademicClass({
        courseId: courseObj ? courseObj.id : `course-${classFormCourseName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        courseName: classFormCourseName,
        year: classFormYear,
        semester: classFormSemester,
        division: classFormDivision,
        name: displayName,
        academicYear: classFormAcademicYear,
        teacherIds: [],
        studentIds: [],
        isActive: true,
      })
      setIsAddClassModalOpen(false)
      setClassFormName('')
    } catch (err: any) {
      setClassFormError(err?.message || 'Failed to create academic class.')
    } finally {
      setIsSubmittingClass(false)
    }
  }

  const handleOpenEditCourseModal = (course: Course) => {
    setEditingCourse(course)
    setEditCourseFormName(course.name)
    setEditCourseFormCode(course.code)
    setEditCourseFormDepartment(course.department || 'General')
    setEditCourseFormDuration(course.durationYears || 3)
    setEditCourseFormSemesters(course.totalSemesters || 6)
    setEditCourseFormStatus(course.status || (course.isActive ? 'active' : 'archived'))
    setEditCourseFormError(null)
  }

  const handleEditCourseSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return
    setEditCourseFormError(null)
    if (!editCourseFormName.trim() || !editCourseFormCode.trim()) {
      setEditCourseFormError('Course Name and Course Code are required.')
      return
    }
    setIsSubmittingEditCourse(true)
    try {
      await updateCourse(editingCourse.id, {
        name: editCourseFormName.trim(),
        code: editCourseFormCode.trim().toUpperCase(),
        department: editCourseFormDepartment.trim(),
        durationYears: Number(editCourseFormDuration) || 3,
        totalSemesters: Number(editCourseFormSemesters) || 6,
        status: editCourseFormStatus,
        isActive: editCourseFormStatus === 'active',
      })
      setEditingCourse(null)
    } catch (err: any) {
      setEditCourseFormError(err?.message || 'Failed to update course.')
    } finally {
      setIsSubmittingEditCourse(false)
    }
  }

  const handleOpenEditClassModal = (cls: AcademicClass) => {
    setEditingClass(cls)
    setEditClassFormName(cls.name || '')
    setEditClassFormDivision(cls.division || 'A')
    setEditClassFormSemester(cls.semester || '1')
    setEditClassFormYear(cls.year || 'FY')
    setEditClassFormAcademicYear(cls.academicYear || '2026-27')
    setEditClassFormStatus(cls.status || (cls.isActive ? 'active' : 'archived'))
    setEditClassFormError(null)
  }

  const handleEditClassSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingClass) return
    setEditClassFormError(null)
    setIsSubmittingEditClass(true)
    try {
      await updateAcademicClass(editingClass.id, {
        name: editClassFormName.trim() || editingClass.name,
        division: editClassFormDivision.trim().toUpperCase(),
        semester: editClassFormSemester.trim(),
        year: editClassFormYear.trim(),
        academicYear: editClassFormAcademicYear.trim(),
        status: editClassFormStatus,
        isActive: editClassFormStatus === 'active',
      })
      setEditingClass(null)
    } catch (err: any) {
      setEditClassFormError(err?.message || 'Failed to update academic class.')
    } finally {
      setIsSubmittingEditClass(false)
    }
  }

  // -------------------------------------------------------------
  // 3. RENDER HELPERS
  // -------------------------------------------------------------

  const renderLectureCard = (entry: TimetableEntry, showActions: boolean = true) => {
    const isCancelled = entry.status === 'Cancelled'
    const isRescheduled = entry.status === 'Rescheduled'

    const canModify =
      mode === 'admin' ||
      (mode === 'teacher' &&
        (entry.teacherId === currentUser?.id ||
          entry.teacherName === currentUser?.name ||
          entry.substituteTeacherId === currentUser?.id))

    const formattedTime =
      entry.startTime && entry.endTime
        ? `${formatTimeTo12Hour(entry.startTime)} – ${formatTimeTo12Hour(entry.endTime)}`
        : entry.time

    return (
      <div
        key={entry.id}
        className={`lecture-card lecture-card--${STATUS_TONE[entry.status] || 'scheduled'}`}
        onClick={() => setSelectedLectureDetails(entry)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setSelectedLectureDetails(entry)
          }
        }}
      >
        {/* Top: Time Pill & Status Tag */}
        <div className="lecture-card-top">
          <span className="lecture-time-pill">
            <Clock3 size={13} />
            {formattedTime}
          </span>
          <span
            className={`lecture-status-tag lecture-status-tag--${
              STATUS_TONE[entry.status] || 'scheduled'
            }`}
          >
            {entry.status === 'Room_Changed'
              ? 'Room Changed'
              : entry.status === 'Substitute'
              ? 'Substitute'
              : entry.status}
          </span>
        </div>

        {/* Body: Subject Title & Hierarchy */}
        <div className="lecture-card-body">
          <h4>{entry.subjectName || entry.subject}</h4>
          <div className="lecture-card-meta">
            <span className="lecture-meta-item">
              <UserIcon size={14} style={{ flexShrink: 0 }} />
              {entry.substituteTeacherName ? (
                <span>
                  <strong>{entry.substituteTeacherName}</strong>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    (Sub for {entry.teacherName || entry.teacher})
                  </span>
                </span>
              ) : (
                <span>{entry.teacherName || entry.teacher}</span>
              )}
            </span>

            <span className="lecture-meta-item">
              <MapPin size={14} style={{ flexShrink: 0 }} />
              {entry.originalRoom && entry.room !== entry.originalRoom ? (
                <span>
                  <strong>{entry.room}</strong>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    (Moved from {entry.originalRoom})
                  </span>
                </span>
              ) : (
                <span>{entry.room || 'Room TBA'}</span>
              )}
            </span>

            {entry.course && mode !== 'student' && (
              <span className="lecture-meta-item">
                <Users size={14} style={{ flexShrink: 0 }} />
                <span>
                  {entry.course.split(' ')[0]} Sem {entry.semester} · Div {entry.division}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Reason notice if cancelled, rescheduled, or override */}
        {entry.reason && (
          <div
            className={`lecture-reason-notice ${
              isCancelled
                ? 'lecture-reason-notice--cancelled'
                : isRescheduled
                ? 'lecture-reason-notice--rescheduled'
                : 'lecture-reason-notice--override'
            }`}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Note:</strong> {entry.reason}
            </span>
          </div>
        )}

        {/* Action buttons for Teacher & Admin */}
        {showActions && canModify && (
          <div className="lecture-card-actions" onClick={(e) => e.stopPropagation()}>
            {!isCancelled ? (
              <>
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  title="Cancel Lecture"
                  onClick={() => {
                    setCancelModalEntry(entry)
                    setCancelReason('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  title="Reschedule Lecture"
                  onClick={() => {
                    setRescheduleModalEntry(entry)
                    setRescheduleDate(getTodayISODate())
                    setRescheduleStart(entry.startTime || '14:00')
                    setRescheduleEnd(entry.endTime || '15:00')
                    setRescheduleRoom(entry.room || '')
                    setRescheduleReason('')
                  }}
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  title="Assign Substitute / Change Room"
                  onClick={() => {
                    setOverrideModalEntry(entry)
                    setOverrideType('substitute')
                    setOverrideDate(getTodayISODate())
                    setOverrideSubTeacherId('')
                    setOverrideRoom(entry.room || '')
                    setOverrideReason('')
                  }}
                >
                  Override
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button button--secondary button--sm"
                title="Restore Lecture"
                onClick={() => restoreLecture(entry.id)}
                style={{
                  color: 'var(--accent-emerald, #059669)',
                  borderColor: 'var(--accent-emerald, #059669)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <RotateCcw size={13} /> Restore
              </button>
            )}
            {mode === 'admin' && (
              <button
                type="button"
                className="button button--danger button--sm"
                title="Delete Lecture"
                onClick={() => setDeleteConfirmEntry(entry)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------

  return (
    <div className="timetable-container">
      {/* 1. Page Header */}
      <div className="timetable-header">
        <div className="timetable-header-left">
          <div className="timetable-header-title">
            <CalendarDays size={24} className="text-primary" />
            <span>
              {mode === 'student'
                ? 'Timetable'
                : mode === 'teacher'
                ? selectedTeacherId === 'all'
                  ? 'Campus Faculty Timetable (All Teachers)'
                  : `${selectedTeacher?.name || 'Faculty'}'s Timetable`
                : adminTimetableCategory === 'teacher'
                ? 'College Faculty Timetable Management'
                : 'College Timetable Management'}
            </span>
            {activeDocument ? (
              <span className="timetable-version-badge">
                <Sparkles size={12} /> v{activeDocument.version} Published
              </span>
            ) : (
              <span className="timetable-version-badge timetable-version-badge--archived">
                No Visual Document
              </span>
            )}
          </div>
          <p className="timetable-header-sub">
            {mode === 'student'
              ? 'View your daily schedule, weekly lectures, and official institutional documents.'
              : mode === 'teacher'
              ? selectedTeacherId === 'all'
                ? 'View campus-wide faculty teaching schedules, or select an individual teacher to inspect their classes.'
                : `Managing teaching slots, cancellations, and duty assignments for ${selectedTeacher?.name || 'Faculty'}.`
              : 'Institutional timetable master control: manage classes, lecture allocations, and holidays.'}
          </p>
        </div>

        <div className="timetable-header-actions">
          <Button
            type="button"
            className="button--secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleRetry}
            title="Refresh timetable"
          >
            <RefreshCw size={15} className={isRefreshing ? 'timetable-spin' : ''} />
            <span>Refresh</span>
          </Button>
          {activeDocument ? (
            <Button
              type="button"
              className="button--secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => openDocumentViewer(activeDocument)}
            >
              <Eye size={16} /> View Official Timetable
            </Button>
          ) : mode === 'admin' ? (
            <Button
              type="button"
              className="button--primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveTab('upload')}
            >
              <FileUp size={16} /> Upload Official Timetable
            </Button>
          ) : null}
        </div>
      </div>

      {/* 2. Responsive Filter & Scope Bar */}
      {mode === 'teacher' ? (
        <div className="timetable-teacher-filter-bar">
          <div className="timetable-teacher-filter-main">
            {/* Quick Toggle: All Teachers vs My Timetable */}
            {currentUser?.role === 'teacher' && (
              <div className="timetable-teacher-quick-toggle" role="group" aria-label="Timetable view scope">
                <button
                  type="button"
                  className={`timetable-teacher-quick-btn ${selectedTeacherId === 'all' ? 'timetable-teacher-quick-btn--active' : ''}`}
                  onClick={() => {
                    setSelectedTeacherId('all')
                    setTeacherSearchQuery('')
                  }}
                  title="View full timetable of all teachers"
                >
                  <Users size={14} />
                  <span>All Teachers</span>
                </button>
                <button
                  type="button"
                  className={`timetable-teacher-quick-btn ${selectedTeacherId === currentUser.id ? 'timetable-teacher-quick-btn--active' : ''}`}
                  onClick={() => {
                    setSelectedTeacherId(currentUser.id)
                    setTeacherSearchQuery('')
                  }}
                  title="Filter directly to my timetable"
                >
                  <UserIcon size={14} />
                  <span>My Timetable</span>
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="timetable-teacher-search-box">
              <Search size={16} className="timetable-teacher-search-icon" />
              <input
                type="text"
                placeholder="Search teacher by name, dept, or ID..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="timetable-teacher-search-input"
                aria-label="Search teachers"
              />
              {teacherSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTeacherSearchQuery('')}
                  className="timetable-teacher-search-clear"
                  title="Clear search text"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown Select */}
            <div className="timetable-teacher-select-wrapper">
              <UserIcon size={15} className="timetable-teacher-select-icon" />
              <select
                className="timetable-teacher-select"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                aria-label="Select teacher"
              >
                <option value="all">
                  All Teachers ({accessibleTeachers.length} Faculty)
                </option>
                {accessibleTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.department || 'Faculty'}{t.identifier ? ` (${t.identifier})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filter Button */}
            {(selectedTeacherId !== 'all' || teacherSearchQuery.trim() !== '') && (
              <button
                type="button"
                className="timetable-teacher-clear-btn"
                onClick={handleClearTeacherFilter}
                title="Reset to All Teachers view"
              >
                <RotateCcw size={13} />
                <span>Reset / All Teachers</span>
              </button>
            )}
          </div>

          {/* Quick-Match Search Pills */}
          {teacherSearchQuery.trim() !== '' && (
            <div className="timetable-teacher-search-pills">
              <span className="timetable-teacher-pills-label">Matching ({searchedTeachers.length}):</span>
              {searchedTeachers.length === 0 ? (
                <span className="timetable-teacher-pill-empty">No faculty found matching "{teacherSearchQuery}"</span>
              ) : (
                searchedTeachers.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`timetable-teacher-pill ${selectedTeacherId === t.id ? 'timetable-teacher-pill--active' : ''}`}
                    onClick={() => {
                      setSelectedTeacherId(t.id)
                      setTeacherSearchQuery('')
                    }}
                  >
                    <span>{t.name}</span>
                    <small>{t.department || 'Faculty'}</small>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Current Filter State Notice Banner */}
          <div className="timetable-teacher-status-banner">
            <div className="timetable-teacher-status-info">
              <span className="timetable-teacher-status-dot" />
              <span>
                Currently viewing:{' '}
                <strong>
                  {selectedTeacherId === 'all'
                    ? `All Teachers (Campus-wide · ${accessibleTeachers.length} Faculty Members)`
                    : `${selectedTeacher?.name} (${selectedTeacher?.department || 'Faculty'} · ${selectedTeacher?.identifier || selectedTeacher?.id})`}
                </strong>
              </span>
            </div>
            {selectedTeacherId !== 'all' && (
              <button
                type="button"
                className="timetable-teacher-status-clear"
                onClick={handleClearTeacherFilter}
              >
                View All Teachers <X size={12} />
              </button>
            )}
          </div>
        </div>
      ) : mode === 'admin' ? (
        /* Admin View Mode Toggle & Scope Controls */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="timetable-filter-bar">
            {/* Category Toggle: Class Timetable vs Faculty Timetable */}
            <div className="timetable-admin-category-toggle">
              <button
                type="button"
                className={`timetable-category-btn ${adminTimetableCategory === 'class' ? 'timetable-category-btn--active' : ''}`}
                onClick={() => setAdminTimetableCategory('class')}
              >
                <GraduationCap size={15} />
                <span>Class Timetable</span>
              </button>
              <button
                type="button"
                className={`timetable-category-btn ${adminTimetableCategory === 'teacher' ? 'timetable-category-btn--active' : ''}`}
                onClick={() => setAdminTimetableCategory('teacher')}
              >
                <UserIcon size={15} />
                <span>Faculty Timetable</span>
              </button>
            </div>

            {adminTimetableCategory === 'class' ? (
              <div className="timetable-filter-group" style={{ flexWrap: 'wrap' }}>
                <span className="timetable-filter-label">
                  <GraduationCap size={15} /> Class Scope:
                </span>
                {classes && classes.length > 0 && (
                  <select
                    className="timetable-filter-select"
                    value={selectedClassId}
                    onChange={(e) => handleSelectClass(e.target.value)}
                    aria-label="Filter by class"
                    style={{ fontWeight: 600, borderColor: 'var(--primary-color)' }}
                  >
                    <option value="custom">-- Select Class / Batch --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.courseName} · Sem {cls.semester} Div {cls.division})
                      </option>
                    ))}
                  </select>
                )}
                <select
                  className="timetable-filter-select"
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value)
                    setSelectedClassId('custom')
                  }}
                  aria-label="Filter by course"
                >
                  {dynamicCourses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  className="timetable-filter-select"
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(e.target.value)
                    setSelectedClassId('custom')
                  }}
                  aria-label="Filter by semester"
                >
                  {dynamicSemesters.map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
                <select
                  className="timetable-filter-select"
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value)
                    setSelectedClassId('custom')
                  }}
                  aria-label="Filter by division"
                >
                  {dynamicDivisions.map((d) => (
                    <option key={d} value={d}>Division {d}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {activeDocument && adminTimetableCategory === 'class' && (
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Effective: <strong>{activeDocument.effectiveFrom}</strong>
              </small>
            )}
          </div>

          {/* If admin selected Faculty Timetable, display teacher filter bar */}
          {adminTimetableCategory === 'teacher' && (
            <div className="timetable-teacher-filter-bar">
              <div className="timetable-teacher-filter-main">
                <div className="timetable-teacher-search-box">
                  <Search size={16} className="timetable-teacher-search-icon" />
                  <input
                    type="text"
                    placeholder="Search faculty by name, dept, or ID..."
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    className="timetable-teacher-search-input"
                    aria-label="Search teachers"
                  />
                  {teacherSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTeacherSearchQuery('')}
                      className="timetable-teacher-search-clear"
                      title="Clear search text"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="timetable-teacher-select-wrapper">
                  <UserIcon size={15} className="timetable-teacher-select-icon" />
                  <select
                    className="timetable-teacher-select"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    aria-label="Select teacher"
                  >
                    <option value="all">
                      All Teachers ({accessibleTeachers.length} Faculty)
                    </option>
                    {accessibleTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.department || 'Faculty'}{t.identifier ? ` (${t.identifier})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {currentUser?.role === 'teacher' && (
                  <button
                    type="button"
                    className={`timetable-teacher-my-btn ${selectedTeacherId === currentUser.id ? 'timetable-teacher-my-btn--active' : ''}`}
                    onClick={() => setSelectedTeacherId(currentUser.id)}
                    title="Filter to my faculty schedule"
                  >
                    <UserIcon size={14} />
                    <span>My Timetable</span>
                  </button>
                )}

                {(selectedTeacherId !== 'all' || teacherSearchQuery.trim() !== '') && (
                  <button
                    type="button"
                    className="timetable-teacher-clear-btn"
                    onClick={handleClearTeacherFilter}
                    title="Reset to All Teachers view"
                  >
                    <RotateCcw size={13} />
                    <span>Reset / All Teachers</span>
                  </button>
                )}
              </div>

              {teacherSearchQuery.trim() !== '' && (
                <div className="timetable-teacher-search-pills">
                  <span className="timetable-teacher-pills-label">Matching ({searchedTeachers.length}):</span>
                  {searchedTeachers.length === 0 ? (
                    <span className="timetable-teacher-pill-empty">No faculty found matching "{teacherSearchQuery}"</span>
                  ) : (
                    searchedTeachers.slice(0, 6).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`timetable-teacher-pill ${selectedTeacherId === t.id ? 'timetable-teacher-pill--active' : ''}`}
                        onClick={() => {
                          setSelectedTeacherId(t.id)
                          setTeacherSearchQuery('')
                        }}
                      >
                        <span>{t.name}</span>
                        <small>{t.department || 'Faculty'}</small>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="timetable-teacher-status-banner">
                <div className="timetable-teacher-status-info">
                  <span className="timetable-teacher-status-dot" />
                  <span>
                    Currently viewing:{' '}
                    <strong>
                      {selectedTeacherId === 'all'
                        ? `All Teachers (Campus-wide · ${accessibleTeachers.length} Faculty Members)`
                        : `${selectedTeacher?.name} (${selectedTeacher?.department || 'Faculty'} · ${selectedTeacher?.identifier || selectedTeacher?.id})`}
                    </strong>
                  </span>
                </div>
                {selectedTeacherId !== 'all' && (
                  <button
                    type="button"
                    className="timetable-teacher-status-clear"
                    onClick={handleClearTeacherFilter}
                  >
                    View All Teachers <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Student Timetable View */
        <div className="timetable-student-info-bar">
          <div className="timetable-student-badge">
            <GraduationCap size={16} />
            <span>Enrolled Class: <strong>{selectedCourse} · Sem {selectedSemester} · Div {selectedDivision}</strong></span>
          </div>
          {currentUser?.college && (
            <span className="timetable-student-college-tag">
              {currentUser.college}
            </span>
          )}
          {activeDocument && (
            <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Effective: <strong>{activeDocument.effectiveFrom}</strong>
            </small>
          )}
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="timetable-nav-bar">
        <div className="timetable-segmented-controls">
          <button
            type="button"
            className={`timetable-nav-tab ${
              activeTab === 'today' ? 'timetable-nav-tab--active' : ''
            }`}
            onClick={() => setActiveTab('today')}
          >
            <Clock3 size={15} />
            {mode === 'teacher'
              ? selectedTeacherId === 'all'
                ? 'Campus Schedule Today'
                : `${selectedTeacher?.name?.split(' ')[0] || 'Faculty'}'s Schedule Today`
              : "Today's Schedule"}
          </button>
          <button
            type="button"
            className={`timetable-nav-tab ${
              activeTab === 'weekly' ? 'timetable-nav-tab--active' : ''
            }`}
            onClick={() => setActiveTab('weekly')}
          >
            <Calendar size={15} />
            {mode === 'teacher'
              ? selectedTeacherId === 'all'
                ? 'All Teachers Weekly Grid'
                : 'Weekly Grid'
              : 'Weekly Timetable'}
          </button>
          {mode === 'student' && (
            <button
              type="button"
              className={`timetable-nav-tab ${
                activeTab === 'calendar' ? 'timetable-nav-tab--active' : ''
              }`}
              onClick={() => setActiveTab('calendar')}
            >
              <CalendarDays size={15} /> Calendar Date
            </button>
          )}
          {mode === 'admin' && (
            <>
              <button
                type="button"
                className="timetable-nav-tab"
                onClick={() => handleOpenAddLectureModal()}
              >
                <Plus size={15} /> Add Lecture
              </button>
              <button
                type="button"
                className={`timetable-nav-tab ${
                  activeTab === 'upload' ? 'timetable-nav-tab--active' : ''
                }`}
                onClick={() => setActiveTab('upload')}
              >
                <FileUp size={15} /> Upload / Replace
              </button>
              <button
                type="button"
                className={`timetable-nav-tab ${
                  activeTab === 'holidays' ? 'timetable-nav-tab--active' : ''
                }`}
                onClick={() => setActiveTab('holidays')}
              >
                <Sparkles size={15} /> Holidays ({holidays.length})
              </button>
              <button
                type="button"
                className={`timetable-nav-tab ${
                  activeTab === 'overrides' ? 'timetable-nav-tab--active' : ''
                }`}
                onClick={() => setActiveTab('overrides')}
              >
                <AlertTriangle size={15} /> Overrides ({activeOverrides.length})
              </button>
              <button
                type="button"
                className={`timetable-nav-tab ${
                  activeTab === 'academic' ? 'timetable-nav-tab--active' : ''
                }`}
                onClick={() => setActiveTab('academic')}
              >
                <BookOpen size={15} /> Academic Structure ({(classes || []).length} Classes)
              </button>
            </>
          )}
          {(mode === 'admin' || mode === 'teacher') && (
            <button
              type="button"
              className={`timetable-nav-tab ${
                activeTab === 'leaves' ? 'timetable-nav-tab--active' : ''
              }`}
              onClick={() => setActiveTab('leaves')}
            >
              <UserCheck size={15} /> Faculty Leaves ({collegeLeaves.length})
            </button>
          )}
          <button
            type="button"
            className={`timetable-nav-tab ${
              activeTab === 'documents' ? 'timetable-nav-tab--active' : ''
            }`}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={15} /> Versions ({classDocuments.length})
          </button>
        </div>
      </div>

      {/* 4. Tab Contents */}
      {timetableError ? (
        <div className="card timetable-error-card">
          <AlertTriangle size={40} color="var(--accent-red, #dc2626)" />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Unable to load timetable
          </h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 460 }}>
            {timetableError}
          </p>
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={handleRetry}
            style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : isRefreshing ? (
        <div className="timetable-loading-skeleton">
          <div className="timetable-skeleton-bar" style={{ width: '35%', height: 26 }} />
          <div className="timetable-skeleton-bar" style={{ width: '60%', height: 16 }} />
          <div className="timetable-skeleton-grid">
            <div className="timetable-skeleton-card" />
            <div className="timetable-skeleton-card" />
            <div className="timetable-skeleton-card" />
            <div className="timetable-skeleton-card" />
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: TODAY'S VIEW */}
          {activeTab === 'today' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Date Navigator */}
              <div className="timetable-date-nav">
                <div className="timetable-date-nav__controls">
                  <button
                    type="button"
                    className="timetable-date-nav__btn"
                    onClick={handlePrevDay}
                    title="Previous Day"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    type="button"
                    className="timetable-date-nav__btn"
                    onClick={handleToday}
                    title="Jump to Today"
                  >
                    <Clock size={14} /> Today
                  </button>
                  <button
                    type="button"
                    className="timetable-date-nav__btn"
                    onClick={handleNextDay}
                    title="Next Day"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>

                <div className="timetable-date-nav__center">
                  <span>{formatReadableDate(navDate)}</span>
                  {navDate === getTodayISODate() && (
                    <span className="timetable-date-badge">Today</span>
                  )}
                </div>
              </div>

              {/* Holiday Notice */}
              {navSchedule.isHoliday ? (
                <div className="timetable-holiday-banner">
                  <div className="timetable-holiday-icon">🏖</div>
                  <div className="timetable-holiday-content">
                    <h3>Campus Holiday — {navSchedule.holidayName || 'Official Holiday'}</h3>
                    <p>
                      All lecture sessions for {formatReadableDate(navDate)} are suspended in accordance
                      with the official college calendar.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Next Class Spotlight Card (When viewing today) */}
                  {spotlightInfo && (
                    <div className="timetable-spotlight-card">
                      <div className="timetable-spotlight-left">
                        <span className="timetable-spotlight-tag">
                          <Sparkles size={13} /> {spotlightInfo.statusLabel}
                        </span>
                        <h3 className="timetable-spotlight-title">
                          {spotlightInfo.entry.subjectName || spotlightInfo.entry.subject}
                        </h3>
                        <div className="timetable-spotlight-meta">
                          <span className="lecture-meta-item">
                            <UserIcon size={14} />
                            <strong>
                              {spotlightInfo.entry.substituteTeacherName
                                ? `${spotlightInfo.entry.substituteTeacherName} (Substitute)`
                                : spotlightInfo.entry.teacherName || spotlightInfo.entry.teacher}
                            </strong>
                          </span>
                          <span className="lecture-meta-item">
                            <MapPin size={14} />
                            <strong>{spotlightInfo.entry.room || 'Room TBA'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="timetable-spotlight-right">
                        <span className="timetable-spotlight-time">
                          <Clock3 size={16} />
                          {formatTimeTo12Hour(spotlightInfo.entry.startTime)} –{' '}
                          {formatTimeTo12Hour(spotlightInfo.entry.endTime)}
                        </span>
                        <span className="timetable-spotlight-timing-note">
                          {spotlightInfo.timingNote}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Today's Lectures Stream */}
                  {navSchedule.entries.length === 0 ? (
                    <Card>
                      <EmptyState
                        title={
                          mode === 'teacher' && selectedTeacher
                            ? `No classes scheduled for ${selectedTeacher.name}`
                            : 'No lectures scheduled'
                        }
                        detail={
                          mode === 'teacher'
                            ? selectedTeacher
                              ? `No teaching sessions or duties are scheduled for ${selectedTeacher.name} on this date.`
                              : 'No teaching sessions or substitute duties are scheduled across campus for this date.'
                            : 'No lectures are scheduled for this date. Enjoy your day!'
                        }
                        action={
                          mode === 'teacher' && selectedTeacherId !== 'all' ? (
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={handleClearTeacherFilter}
                              style={{ marginTop: 8 }}
                            >
                              View All Teachers
                            </button>
                          ) : mode === 'admin' ? (
                            <button
                              type="button"
                              className="button button--primary button--sm"
                              onClick={() => setActiveTab('create')}
                              style={{ marginTop: 8 }}
                            >
                              <Plus size={15} /> Add Lecture
                            </button>
                          ) : undefined
                        }
                      />
                    </Card>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <SectionHeading
                        title={`Scheduled Lectures (${navSchedule.entries.length})`}
                        detail="Click on any lecture card to view complete session details"
                      />
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                          gap: 16,
                        }}
                      >
                        {navSchedule.entries.map((entry) => renderLectureCard(entry, true))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: WEEKLY TIMETABLE VIEW */}
          {activeTab === 'weekly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Desktop & Tablet Time x Day Grid View */}
              <div className="timetable-desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Weekly Topbar: Scope badge, lecture count, and status legend */}
                <div className="timetable-weekly-topbar">
                  <div className="timetable-weekly-topbar__info">
                    <span className="timetable-weekly-topbar__badge">
                      {mode === 'teacher' || (mode === 'admin' && adminTimetableCategory === 'teacher') ? (
                        <>
                          <UserIcon size={14} />
                          <span>
                            {selectedTeacherId === 'all'
                              ? `All Teachers (${accessibleTeachers.length} Faculty)`
                              : selectedTeacher?.name || 'Faculty Schedule'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Users size={14} />
                          <span>
                            {selectedCourse} · Sem {selectedSemester} · Div {selectedDivision}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="timetable-weekly-topbar__count">
                      {weeklyEntriesCount} Weekly {weeklyEntriesCount === 1 ? 'Lecture' : 'Lectures'}
                    </span>
                  </div>

                  {/* Status Indicator Legend */}
                  <div className="timetable-weekly-legend">
                    <span className="timetable-legend-pill timetable-legend-pill--scheduled">
                      <span className="timetable-legend-dot" /> Regular
                    </span>
                    <span className="timetable-legend-pill timetable-legend-pill--substitute">
                      <span className="timetable-legend-dot" /> Substitute
                    </span>
                    <span className="timetable-legend-pill timetable-legend-pill--room_changed">
                      <span className="timetable-legend-dot" /> Room Changed
                    </span>
                    <span className="timetable-legend-pill timetable-legend-pill--rescheduled">
                      <span className="timetable-legend-dot" /> Rescheduled
                    </span>
                    <span className="timetable-legend-pill timetable-legend-pill--cancelled">
                      <span className="timetable-legend-dot" /> Cancelled
                    </span>
                  </div>
                </div>

                {/* Empty State Banner if no weekly entries */}
                {weeklyEntriesCount === 0 && (
                  <div className="timetable-empty-weekly-banner">
                    <UserIcon size={22} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <h4>No classes scheduled{selectedTeacher ? ` for ${selectedTeacher.name}` : ''}</h4>
                      <p>
                        {selectedTeacher
                          ? `There are no active timetable entries for ${selectedTeacher.name}.`
                          : 'No timetable entries found for this selection.'}
                      </p>
                    </div>
                    {selectedTeacherId !== 'all' && (
                      <button
                        type="button"
                        className="button button--secondary button--sm"
                        onClick={handleClearTeacherFilter}
                      >
                        View All Teachers
                      </button>
                    )}
                  </div>
                )}

                {/* Controlled Horizontal Scroll Wrapper */}
                <div className="timetable-weekly-scroll-wrapper">
                  <div className="timetable-grid-table">
                    {/* 1. Header Row: Corner Cell (Sticky top-left) */}
                    <div className="timetable-grid-corner-cell">
                      <Clock3 size={14} />
                      <span>Time</span>
                    </div>

                    {/* 2. Header Row: 6 Day Headers (Sticky top) */}
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const isToday = currentWeekdayName === day
                      const dayEntries = activeWeeklyEntries.filter((e) => e.dayOfWeek === day)

                      return (
                        <div
                          key={day}
                          className={`timetable-grid-day-header ${
                            isToday ? 'timetable-grid-day-header--today' : ''
                          }`}
                          style={{ gridRow: 1, gridColumn: idx + 2 }}
                        >
                          <div className="timetable-grid-day-header__title">
                            <span className="timetable-grid-day-full">{day}</span>
                            <span className="timetable-grid-day-short">{day.substring(0, 3)}</span>
                            {isToday && <span className="timetable-grid-today-chip">Today</span>}
                          </div>
                          <span className="timetable-grid-day-count">
                            {dayEntries.length} {dayEntries.length === 1 ? 'lecture' : 'lectures'}
                          </span>
                        </div>
                      )
                    })}

                    {/* 3. Body Row: Sticky Left Time Column */}
                    <div
                      className="timetable-grid-time-column"
                      style={{ height: `${totalCanvasHeight}px`, gridRow: 2, gridColumn: 1 }}
                    >
                      {timeSlots.map((slot) => (
                        <div
                          key={slot.hour}
                          className="timetable-grid-time-slot"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        >
                          <span className="timetable-grid-time-text">{slot.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* 4. Body Row: 6 Day Canvases */}
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const isToday = currentWeekdayName === day
                      const dayEntries = activeWeeklyEntries.filter((e) => e.dayOfWeek === day)
                      const positioned = layoutDayLectures(dayEntries, minHour, HOUR_HEIGHT)

                      return (
                        <div
                          key={day}
                          className={`timetable-grid-day-canvas ${
                            isToday ? 'timetable-grid-day-canvas--today' : ''
                          }`}
                          style={{ height: `${totalCanvasHeight}px`, gridRow: 2, gridColumn: idx + 2 }}
                        >
                          {/* Background Hour Rows with dashed half-hour line & empty slot click */}
                          {timeSlots.map((slot) => {
                            const slotStartMin = slot.hour * 60
                            const slotEndMin = (slot.hour + 1) * 60
                            const isOccupied = dayEntries.some((e) => {
                              const { startMin, endMin } = getEntryMinutes(e)
                              return Math.max(startMin, slotStartMin) < Math.min(endMin, slotEndMin)
                            })

                            return (
                              <div
                                key={slot.hour}
                                className="timetable-grid-hour-row"
                                style={{ height: `${HOUR_HEIGHT}px` }}
                              >
                                <div className="timetable-grid-half-hour-line" />
                                {!isOccupied && (mode === 'admin' || mode === 'teacher') && (
                                  <button
                                    type="button"
                                    className="timetable-grid-empty-slot"
                                    onClick={() => {
                                      const startStr = `${String(slot.hour).padStart(2, '0')}:00`
                                      const endStr = `${String(slot.hour + 1).padStart(2, '0')}:00`
                                      handleOpenAddLectureModal(day, startStr, endStr)
                                    }}
                                    title={`Click to add lecture on ${day} (${slot.label})`}
                                  >
                                    <span className="timetable-grid-empty-slot-btn">
                                      <Plus size={11} /> Add Lecture
                                    </span>
                                  </button>
                                )}
                              </div>
                            )
                          })}

                          {/* Real-time Now Indicator if Today */}
                          {isToday && nowIndicatorTop >= 0 && nowIndicatorTop <= totalCanvasHeight && (
                            <div
                              className="timetable-grid-now-indicator"
                              style={{ top: `${nowIndicatorTop}px` }}
                              title="Current Time"
                            >
                              <span className="timetable-grid-now-dot" />
                            </div>
                          )}

                          {/* Empty state notice for day with 0 lectures */}
                          {dayEntries.length === 0 && (
                            <div className="timetable-grid-empty-day-notice">
                              <span>No classes</span>
                            </div>
                          )}

                          {/* Positioned Lecture Cards */}
                          {positioned.map(({ entry, top, height, leftPercent, widthPercent }) => {
                            const status = entry.status || 'Scheduled'
                            const isParallel = widthPercent < 75
                            const isCompact = widthPercent < 45
                            const isVeryCompact = widthPercent < 30

                            const formattedTime =
                              entry.startTime && entry.endTime
                                ? isVeryCompact
                                  ? `${entry.startTime} – ${entry.endTime}`
                                  : `${formatTimeTo12Hour(entry.startTime)} – ${formatTimeTo12Hour(entry.endTime)}`
                                : entry.time

                            const teacherDisplay = entry.substituteTeacherName
                              ? `${entry.substituteTeacherName} (Sub)`
                              : entry.teacherName || entry.teacher

                            return (
                              <div
                                key={entry.id}
                                className={`timetable-grid-card timetable-grid-card--${
                                  STATUS_TONE[status] || 'scheduled'
                                } ${isParallel ? 'timetable-grid-card--parallel' : ''} ${
                                  isCompact ? 'timetable-grid-card--compact' : ''
                                } ${isVeryCompact ? 'timetable-grid-card--very-compact' : ''}`}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  left: `calc(${leftPercent}% + 2px)`,
                                  width: `calc(${widthPercent}% - 4px)`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedLectureDetails(entry)
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setSelectedLectureDetails(entry)
                                  }
                                }}
                                title={`${entry.subjectName || entry.subject}\nClass: ${entry.className || `${entry.course} S${entry.semester}-${entry.division}`}\nTime: ${formattedTime}\nTeacher: ${teacherDisplay}\nRoom: ${entry.room || 'Room TBA'}\nClick to view complete details`}
                              >
                                {/* Card Header: Time & Class tag & Status tag */}
                                <div className="timetable-grid-card__header">
                                  <span className="timetable-grid-card__time">
                                    <Clock3 size={10} style={{ flexShrink: 0 }} />
                                    <span>{formattedTime}</span>
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                    {mode !== 'student' && entry.course && (
                                      <span
                                        className="timetable-grid-card__class-tag"
                                        title={entry.className || `${entry.course} Sem ${entry.semester}-${entry.division}`}
                                      >
                                        {entry.division ? `${entry.course.split(' ')[0]} ${entry.division}` : entry.course.split(' ')[0]}
                                      </span>
                                    )}
                                    {status !== 'Scheduled' && (
                                      <span
                                        className={`timetable-grid-card__status-tag timetable-grid-card__status-tag--${
                                          STATUS_TONE[status] || 'scheduled'
                                        }`}
                                      >
                                        {status === 'Room_Changed'
                                          ? 'Room'
                                          : status === 'Substitute'
                                          ? 'Sub'
                                          : status}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Subject Title */}
                                <div className="timetable-grid-card__title" title={entry.subjectName || entry.subject}>
                                  {entry.subjectName || entry.subject}
                                </div>

                                {/* Meta items: Room, Teacher */}
                                <div className="timetable-grid-card__meta">
                                  <span className="timetable-grid-card__meta-item timetable-grid-card__meta-item--priority" title={entry.room || 'Room TBA'}>
                                    <MapPin size={9} style={{ flexShrink: 0 }} />
                                    <span>{entry.room || 'Room TBA'}</span>
                                  </span>
                                  <span className="timetable-grid-card__meta-item timetable-grid-card__meta-item--priority" title={teacherDisplay}>
                                    <UserIcon size={9} style={{ flexShrink: 0 }} />
                                    <span>{teacherDisplay}</span>
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Mobile View: Day Selector Tabs + Day Cards OR All Days List */}
              <div
                className="timetable-mobile-only"
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {/* View Mode Toggle (Single Day vs All Days) */}
                <div className="timetable-mobile-view-toggle">
                  <button
                    type="button"
                    className={`timetable-toggle-btn ${
                      mobileWeekMode === 'day' ? 'timetable-toggle-btn--active' : ''
                    }`}
                    onClick={() => setMobileWeekMode('day')}
                  >
                    Day by Day
                  </button>
                  <button
                    type="button"
                    className={`timetable-toggle-btn ${
                      mobileWeekMode === 'all' ? 'timetable-toggle-btn--active' : ''
                    }`}
                    onClick={() => setMobileWeekMode('all')}
                  >
                    All Week
                  </button>
                </div>

                {mobileWeekMode === 'day' ? (
                  <>
                    {/* Day selector pill buttons matching student mobile reference */}
                    <div className="timetable-day-selector">
                      {DAYS_OF_WEEK.map((day) => {
                        const count = activeWeeklyEntries.filter((e) => e.dayOfWeek === day).length
                        const isToday = currentWeekdayName === day
                        const isSelected = selectedDay === day
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`timetable-day-btn ${
                              isSelected ? 'timetable-day-btn--active' : ''
                            } ${isToday ? 'timetable-day-btn--today' : ''}`}
                            onClick={() => setSelectedDay(day)}
                          >
                            <span className="timetable-day-btn__name">{day.substring(0, 3).toUpperCase()}</span>
                            <span className="timetable-day-btn__count">{count} {count === 1 ? 'class' : 'classes'}</span>
                            {isToday && <span className="timetable-day-btn__dot" title="Today" />}
                          </button>
                        )
                      })}
                    </div>

                    {/* Day Schedule Header & Cards */}
                    {(() => {
                      const entries = activeWeeklyEntries
                        .filter((e) => e.dayOfWeek === selectedDay)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div className="timetable-mobile-section-header">
                            <div>
                              <h3 className="timetable-mobile-section-title">
                                {selectedDay} Timetable
                              </h3>
                              <p className="timetable-mobile-section-desc">
                                {entries.length} {entries.length === 1 ? 'Class' : 'Classes'} Scheduled
                                {mode === 'student'
                                  ? ` · ${selectedCourse} Sem ${selectedSemester}-${selectedDivision}`
                                  : selectedTeacherId === 'all'
                                  ? ' · All Teachers'
                                  : ` · ${selectedTeacher?.name || 'Faculty'}`}
                              </p>
                            </div>
                            {(mode === 'admin' || mode === 'teacher') && (
                              <button
                                type="button"
                                className="button button--primary button--sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}
                                onClick={() => handleOpenAddLectureModal(selectedDay)}
                              >
                                <Plus size={13} /> Add
                              </button>
                            )}
                          </div>

                          {entries.length === 0 ? (
                            <Card>
                              <EmptyState
                                title={`No classes on ${selectedDay}`}
                                detail="There are no recurring sessions scheduled for this day."
                              />
                            </Card>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {entries.map((entry) => renderLectureCard(entry, true))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  /* All Week Stream View */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {DAYS_OF_WEEK.map((day) => {
                      const entries = activeWeeklyEntries
                        .filter((e) => e.dayOfWeek === day)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))

                      if (entries.length === 0) return null
                      return (
                        <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              paddingBottom: 4,
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <span>{day}</span>
                            <span className="timetable-column-count">{entries.length}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {entries.map((entry) => renderLectureCard(entry, true))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CALENDAR DATE VIEW (Student) */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    marginBottom: 6,
                    color: 'var(--text-main)',
                  }}
                >
                  Select Date to Inspect Schedule:
                </label>
                <input
                  type="date"
                  className="timetable-filter-select"
                  value={calendarDate}
                  onChange={(e) => setCalendarDate(e.target.value)}
                  style={{ minWidth: 220, padding: '8px 12px' }}
                />
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', paddingTop: 18 }}>
                Day of week: <strong>{getDayOfWeekFromDate(calendarDate)}</strong>
              </div>
            </div>
          </Card>

          {calendarSchedule.isHoliday ? (
            <div className="timetable-holiday-banner">
              <div className="timetable-holiday-icon">🏖</div>
              <div className="timetable-holiday-content">
                <h3>Campus Holiday — {calendarSchedule.holidayName}</h3>
                <p>No lectures are scheduled on {formatReadableDate(calendarDate)} due to the official holiday.</p>
              </div>
            </div>
          ) : calendarSchedule.entries.length === 0 ? (
            <Card>
              <EmptyState
                title={`No classes on ${formatReadableDate(calendarDate)}`}
                detail="There are no lectures programmed for this date."
              />
            </Card>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {calendarSchedule.entries.map((entry) => renderLectureCard(entry, false))}
            </div>
          )}
        </div>
      )}



      {/* TAB 5: UPLOAD / REPLACE TIMETABLE DOCUMENT (Admin) */}
      {activeTab === 'upload' && mode === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <SectionHeading
              title="Upload Official Timetable Document"
              detail="Upload an official visual timetable (PDF or image). Uploading will automatically increment the version (v1 -> v2) and archive the prior active timetable."
            />

            {uploadSuccess && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#065f46',
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <Check size={16} style={{ display: 'inline', marginRight: 6 }} />
                {uploadSuccess}
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#991b1b',
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
                {uploadError}
              </div>
            )}

            <form
              onSubmit={handleUploadDocument}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div className="timetable-form-grid">
                <div>
                  <label className="field-label">Academic Year</label>
                  <input
                    type="text"
                    className="input"
                    value={uploadAcademicYear}
                    onChange={(e) => setUploadAcademicYear(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Effective From</label>
                  <input
                    type="date"
                    className="input"
                    value={uploadEffectiveFrom}
                    onChange={(e) => setUploadEffectiveFrom(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="field-label">Timetable File (PDF or Image under 20MB)</label>
                <div
                  className="timetable-file-dropzone"
                  onClick={() => document.getElementById('timetable-file-input')?.click()}
                >
                  <FileUp size={40} className="text-primary" />
                  {uploadFile ? (
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                        {uploadFile.name}
                      </strong>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '0.84rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                        Click or drag to select timetable file
                      </strong>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '0.84rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Supports PDF, PNG, JPG, and WEBP files up to 20MB
                      </p>
                    </div>
                  )}
                  <input
                    id="timetable-file-input"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0])
                      }
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button type="submit" className="button--primary" disabled={uploadLoading}>
                  {uploadLoading ? (
                    <>
                      <RefreshCw size={16} className="spinning" /> Uploading...
                    </>
                  ) : (
                    <>
                      <FileUp size={16} /> Upload & Publish Version
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 6: HOLIDAYS MANAGER (Admin) */}
      {activeTab === 'holidays' && mode === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <SectionHeading
              title="Add College Holiday"
              detail="Holidays take top priority in the schedule resolution. All lectures are suspended on holiday dates."
            />

            {holidaySuccess && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#065f46',
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <Check size={16} style={{ display: 'inline', marginRight: 6 }} />
                {holidaySuccess}
              </div>
            )}

            <form
              onSubmit={handleAddHolidaySubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div className="timetable-form-grid">
                <div>
                  <label className="field-label">Holiday Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Diwali Break, Gandhi Jayanti"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Scope</label>
                  <select
                    className="select"
                    value={holidayScope}
                    onChange={(e) => setHolidayScope(e.target.value as any)}
                  >
                    <option value="all">Entire College (All Classes)</option>
                    <option value="course">This Course Only</option>
                    <option value="semester">This Semester Only</option>
                    <option value="division">This Division Only</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Description (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. National holiday, campus closed"
                    value={holidayDesc}
                    onChange={(e) => setHolidayDesc(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" className="button--primary">
                  <Plus size={16} /> Add Holiday
                </Button>
              </div>
            </form>
          </Card>

          {/* Holiday List Table */}
          <Card>
            <SectionHeading
              title="Declared Holidays"
              detail={`${holidays.length} holiday(s) in academic calendar`}
            />
            {holidays.length === 0 ? (
              <EmptyState
                title="No holidays declared"
                detail="Add official college holidays using the form above."
              />
            ) : (
              <div className="archive-table-container">
                <table className="archive-table">
                  <thead>
                    <tr>
                      <th>Holiday Name</th>
                      <th>Date</th>
                      <th>Scope</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <strong>{h.name}</strong>
                        </td>
                        <td>{formatReadableDate(h.date)}</td>
                        <td>
                          <span className="lecture-status-tag lecture-status-tag--scheduled">
                            {h.scope.toUpperCase()}
                          </span>
                        </td>
                        <td>{h.description || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="button button--danger button--sm"
                            onClick={() => deleteHoliday(h.id)}
                            title="Delete holiday"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 7: ACTIVE OVERRIDES (Admin / Teacher) */}
      {activeTab === 'overrides' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SectionHeading
            title="Emergency & Daily Overrides"
            detail="Lectures modified with date-specific overrides, cancellations, or room / teacher shifts"
          />
          {activeOverrides.length === 0 ? (
            <Card>
              <EmptyState
                title="No active overrides"
                detail="All lectures are currently running according to the regular weekly timetable."
              />
            </Card>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {activeOverrides.map((entry) => renderLectureCard(entry, true))}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: DOCUMENT HISTORY / ARCHIVE */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SectionHeading
            title="Official Visual Timetable Documents"
            detail={`History of published versions for ${selectedCourse} Sem ${selectedSemester} Div ${selectedDivision}`}
          />
          {classDocuments.length === 0 ? (
            <Card>
              <EmptyState
                title="No documents uploaded yet"
                detail="Upload an official timetable PDF or image to make it accessible to students and faculty."
                action={
                  mode === 'admin' ? (
                    <button
                      type="button"
                      className="button button--primary button--sm"
                      onClick={() => setActiveTab('upload')}
                      style={{ marginTop: 8 }}
                    >
                      <FileUp size={15} /> Upload Official Timetable
                    </button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <Card>
              <div className="archive-table-container">
                <table className="archive-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Status</th>
                      <th>File Name</th>
                      <th>Effective From</th>
                      <th>Uploaded On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <strong>v{doc.version}</strong>
                        </td>
                        <td>
                          {doc.isActive ? (
                            <span className="timetable-version-badge">Active</span>
                          ) : (
                            <span className="timetable-version-badge timetable-version-badge--archived">
                              Archived
                            </span>
                          )}
                        </td>
                        <td>{doc.fileName}</td>
                        <td>{doc.effectiveFrom}</td>
                        <td>{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={() => openDocumentViewer(doc)}
                            >
                              <Eye size={14} /> View
                            </button>
                            <a
                              href={doc.fileUrl}
                              download={doc.fileName}
                              target="_blank"
                              rel="noreferrer"
                              className="button button--secondary button--sm"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 9: FACULTY LEAVE & RETURN MANAGEMENT (Feature #21) */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionHeading
            title="Faculty Leave & Availability Management"
            detail="Track faculty absence, identify affected lecture slots, assign substitutes or reschedule, and manage safe returns."
            action={
              mode === 'admin' ? (
                <button
                  type="button"
                  className="button button--primary button--sm"
                  onClick={() => {
                    setLeaveFormTeacherId('')
                    setLeaveFormStartDate(getTodayISODate())
                    setLeaveFormEndDate(getTodayISODate())
                    setLeaveFormReason('')
                    setLeaveFormNotes('')
                    setLeaveFormError(null)
                    setIsAddLeaveModalOpen(true)
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={16} /> Add Teacher Leave
                </button>
              ) : (
                <button
                  type="button"
                  className="button button--primary button--sm"
                  onClick={() => {
                    setLeaveFormTeacherId(currentUser?.id || '')
                    setLeaveFormStartDate(getTodayISODate())
                    setLeaveFormEndDate(getTodayISODate())
                    setLeaveFormReason('')
                    setLeaveFormNotes('')
                    setLeaveFormError(null)
                    setIsAddLeaveModalOpen(true)
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={16} /> Request Leave
                </button>
              )
            }
          />

          {/* 1. Summary Metrics Strip */}
          <div className="timetable-leave-metrics-grid">
            <div className="timetable-leave-metric-card timetable-leave-metric-card--active">
              <div className="timetable-leave-metric-icon">
                <Clock size={20} />
              </div>
              <div className="timetable-leave-metric-content">
                <span className="timetable-leave-metric-label">Active Leaves</span>
                <strong className="timetable-leave-metric-value">{leaveMetrics.active}</strong>
                <small className="timetable-leave-metric-detail">Currently away from campus</small>
              </div>
            </div>

            <div className="timetable-leave-metric-card timetable-leave-metric-card--upcoming">
              <div className="timetable-leave-metric-icon">
                <CalendarDays size={20} />
              </div>
              <div className="timetable-leave-metric-content">
                <span className="timetable-leave-metric-label">Upcoming Leaves</span>
                <strong className="timetable-leave-metric-value">{leaveMetrics.upcoming}</strong>
                <small className="timetable-leave-metric-detail">Scheduled in advance</small>
              </div>
            </div>

            <div className="timetable-leave-metric-card timetable-leave-metric-card--available">
              <div className="timetable-leave-metric-icon">
                <UserCheck size={20} />
              </div>
              <div className="timetable-leave-metric-content">
                <span className="timetable-leave-metric-label">Available Faculty</span>
                <strong className="timetable-leave-metric-value">
                  {leaveMetrics.availableFacultyCount} / {accessibleTeachers.length}
                </strong>
                <small className="timetable-leave-metric-detail">On duty on campus</small>
              </div>
            </div>

            <div className="timetable-leave-metric-card timetable-leave-metric-card--completed">
              <div className="timetable-leave-metric-icon">
                <CheckCircle size={20} />
              </div>
              <div className="timetable-leave-metric-content">
                <span className="timetable-leave-metric-label">Completed / History</span>
                <strong className="timetable-leave-metric-value">{leaveMetrics.completed}</strong>
                <small className="timetable-leave-metric-detail">Past leaves & early returns</small>
              </div>
            </div>
          </div>

          {/* 2. Filter & Search Controls Bar */}
          <div className="timetable-leave-filter-bar">
            <div className="timetable-leave-search-box">
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search faculty by name, department, or reason..."
                value={leaveSearchQuery}
                onChange={(e) => setLeaveSearchQuery(e.target.value)}
              />
              {leaveSearchQuery && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setLeaveSearchQuery('')}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="timetable-leave-filter-controls">
              <select
                className="select"
                value={leaveStatusFilter}
                onChange={(e) => setLeaveStatusFilter(e.target.value as any)}
                aria-label="Filter by leave status"
              >
                <option value="all">All Leave Statuses</option>
                <option value="ACTIVE">Active (On Leave)</option>
                <option value="UPCOMING">Upcoming Leaves</option>
                <option value="EARLY_RETURN">Returned Early</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                className="select"
                value={leaveDeptFilter}
                onChange={(e) => setLeaveDeptFilter(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="all">All Departments</option>
                {collegeDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {(leaveSearchQuery || leaveStatusFilter !== 'all' || leaveDeptFilter !== 'all') && (
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => {
                    setLeaveSearchQuery('')
                    setLeaveStatusFilter('all')
                    setLeaveDeptFilter('all')
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <RotateCcw size={13} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* 3. Leave Cards Grid */}
          {filteredLeaves.length === 0 ? (
            <Card>
              <EmptyState
                title="No faculty leaves found"
                detail={
                  leaveSearchQuery || leaveStatusFilter !== 'all' || leaveDeptFilter !== 'all'
                    ? 'No faculty leave records match your active search or filters.'
                    : 'All faculty members are currently available with no leaves recorded.'
                }
                action={
                  mode === 'admin' ? (
                    <button
                      type="button"
                      className="button button--primary button--sm"
                      onClick={() => {
                        setLeaveFormTeacherId('')
                        setLeaveFormStartDate(getTodayISODate())
                        setLeaveFormEndDate(getTodayISODate())
                        setLeaveFormReason('')
                        setLeaveFormNotes('')
                        setLeaveFormError(null)
                        setIsAddLeaveModalOpen(true)
                      }}
                      style={{ marginTop: 8 }}
                    >
                      <Plus size={15} /> Add Teacher Leave
                    </button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="timetable-leave-grid">
              {filteredLeaves.map((leave) => {
                const todayStr = getTodayISODate()
                const isActive =
                  leave.status === 'ACTIVE' ||
                  (!leave.actualReturnDate && todayStr >= leave.startDate && todayStr <= leave.endDate)
                const isUpcoming = leave.status === 'UPCOMING' || (!leave.actualReturnDate && todayStr < leave.startDate)
                const isEarlyReturn = leave.status === 'EARLY_RETURN' || Boolean(leave.actualReturnDate)

                return (
                  <div
                    key={leave.id}
                    className={`timetable-leave-card ${
                      isActive
                        ? 'timetable-leave-card--active'
                        : isUpcoming
                        ? 'timetable-leave-card--upcoming'
                        : isEarlyReturn
                        ? 'timetable-leave-card--early-return'
                        : 'timetable-leave-card--completed'
                    }`}
                  >
                    {/* Top: Faculty Info & Status Pill */}
                    <div className="timetable-leave-card-header">
                      <div className="timetable-leave-faculty-info">
                        <div className="avatar avatar--small">
                          {leave.teacherName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <strong className="timetable-leave-faculty-name">{leave.teacherName}</strong>
                          <div className="timetable-leave-faculty-dept">
                            {leave.teacherDepartment || 'Faculty'}
                            {accessibleTeachers.find((t) => t.id === leave.teacherId)?.identifier
                              ? ` · ${accessibleTeachers.find((t) => t.id === leave.teacherId)?.identifier}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`timetable-leave-status-pill timetable-leave-status-pill--${
                          isActive
                            ? 'active'
                            : isUpcoming
                            ? 'upcoming'
                            : isEarlyReturn
                            ? 'early-return'
                            : 'completed'
                        }`}
                      >
                        {isActive
                          ? '🟠 Active Leave'
                          : isUpcoming
                          ? '🔵 Upcoming'
                          : isEarlyReturn
                          ? '🟢 Returned Early'
                          : '⚪ Completed'}
                      </span>
                    </div>

                    {/* Body: Dates, Type & Reason */}
                    <div className="timetable-leave-card-body">
                      <div className="timetable-leave-dates-row">
                        <Calendar size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>
                          <strong>{formatReadableDate(leave.startDate)}</strong> to{' '}
                          <strong>{formatReadableDate(leave.endDate)}</strong>
                        </span>
                        <span className="timetable-leave-type-chip">{leave.leaveType}</span>
                      </div>

                      {leave.leaveType === 'Partial Day' && leave.startTime && leave.endTime && (
                        <div className="timetable-leave-time-row">
                          <Clock3 size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>
                            Absence Hours: {formatTimeTo12Hour(leave.startTime)} – {formatTimeTo12Hour(leave.endTime)}
                          </span>
                        </div>
                      )}

                      <div className="timetable-leave-reason-box">
                        <strong>Reason:</strong> {leave.reason || 'Personal Leave'}
                      </div>

                      {leave.actualReturnDate && (
                        <div className="timetable-leave-return-notice">
                          <CheckCircle size={14} color="var(--accent-emerald, #059669)" />
                          <span>
                            Returned on <strong>{formatReadableDate(leave.actualReturnDate)}</strong>
                            {leave.returnNotes ? ` — ${leave.returnNotes}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Affected Statistics Strip */}
                      <div className="timetable-leave-stats-strip">
                        <div className="timetable-leave-stat-item">
                          <span>Affected</span>
                          <strong>{leave.affectedLectureCount || 0}</strong>
                        </div>
                        <div className="timetable-leave-stat-item timetable-leave-stat-item--cancelled">
                          <span>Cancelled</span>
                          <strong>{leave.cancelledCount || 0}</strong>
                        </div>
                        <div className="timetable-leave-stat-item timetable-leave-stat-item--sub">
                          <span>Substituted</span>
                          <strong>{leave.substitutedCount || 0}</strong>
                        </div>
                        <div className="timetable-leave-stat-item timetable-leave-stat-item--resched">
                          <span>Rescheduled</span>
                          <strong>{leave.rescheduledCount || 0}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="timetable-leave-card-footer">
                      <button
                        type="button"
                        className="button button--secondary button--sm"
                        onClick={() => setAffectedModalLeave(leave)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <FileText size={14} />
                        Manage Affected ({leave.affectedLectureCount || 0})
                      </button>

                      {(isActive || isUpcoming) && mode === 'admin' && (
                        <button
                          type="button"
                          className="button button--secondary button--sm"
                          onClick={() => {
                            setReturnConfirmLeave(leave)
                            setReturnConfirmDate(getTodayISODate())
                            setReturnConfirmNotes('')
                          }}
                          style={{
                            color: 'var(--accent-emerald, #059669)',
                            borderColor: 'var(--accent-emerald, #059669)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <CheckCircle size={14} /> Mark Returned Early
                        </button>
                      )}

                      {mode === 'admin' && (
                        <button
                          type="button"
                          className="button button--danger button--sm"
                          onClick={() => setDeleteLeaveConfirm(leave)}
                          title="Delete Leave Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: ACADEMIC STRUCTURE (Courses, Classes, Divisions Management) */}
      {activeTab === 'academic' && mode === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Top Bar: Sub-Tabs & Filters & Actions */}
          <div className="academic-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`button button--sm ${academicSubTab === 'tree' ? 'button--primary' : 'button--secondary'}`}
                onClick={() => setAcademicSubTab('tree')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Layers size={15} /> Hierarchical Structure
              </button>
              <button
                type="button"
                className={`button button--sm ${academicSubTab === 'classes' ? 'button--primary' : 'button--secondary'}`}
                onClick={() => setAcademicSubTab('classes')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <GraduationCap size={15} /> Classes & Divisions ({(classes || []).length})
              </button>
              <button
                type="button"
                className={`button button--sm ${academicSubTab === 'courses' ? 'button--primary' : 'button--secondary'}`}
                onClick={() => setAcademicSubTab('courses')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <BookOpen size={15} /> College Courses ({(courses || []).length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="timetable-search-box" style={{ maxWidth: 220 }}>
                <Search size={15} className="timetable-search-icon" />
                <input
                  type="text"
                  placeholder="Search course or class..."
                  value={academicSearchQuery}
                  onChange={(e) => setAcademicSearchQuery(e.target.value)}
                  className="timetable-search-input"
                />
              </div>

              <select
                className="select"
                style={{ maxWidth: 130, padding: '6px 10px', fontSize: '0.82rem' }}
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
              >
                <option value="all">All Years</option>
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
              </select>

              <select
                className="select"
                style={{ maxWidth: 130, padding: '6px 10px', fontSize: '0.82rem' }}
                value={academicStatusFilter}
                onChange={(e) => setAcademicStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="archived">Archived Only</option>
              </select>

              <button
                type="button"
                className="button button--secondary button--sm"
                onClick={() => {
                  setCourseFormName('')
                  setCourseFormCode('')
                  setCourseFormDepartment('Information Technology')
                  setIsAddCourseModalOpen(true)
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={15} /> Add Course
              </button>

              <button
                type="button"
                className="button button--primary button--sm"
                onClick={() => {
                  setClassFormName('')
                  setClassFormDivision('A')
                  setIsAddClassModalOpen(true)
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={15} /> Add Class
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Hierarchical Structure (Course -> Semester -> Classes) */}
          {academicSubTab === 'tree' && (
            <div className="academic-tree-container">
              {(() => {
                const filteredCourses = (courses || []).filter((crs) => {
                  if (academicStatusFilter !== 'all') {
                    const crsStatus = crs.status || (crs.isActive !== false ? 'active' : 'archived')
                    if (crsStatus !== academicStatusFilter) return false
                  }
                  if (!academicSearchQuery.trim()) return true
                  const q = academicSearchQuery.trim().toLowerCase()
                  return (
                    crs.name.toLowerCase().includes(q) ||
                    crs.code.toLowerCase().includes(q) ||
                    (crs.department && crs.department.toLowerCase().includes(q))
                  )
                })

                if (filteredCourses.length === 0) {
                  return (
                    <EmptyState
                      title="No Courses Found"
                      detail="No courses match the current search or status filter. Click '+ Add Course' to create one."
                    />
                  )
                }

                return filteredCourses.map((crs) => {
                  const isCourseArchived = (crs.status || (crs.isActive !== false ? 'active' : 'archived')) === 'archived'
                  const matchingClasses = (classes || []).filter((cls) => {
                    const matchesCourse =
                      cls.courseId === crs.id ||
                      cls.courseName === crs.name ||
                      courseMatches(cls.courseName, crs.name)
                    if (!matchesCourse) return false
                    if (academicYearFilter !== 'all' && cls.academicYear && cls.academicYear !== academicYearFilter) {
                      return false
                    }
                    if (academicStatusFilter !== 'all') {
                      const clsStatus = cls.status || (cls.isActive !== false ? 'active' : 'archived')
                      if (clsStatus !== academicStatusFilter) return false
                    }
                    if (academicSearchQuery.trim()) {
                      const q = academicSearchQuery.trim().toLowerCase()
                      return (
                        cls.name.toLowerCase().includes(q) ||
                        cls.division.toLowerCase().includes(q) ||
                        cls.semester.includes(q)
                      )
                    }
                    return true
                  })

                  // Group classes by semester
                  const sems = Array.from(new Set(matchingClasses.map((c) => c.semester))).sort(
                    (a, b) => parseInt(a, 10) - parseInt(b, 10)
                  )

                  return (
                    <div key={crs.id} className="academic-course-card">
                      {/* Course Header */}
                      <div className="academic-course-header">
                        <div className="academic-course-info">
                          <span className="academic-course-code-badge">{crs.code}</span>
                          <div>
                            <h3 className="academic-course-title">{crs.name}</h3>
                            <div className="academic-course-meta">
                              <span>Dept: {crs.department || 'General'}</span>
                              <span>•</span>
                              <span>{crs.durationYears || 3} Years</span>
                              <span>•</span>
                              <span>{crs.totalSemesters || 6} Semesters</span>
                              <span>•</span>
                              <span className={isCourseArchived ? 'academic-badge-archived' : 'academic-badge-active'}>
                                {isCourseArchived ? 'Archived' : 'Active'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="academic-course-actions">
                          <button
                            type="button"
                            className="button button--secondary button--sm"
                            onClick={() => {
                              setClassFormCourseName(crs.name)
                              setClassFormSemester('1')
                              setClassFormDivision('A')
                              setClassFormName('')
                              setIsAddClassModalOpen(true)
                            }}
                            title="Add Class to this Course"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                          >
                            <Plus size={13} /> Add Class
                          </button>
                          <button
                            type="button"
                            className="button button--secondary button--sm"
                            onClick={() => handleOpenEditCourseModal(crs)}
                            title="Edit Course"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          {isCourseArchived ? (
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={() => restoreCourse(crs.id)}
                              title="Restore Course"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#10b981' }}
                            >
                              <RotateCcw size={13} /> Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={() => archiveCourse(crs.id)}
                              title="Archive Course"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#f59e0b' }}
                            >
                              <Archive size={13} /> Archive
                            </button>
                          )}
                          <button
                            type="button"
                            className="button button--danger button--sm"
                            onClick={async () => {
                              if (window.confirm(`Delete course "${crs.name}"? This action cannot be undone.`)) {
                                await deleteCourse(crs.id)
                              }
                            }}
                            title="Delete Course"
                            style={{ padding: '6px 10px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Course Semesters & Classes */}
                      <div className="academic-course-body">
                        {sems.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                            No active classes registered under {crs.name} for the selected filters.
                          </div>
                        ) : (
                          sems.map((sem) => {
                            const semClasses = matchingClasses.filter((c) => c.semester === sem)
                            return (
                              <div key={sem} className="academic-semester-section">
                                <div className="academic-semester-header">
                                  <span>Semester {sem}</span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {semClasses.length} {semClasses.length === 1 ? 'Division' : 'Divisions'}
                                  </span>
                                </div>

                                <div className="academic-classes-grid">
                                  {semClasses.map((cls) => {
                                    const isClassArchived = (cls.status || (cls.isActive !== false ? 'active' : 'archived')) === 'archived'
                                    const enrolledStudents = (data?.users || []).filter((u) => {
                                      if (u.role !== 'student') return false
                                      if (u.academicClassId && u.academicClassId === cls.id) return true
                                      if (cls.studentIds && cls.studentIds.includes(u.id)) return true
                                      const matchesCourse = courseMatches(u.course, cls.courseName)
                                      const matchesSem = semesterMatches(u.semester, cls.semester)
                                      const matchesDiv = divisionMatches(u.division, cls.division)
                                      return matchesCourse && matchesSem && matchesDiv
                                    })

                                    const assignedTeachers = (accessibleTeachers || []).filter((t) =>
                                      (cls.teacherIds || []).includes(t.id)
                                    )

                                    const lectureCount = (timetableEntries || []).filter(
                                      (e) =>
                                        e.entryType === 'weekly' &&
                                        (e.academicClassId === cls.id ||
                                          (courseMatches(e.course, cls.courseName) &&
                                            semesterMatches(e.semester, cls.semester) &&
                                            divisionMatches(e.division, cls.division)))
                                    ).length

                                    return (
                                      <div
                                        key={cls.id}
                                        className={`academic-class-card ${isClassArchived ? 'academic-class-card--archived' : ''}`}
                                      >
                                        <div className="academic-class-top">
                                          <div>
                                            <div className="academic-class-name">{cls.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                              Div {cls.division} · {cls.year || 'FY'}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                            <span className={isClassArchived ? 'academic-badge-archived' : 'academic-badge-active'}>
                                              {isClassArchived ? 'Archived' : 'Active'}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                              {cls.academicYear || '2026-27'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="academic-class-stats">
                                          <div>
                                            <strong style={{ display: 'block', color: 'var(--text-main)' }}>{enrolledStudents.length}</strong>
                                            <span style={{ color: 'var(--text-muted)' }}>Students</span>
                                          </div>
                                          <div>
                                            <strong style={{ display: 'block', color: 'var(--text-main)' }}>{assignedTeachers.length}</strong>
                                            <span style={{ color: 'var(--text-muted)' }}>Faculty</span>
                                          </div>
                                          <div>
                                            <strong style={{ display: 'block', color: 'var(--text-main)' }}>{lectureCount}</strong>
                                            <span style={{ color: 'var(--text-muted)' }}>Lectures</span>
                                          </div>
                                        </div>

                                        <div className="academic-class-actions">
                                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button
                                              type="button"
                                              className="button button--primary button--sm"
                                              onClick={() => {
                                                setSelectedCourse(cls.courseName)
                                                setSelectedSemester(cls.semester)
                                                setSelectedDivision(cls.division)
                                                setSelectedClassId(cls.id)
                                                setAdminTimetableCategory('class')
                                                setActiveTab('weekly')
                                              }}
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', padding: '4px 8px' }}
                                              title="View Class Timetable"
                                            >
                                              <Calendar size={12} /> Timetable
                                            </button>
                                            <button
                                              type="button"
                                              className="button button--secondary button--sm"
                                              onClick={() => setViewStudentsClass(cls)}
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', padding: '4px 8px' }}
                                              title="View Enrolled Students"
                                            >
                                              <Users size={12} /> Students
                                            </button>
                                            <button
                                              type="button"
                                              className="button button--secondary button--sm"
                                              onClick={() => setViewSubjectsClass(cls)}
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', padding: '4px 8px' }}
                                              title="View Subjects"
                                            >
                                              <BookOpen size={12} /> Subjects
                                            </button>
                                          </div>

                                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <button
                                              type="button"
                                              className="button button--secondary button--sm"
                                              onClick={() => handleOpenEditClassModal(cls)}
                                              title="Edit Class"
                                              style={{ padding: '4px 7px' }}
                                            >
                                              <Edit3 size={12} />
                                            </button>
                                            {isClassArchived ? (
                                              <button
                                                type="button"
                                                className="button button--secondary button--sm"
                                                onClick={() => restoreAcademicClass(cls.id)}
                                                title="Restore Class"
                                                style={{ padding: '4px 7px', color: '#10b981' }}
                                              >
                                                <RotateCcw size={12} />
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                className="button button--secondary button--sm"
                                                onClick={() => archiveAcademicClass(cls.id)}
                                                title="Archive Class"
                                                style={{ padding: '4px 7px', color: '#f59e0b' }}
                                              >
                                                <Archive size={12} />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              className="button button--danger button--sm"
                                              onClick={async () => {
                                                if (window.confirm(`Delete class "${cls.name}"?`)) {
                                                  await deleteAcademicClass(cls.id)
                                                }
                                              }}
                                              title="Delete Class"
                                              style={{ padding: '4px 7px' }}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {/* Sub-tab 2: Academic Classes Flat List */}
          {academicSubTab === 'classes' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {(classes || [])
                .filter((cls) => {
                  if (academicYearFilter !== 'all' && cls.academicYear && cls.academicYear !== academicYearFilter) {
                    return false
                  }
                  if (academicStatusFilter !== 'all') {
                    const clsStatus = cls.status || (cls.isActive !== false ? 'active' : 'archived')
                    if (clsStatus !== academicStatusFilter) return false
                  }
                  if (!academicSearchQuery.trim()) return true
                  const q = academicSearchQuery.trim().toLowerCase()
                  return (
                    cls.name.toLowerCase().includes(q) ||
                    cls.courseName.toLowerCase().includes(q) ||
                    cls.division.toLowerCase().includes(q)
                  )
                })
                .map((cls) => {
                  const isClassArchived = (cls.status || (cls.isActive !== false ? 'active' : 'archived')) === 'archived'
                  const enrolledStudents = (data?.users || []).filter((u) => {
                    if (u.role !== 'student') return false
                    if (u.academicClassId && u.academicClassId === cls.id) return true
                    if (cls.studentIds && cls.studentIds.includes(u.id)) return true
                    const matchesCourse = courseMatches(u.course, cls.courseName)
                    const matchesSem = semesterMatches(u.semester, cls.semester)
                    const matchesDiv = divisionMatches(u.division, cls.division)
                    return matchesCourse && matchesSem && matchesDiv
                  })
                  const assignedTeachers = (accessibleTeachers || []).filter((t) =>
                    (cls.teacherIds || []).includes(t.id)
                  )
                  const lectureCount = (timetableEntries || []).filter(
                    (e) =>
                      e.entryType === 'weekly' &&
                      (e.academicClassId === cls.id ||
                        (courseMatches(e.course, cls.courseName) &&
                          semesterMatches(e.semester, cls.semester) &&
                          divisionMatches(e.division, cls.division)))
                  ).length

                  return (
                    <Card key={cls.id} className={isClassArchived ? 'academic-class-card--archived' : ''}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                                {cls.name}
                              </span>
                              <span className={isClassArchived ? 'academic-badge-archived' : 'academic-badge-active'}>
                                {isClassArchived ? 'Archived' : 'Active'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>
                              {cls.courseName}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6 }}>
                            {cls.academicYear || '2026-27'}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 12px', background: 'var(--bg-input, rgba(0,0,0,0.02))', borderRadius: 8, fontSize: '0.82rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>YEAR</span>
                            <strong>{cls.year || 'N/A'}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>SEMESTER</span>
                            <strong>Sem {cls.semester}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>DIVISION</span>
                            <strong>Div {cls.division}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={14} />
                            <span><strong>{enrolledStudents.length}</strong> students enrolled</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock3 size={14} />
                            <span><strong>{lectureCount}</strong> weekly lectures scheduled</span>
                          </div>
                          {assignedTeachers.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <UserIcon size={14} />
                              <span>Faculty: {assignedTeachers.map((t) => t.name.split(' ')[1] || t.name).join(', ')}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 6 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="button button--primary button--sm"
                              onClick={() => {
                                setSelectedCourse(cls.courseName)
                                setSelectedSemester(cls.semester)
                                setSelectedDivision(cls.division)
                                setSelectedClassId(cls.id)
                                setAdminTimetableCategory('class')
                                setActiveTab('weekly')
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                            >
                              <Calendar size={13} /> Timetable
                            </button>
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={() => setViewStudentsClass(cls)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                            >
                              <Users size={13} /> Students
                            </button>
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={() => setViewSubjectsClass(cls)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                            >
                              <BookOpen size={13} /> Subjects
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={() => handleOpenEditClassModal(cls)}
                              title="Edit Class"
                            >
                              <Edit3 size={13} />
                            </button>
                            {isClassArchived ? (
                              <button
                                type="button"
                                className="button button--secondary button--sm"
                                onClick={() => restoreAcademicClass(cls.id)}
                                title="Restore Class"
                                style={{ color: '#10b981' }}
                              >
                                <RotateCcw size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="button button--secondary button--sm"
                                onClick={() => archiveAcademicClass(cls.id)}
                                title="Archive Class"
                                style={{ color: '#f59e0b' }}
                              >
                                <Archive size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="button button--danger button--sm"
                              onClick={async () => {
                                if (window.confirm(`Remove academic class "${cls.name}"?`)) {
                                  await deleteAcademicClass(cls.id)
                                }
                              }}
                              title="Delete Class"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
            </div>
          )}

          {/* Sub-tab 3: Courses */}
          {academicSubTab === 'courses' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {(courses || [])
                .filter((c) => {
                  if (academicStatusFilter !== 'all') {
                    const crsStatus = c.status || (c.isActive !== false ? 'active' : 'archived')
                    if (crsStatus !== academicStatusFilter) return false
                  }
                  if (!academicSearchQuery.trim()) return true
                  const q = academicSearchQuery.trim().toLowerCase()
                  return (
                    c.name.toLowerCase().includes(q) ||
                    c.code.toLowerCase().includes(q) ||
                    (c.department && c.department.toLowerCase().includes(q))
                  )
                })
                .map((crs) => {
                  const isCourseArchived = (crs.status || (crs.isActive !== false ? 'active' : 'archived')) === 'archived'
                  const mappedClasses = (classes || []).filter(
                    (cls) => cls.courseId === crs.id || cls.courseName === crs.name || courseMatches(cls.courseName, crs.name)
                  )

                  return (
                    <Card key={crs.id} className={isCourseArchived ? 'academic-class-card--archived' : ''}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'var(--primary)', color: '#ffffff' }}>
                                {crs.code}
                              </span>
                              <span className={isCourseArchived ? 'academic-badge-archived' : 'academic-badge-active'}>
                                {isCourseArchived ? 'Archived' : 'Active'}
                              </span>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {crs.name}
                            </h4>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              Dept: {crs.department || 'General'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: '10px 12px', background: 'var(--bg-input, rgba(0,0,0,0.02))', borderRadius: 8, fontSize: '0.82rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>DURATION</span>
                            <strong>{crs.durationYears || 3} Years</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>TOTAL SEMESTERS</span>
                            <strong>{crs.totalSemesters || 6} Semesters</strong>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Mapped Classes ({mappedClasses.length}):{' '}
                          <strong>{mappedClasses.map((c) => c.name).join(', ') || 'None'}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                          <button
                            type="button"
                            className="button button--secondary button--sm"
                            onClick={() => {
                              setClassFormCourseName(crs.name)
                              setClassFormSemester('1')
                              setClassFormDivision('A')
                              setClassFormName('')
                              setIsAddClassModalOpen(true)
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                          >
                            <Plus size={13} /> Add Class
                          </button>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="button button--secondary button--sm"
                              onClick={() => handleOpenEditCourseModal(crs)}
                              title="Edit Course"
                            >
                              <Edit3 size={13} />
                            </button>
                            {isCourseArchived ? (
                              <button
                                type="button"
                                className="button button--secondary button--sm"
                                onClick={() => restoreCourse(crs.id)}
                                title="Restore Course"
                                style={{ color: '#10b981' }}
                              >
                                <RotateCcw size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="button button--secondary button--sm"
                                onClick={() => archiveCourse(crs.id)}
                                title="Archive Course"
                                style={{ color: '#f59e0b' }}
                              >
                                <Archive size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="button button--danger button--sm"
                              onClick={async () => {
                                if (window.confirm(`Remove course "${crs.name}"?`)) {
                                  await deleteCourse(crs.id)
                                }
                              }}
                              title="Delete Course"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODALS */}
      {/* ------------------------------------------------------------- */}

      {/* Modal: Interactive Lecture Details View */}
      <Modal
        open={Boolean(selectedLectureDetails)}
        title="Lecture Details"
        onClose={() => setSelectedLectureDetails(null)}
      >
        {selectedLectureDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {selectedLectureDetails.subjectName || selectedLectureDetails.subject}
              </h3>
              <span
                className={`lecture-status-tag lecture-status-tag--${
                  selectedLectureDetails.status === 'Cancelled'
                    ? 'cancelled'
                    : selectedLectureDetails.status === 'Rescheduled'
                    ? 'rescheduled'
                    : selectedLectureDetails.status === 'Substitute'
                    ? 'substitute'
                    : selectedLectureDetails.status === 'Room_Changed'
                    ? 'room_changed'
                    : 'scheduled'
                }`}
              >
                {selectedLectureDetails.status.replace('_', ' ')}
              </span>
            </div>

            <div className="lecture-detail-grid">
              <div className="lecture-detail-item">
                <label>Time Slot</label>
                <span>
                  {selectedLectureDetails.startTime && selectedLectureDetails.endTime
                    ? `${formatTimeTo12Hour(selectedLectureDetails.startTime)} – ${formatTimeTo12Hour(
                        selectedLectureDetails.endTime
                      )}`
                    : selectedLectureDetails.time}
                </span>
              </div>

              <div className="lecture-detail-item">
                <label>Day of Week</label>
                <span>{selectedLectureDetails.dayOfWeek || selectedLectureDetails.day}</span>
              </div>

              <div className="lecture-detail-item">
                <label>Faculty</label>
                <span>
                  {selectedLectureDetails.substituteTeacherName
                    ? `${selectedLectureDetails.substituteTeacherName} (Substitute for ${
                        selectedLectureDetails.teacherName || selectedLectureDetails.teacher
                      })`
                    : selectedLectureDetails.teacherName || selectedLectureDetails.teacher}
                </span>
              </div>

              <div className="lecture-detail-item">
                <label>Room / Lab</label>
                <span>
                  {selectedLectureDetails.originalRoom &&
                  selectedLectureDetails.room !== selectedLectureDetails.originalRoom
                    ? `${selectedLectureDetails.room} (Moved from ${selectedLectureDetails.originalRoom})`
                    : selectedLectureDetails.room || 'Room TBA'}
                </span>
              </div>

              <div className="lecture-detail-item">
                <label>Course & Class</label>
                <span>
                  {selectedLectureDetails.course} Sem {selectedLectureDetails.semester} Div{' '}
                  {selectedLectureDetails.division}
                </span>
              </div>

              <div className="lecture-detail-item">
                <label>Schedule Type</label>
                <span>
                  {selectedLectureDetails.entryType === 'weekly'
                    ? 'Regular Weekly Lecture'
                    : 'Date-Specific Override'}
                </span>
              </div>
            </div>

            {selectedLectureDetails.reason && (
              <div
                className={`lecture-reason-notice ${
                  selectedLectureDetails.status === 'Cancelled'
                    ? 'lecture-reason-notice--cancelled'
                    : selectedLectureDetails.status === 'Rescheduled'
                    ? 'lecture-reason-notice--rescheduled'
                    : 'lecture-reason-notice--override'
                }`}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Notice & Status Rationale:</strong>
                  <p style={{ margin: '2px 0 0' }}>{selectedLectureDetails.reason}</p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              {mode !== 'student' && selectedLectureDetails.status !== 'Cancelled' && (
                <>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => {
                      const e = selectedLectureDetails
                      setSelectedLectureDetails(null)
                      setCancelModalEntry(e)
                    }}
                  >
                    Cancel Lecture
                  </button>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => {
                      const e = selectedLectureDetails
                      setSelectedLectureDetails(null)
                      setRescheduleModalEntry(e)
                      setRescheduleDate(getTodayISODate())
                      setRescheduleStart(e.startTime || '14:00')
                      setRescheduleEnd(e.endTime || '15:00')
                      setRescheduleRoom(e.room || '')
                    }}
                  >
                    Reschedule
                  </button>
                </>
              )}
              {mode !== 'student' && selectedLectureDetails.status === 'Cancelled' && (
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={async () => {
                    const id = selectedLectureDetails.id
                    setSelectedLectureDetails(null)
                    await restoreLecture(id)
                  }}
                  style={{
                    color: 'var(--accent-emerald, #059669)',
                    borderColor: 'var(--accent-emerald, #059669)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <RotateCcw size={13} /> Restore Lecture
                </button>
              )}
              <button
                type="button"
                className="button button--primary button--sm"
                onClick={() => setSelectedLectureDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Document Viewer with Pan/Zoom */}
      {viewingDocument && (
        <div
          className="doc-viewer-backdrop"
          role="presentation"
          onMouseDown={() => setViewingDocument(null)}
        >
          <div
            className="doc-viewer-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="doc-viewer-header">
              <div>
                <h3>
                  {viewingDocument.fileName} (v{viewingDocument.version})
                </h3>
                <small style={{ color: 'var(--text-muted)' }}>
                  Effective: {viewingDocument.effectiveFrom} · {viewingDocument.course} Sem{' '}
                  {viewingDocument.semester} Div {viewingDocument.division}
                </small>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setViewingDocument(null)}
                aria-label="Close document viewer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="doc-viewer-body">
              {viewingDocument.fileType === 'pdf' ? (
                <iframe
                  src={viewingDocument.fileUrl}
                  title="Timetable PDF Document"
                  className="doc-viewer-iframe"
                />
              ) : (
                <img
                  src={viewingDocument.fileUrl}
                  alt="Official Timetable"
                  className="doc-viewer-img"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                />
              )}
            </div>

            <div className="doc-viewer-toolbar">
              {viewingDocument.fileType === 'image' ? (
                <div className="doc-viewer-zoom-controls">
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => setZoomLevel((prev) => Math.max(50, prev - 25))}
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      minWidth: 48,
                      textAlign: 'center',
                    }}
                  >
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => setZoomLevel((prev) => Math.min(250, prev + 25))}
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => setZoomLevel(100)}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={viewingDocument.fileUrl}
                  download={viewingDocument.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="button button--primary button--sm"
                >
                  <Download size={14} /> Download Document
                </a>
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => setViewingDocument(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Lecture */}
      <Modal
        open={Boolean(cancelModalEntry)}
        title="Cancel Lecture Session"
        onClose={() => setCancelModalEntry(null)}
      >
        {cancelModalEntry && (
          <form
            onSubmit={handleCancelSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Are you sure you want to cancel the lecture for{' '}
              <strong>{cancelModalEntry.subjectName || cancelModalEntry.subject}</strong> (
              {cancelModalEntry.startTime} - {cancelModalEntry.endTime})? A mandatory reason will be
              broadcast to students.
            </p>

            <div>
              <label className="field-label">Reason for Cancellation (Required)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="e.g. Faculty medical leave / Faculty on university examination evaluation duty"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setCancelModalEntry(null)}
              >
                Abort
              </button>
              <button type="submit" className="button button--danger" disabled={isActionSubmitting}>
                {isActionSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Reschedule Lecture */}
      <Modal
        open={Boolean(rescheduleModalEntry)}
        title="Reschedule Lecture Slot"
        onClose={() => setRescheduleModalEntry(null)}
      >
        {rescheduleModalEntry && (
          <form
            onSubmit={handleRescheduleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Rescheduling{' '}
              <strong>{rescheduleModalEntry.subjectName || rescheduleModalEntry.subject}</strong>.
            </p>

            <div className="timetable-form-grid">
              <div>
                <label className="field-label">New Date</label>
                <input
                  type="date"
                  className="input"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">New Start Time</label>
                <input
                  type="time"
                  className="input"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">New End Time</label>
                <input
                  type="time"
                  className="input"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Room (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={rescheduleRoom}
                  onChange={(e) => setRescheduleRoom(e.target.value)}
                  placeholder={rescheduleModalEntry.room || 'Room 201'}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Reason for Rescheduling</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Compensation lecture slot"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setRescheduleModalEntry(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button button--primary" disabled={isActionSubmitting}>
                {isActionSubmitting ? 'Saving...' : 'Save Rescheduled Slot'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Emergency Override (Substitute / Room Change) */}
      <Modal
        open={Boolean(overrideModalEntry)}
        title="Lecture Override (Substitute / Room Change)"
        onClose={() => setOverrideModalEntry(null)}
      >
        {overrideModalEntry && (
          <form
            onSubmit={handleOverrideSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div>
              <label className="field-label">Override Type</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="overrideType"
                    checked={overrideType === 'substitute'}
                    onChange={() => setOverrideType('substitute')}
                  />
                  Assign Substitute Teacher
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="overrideType"
                    checked={overrideType === 'room'}
                    onChange={() => setOverrideType('room')}
                  />
                  Change Room Only
                </label>
              </div>
            </div>

            <div className="timetable-form-grid">
              <div>
                <label className="field-label">Date of Override</label>
                <input
                  type="date"
                  className="input"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  required
                />
              </div>

              {overrideType === 'substitute' ? (
                <div>
                  <label className="field-label">Select Substitute Teacher</label>
                  <select
                    className="select"
                    value={overrideSubTeacherId}
                    onChange={(e) => setOverrideSubTeacherId(e.target.value)}
                    required
                  >
                    <option value="">Choose teacher...</option>
                    {availableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.department || 'Faculty'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="field-label">New Room / Lab</label>
                  <input
                    type="text"
                    className="input"
                    list="override-rooms"
                    placeholder="e.g. Lab 102"
                    value={overrideRoom}
                    onChange={(e) => setOverrideRoom(e.target.value)}
                    required
                  />
                  <datalist id="override-rooms">
                    {STANDARD_ROOMS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>

            <div>
              <label className="field-label">Reason for Override</label>
              <input
                type="text"
                className="input"
                placeholder={
                  overrideType === 'substitute'
                    ? 'e.g. Regular faculty on examination evaluation duty'
                    : 'e.g. Lab 101 maintenance work in progress'
                }
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setOverrideModalEntry(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button button--primary" disabled={isActionSubmitting}>
                {isActionSubmitting ? 'Applying...' : 'Apply Override'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Delete Lecture Confirmation */}
      <Modal
        open={Boolean(deleteConfirmEntry)}
        title="Delete Lecture Entry"
        onClose={() => setDeleteConfirmEntry(null)}
      >
        {deleteConfirmEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Are you sure you want to permanently delete{' '}
              <strong>{deleteConfirmEntry.subjectName || deleteConfirmEntry.subject}</strong> on{' '}
              <strong>{deleteConfirmEntry.dayOfWeek || deleteConfirmEntry.day}</strong> (
              {deleteConfirmEntry.startTime} - {deleteConfirmEntry.endTime})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setDeleteConfirmEntry(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={handleDeleteSubmit}
                disabled={isActionSubmitting}
              >
                {isActionSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 1: Record Faculty Leave (Feature #21) */}
      <Modal
        open={isAddLeaveModalOpen}
        title="Record Faculty Leave"
        onClose={() => {
          setIsAddLeaveModalOpen(false)
          setLeaveFormError(null)
        }}
      >
        <form onSubmit={handleCreateLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {leaveFormError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{leaveFormError}</span>
            </div>
          )}

          <div className="timetable-form-grid">
            <div>
              <label className="field-label">Faculty Member *</label>
              <select
                className="input"
                value={leaveFormTeacherId}
                onChange={(e) => setLeaveFormTeacherId(e.target.value)}
                required
                disabled={mode === 'teacher'}
              >
                <option value="">Select Faculty...</option>
                {accessibleTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.department ? `(${t.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Leave Type *</label>
              <select
                className="input"
                value={leaveFormType}
                onChange={(e) => setLeaveFormType(e.target.value as TeacherLeaveType)}
                required
              >
                <option value="Full Day">Full Day</option>
                <option value="Partial Day">Partial Day (Time-bounded)</option>
                <option value="Half Day">Half Day</option>
                <option value="Emergency">Emergency Leave</option>
              </select>
            </div>

            <div>
              <label className="field-label">Start Date *</label>
              <input
                type="date"
                className="input"
                value={leaveFormStartDate}
                onChange={(e) => setLeaveFormStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">End Date *</label>
              <input
                type="date"
                className="input"
                value={leaveFormEndDate}
                min={leaveFormStartDate}
                onChange={(e) => setLeaveFormEndDate(e.target.value)}
                required
              />
            </div>

            {leaveFormType === 'Partial Day' && (
              <>
                <div>
                  <label className="field-label">From Time *</label>
                  <input
                    type="time"
                    className="input"
                    value={leaveFormStartTime}
                    onChange={(e) => setLeaveFormStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">To Time *</label>
                  <input
                    type="time"
                    className="input"
                    value={leaveFormEndTime}
                    onChange={(e) => setLeaveFormEndTime(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="field-label">Common Reason Quick-Picks</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {[
                'Medical Leave',
                'Faculty Development Program (FDP)',
                'National Conference & Seminar',
                'University Examination Duty',
                'Casual / Personal Leave',
                'Academic Research Work',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className="timetable-reason-chip"
                  onClick={() => setLeaveFormReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Reason / Justification *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Attending NBA accreditation workshop"
              value={leaveFormReason}
              onChange={(e) => setLeaveFormReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label">Administrative Notes (Optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. Approved by Dean of Academics; syllabus plan reviewed"
              value={leaveFormNotes}
              onChange={(e) => setLeaveFormNotes(e.target.value)}
            />
          </div>

          {/* Live Impact Preview */}
          {leaveFormTeacherId && (
            <div className="timetable-leave-preview-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserX size={15} color="var(--color-warning, #f59e0b)" />
                  Impact Preview:
                </span>
                <span className={`status-badge status-badge--${previewAffectedLectures.length > 0 ? 'warning' : 'scheduled'}`}>
                  {previewAffectedLectures.length} Affected Lecture{previewAffectedLectures.length === 1 ? '' : 's'}
                </span>
              </div>
              {previewAffectedLectures.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No recurring lectures scheduled during this period for the selected faculty.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Saving this leave will register the absence and let you immediately manage substitutes, rescheduling, or cancellations without altering your recurring master timetable.
                  </p>
                  <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    {previewAffectedLectures.slice(0, 4).map((aff, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '0.78rem',
                          background: 'rgba(255,255,255,0.04)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          display: 'flex',
                          justifyContent: 'space-between',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span>
                          <strong>{aff.date}</strong> ({aff.dayOfWeek}): {aff.weeklyEntry.subjectName || aff.weeklyEntry.subject} ({aff.weeklyEntry.course} Sem {aff.weeklyEntry.semester})
                        </span>
                        <span>{aff.weeklyEntry.startTime || aff.weeklyEntry.time}</span>
                      </div>
                    ))}
                    {previewAffectedLectures.length > 4 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        + {previewAffectedLectures.length - 4} more lecture slots
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setIsAddLeaveModalOpen(false)
                setLeaveFormError(null)
              }}
            >
              Cancel
            </button>
            <button type="submit" className="button button--primary" disabled={isSubmittingLeave}>
              {isSubmittingLeave ? 'Recording Leave...' : 'Record Leave & Manage Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Manage Affected Lectures (Feature #21) */}
      <Modal
        open={Boolean(affectedModalLeave)}
        title={affectedModalLeave ? `Manage Affected Lectures: ${affectedModalLeave.teacherName}` : 'Manage Affected Lectures'}
        onClose={() => setAffectedModalLeave(null)}
      >
        {affectedModalLeave && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header info banner */}
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{affectedModalLeave.teacherName}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {affectedModalLeave.teacherDepartment || 'Faculty'} · {affectedModalLeave.leaveType}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="status-badge status-badge--scheduled" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {affectedModalLeave.startDate} <ArrowRight size={12} /> {affectedModalLeave.endDate}
                  </span>
                  <span className={`status-badge status-badge--${affectedModalLeave.status === 'ACTIVE' ? 'warning' : 'scheduled'}`}>
                    {affectedModalLeave.status}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <strong>Reason:</strong> {affectedModalLeave.reason}
              </div>

              {/* Counts row */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 4,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.78rem',
                  flexWrap: 'wrap',
                }}
              >
                <span>Total: <strong>{activeLeaveAffectedLectures.length}</strong></span>
                <span style={{ color: '#ef4444' }}>
                  Cancelled: <strong>{activeLeaveAffectedLectures.filter((l) => l.status === 'Cancelled').length}</strong>
                </span>
                <span style={{ color: '#38bdf8' }}>
                  Substituted:{' '}
                  <strong>
                    {activeLeaveAffectedLectures.filter((l) => Boolean(l.overrideEntry?.substituteTeacherId)).length}
                  </strong>
                </span>
                <span style={{ color: '#a855f7' }}>
                  Rescheduled: <strong>{activeLeaveAffectedLectures.filter((l) => l.status === 'Rescheduled').length}</strong>
                </span>
                <span style={{ color: '#f59e0b' }}>
                  Pending:{' '}
                  <strong>
                    {activeLeaveAffectedLectures.filter((l) => l.status === 'Scheduled' && !l.overrideEntry).length}
                  </strong>
                </span>
              </div>
            </div>

            {/* Bulk actions */}
            {activeLeaveAffectedLectures.filter((l) => l.status === 'Scheduled' && !l.overrideEntry).length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(239, 68, 68, 0.08)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  There are unhandled lectures in this leave window.
                </span>
                <button
                  type="button"
                  className="button button--danger"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                  onClick={handleBulkCancelPending}
                  disabled={isHandlingAffectedAction}
                >
                  {isHandlingAffectedAction ? 'Processing...' : 'Bulk Cancel All Pending'}
                </button>
              </div>
            )}

            {/* List of Affected Lectures */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
              {activeLeaveAffectedLectures.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No scheduled recurring lectures fall within this faculty leave period.
                </div>
              ) : (
                activeLeaveAffectedLectures.map((item, idx) => {
                  const w = item.weeklyEntry
                  const isSub = Boolean(item.overrideEntry?.substituteTeacherId)
                  const isCanc = item.status === 'Cancelled'
                  const isResch = item.status === 'Rescheduled'
                  const isPending = !isSub && !isCanc && !isResch

                  return (
                    <div
                      key={idx}
                      className="timetable-affected-lecture-card"
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {w.subjectName || w.subject}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {w.course} Sem {w.semester} ({w.division}) · Room: {item.currentRoom}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.date} ({item.dayOfWeek})
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {w.startTime && w.endTime ? `${formatTimeTo12Hour(w.startTime)} – ${formatTimeTo12Hour(w.endTime)}` : w.time}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          {isCanc && (
                            <span className="status-badge status-badge--cancelled">Cancelled (Faculty Leave)</span>
                          )}
                          {isSub && (
                            <span className="status-badge status-badge--scheduled" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                              Sub: {item.currentTeacherName}
                            </span>
                          )}
                          {isResch && (
                            <span className="status-badge status-badge--rescheduled">Rescheduled</span>
                          )}
                          {isPending && (
                            <span className="status-badge status-badge--warning">Action Pending</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                className="button button--secondary"
                                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                                onClick={() => setSubstitutePickerLecture(item)}
                              >
                                Assign Substitute
                              </button>
                              <button
                                type="button"
                                className="button button--secondary"
                                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                                onClick={() => {
                                  setReschedulePickerLecture(item)
                                  setReschedulePickerDate(item.date)
                                  setReschedulePickerStart(item.weeklyEntry.startTime || '14:00')
                                  setReschedulePickerEnd(item.weeklyEntry.endTime || '15:00')
                                  setReschedulePickerRoom(item.weeklyEntry.room || '')
                                }}
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                className="button button--danger"
                                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                                onClick={async () => {
                                  setIsHandlingAffectedAction(true)
                                  try {
                                    await cancelLeaveAffectedLecture(
                                      affectedModalLeave.id,
                                      item.weeklyEntry.id,
                                      item.date,
                                      'Faculty on Approved Leave'
                                    )
                                  } finally {
                                    setIsHandlingAffectedAction(false)
                                  }
                                }}
                                disabled={isHandlingAffectedAction}
                              >
                                Cancel Slot
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="button button--secondary"
                              style={{ fontSize: '0.74rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={async () => {
                                if (item.overrideEntry) {
                                  await restoreLecture(item.overrideEntry.id)
                                }
                              }}
                            >
                              <CornerDownRight size={13} />
                              Restore Normal
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="button button--primary"
                onClick={() => setAffectedModalLeave(null)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 3: Assign Substitute Faculty with Conflict Detection (Feature #21) */}
      <Modal
        open={Boolean(substitutePickerLecture)}
        title="Assign Substitute Faculty"
        onClose={() => {
          setSubstitutePickerLecture(null)
          setSubstituteTargetTeacherId('')
          setSubstituteReasonNote('')
        }}
      >
        {substitutePickerLecture && (
          <form onSubmit={handleSubstituteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.85rem',
              }}
            >
              <div>
                Target Lecture: <strong>{substitutePickerLecture.weeklyEntry.subjectName || substitutePickerLecture.weeklyEntry.subject}</strong>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                {substitutePickerLecture.date} ({substitutePickerLecture.dayOfWeek}) · {substitutePickerLecture.weeklyEntry.startTime} - {substitutePickerLecture.weeklyEntry.endTime} · Room {substitutePickerLecture.weeklyEntry.room}
              </div>
            </div>

            <div>
              <label className="field-label">Select Substitute Faculty *</label>
              <select
                className="input"
                value={substituteTargetTeacherId}
                onChange={(e) => setSubstituteTargetTeacherId(e.target.value)}
                required
              >
                <option value="">Choose Available Faculty...</option>
                {accessibleTeachers
                  .filter((t) => t.id !== affectedModalLeave?.teacherId)
                  .map((t) => {
                    const avail = teacherAvailMap.get(t.id)
                    const statusTag = avail?.onLeave ? ' [ON LEAVE]' : ' [Available]'
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.department ? `(${t.department})` : ''} {statusTag}
                      </option>
                    )
                  })}
              </select>
            </div>

            {/* Real-time Conflict Alert */}
            {substituteConflict && substituteConflict.hasConflict && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Faculty Conflict Alert:</strong> {substituteConflict.reason}.
                  <div style={{ marginTop: 2, fontSize: '0.76rem', opacity: 0.9 }}>
                    Assigning this faculty will cause a double-booking or overlap.
                  </div>
                </div>
              </div>
            )}

            {substituteConflict && !substituteConflict.hasConflict && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle size={16} />
                <span>Selected faculty is available with no timetable clashes.</span>
              </div>
            )}

            <div>
              <label className="field-label">Administrative Notes / Reason (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Assigned to complete module 3 syllabus"
                value={substituteReasonNote}
                onChange={(e) => setSubstituteReasonNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setSubstitutePickerLecture(null)
                  setSubstituteTargetTeacherId('')
                  setSubstituteReasonNote('')
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={isHandlingAffectedAction || !substituteTargetTeacherId}
              >
                {isHandlingAffectedAction ? 'Assigning...' : 'Confirm Substitute Assignment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 4: Reschedule Affected Lecture (Feature #21) */}
      <Modal
        open={Boolean(reschedulePickerLecture)}
        title="Reschedule Leave-Impacted Lecture"
        onClose={() => setReschedulePickerLecture(null)}
      >
        {reschedulePickerLecture && (
          <form onSubmit={handleLeaveAffectedRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.85rem',
              }}
            >
              <div>
                Rescheduling: <strong>{reschedulePickerLecture.weeklyEntry.subjectName || reschedulePickerLecture.weeklyEntry.subject}</strong>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                Original: {reschedulePickerLecture.date} ({reschedulePickerLecture.dayOfWeek}) · {reschedulePickerLecture.weeklyEntry.startTime} - {reschedulePickerLecture.weeklyEntry.endTime}
              </div>
            </div>

            <div className="timetable-form-grid">
              <div>
                <label className="field-label">Makeup Date *</label>
                <input
                  type="date"
                  className="input"
                  value={reschedulePickerDate}
                  onChange={(e) => setReschedulePickerDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Start Time *</label>
                <input
                  type="time"
                  className="input"
                  value={reschedulePickerStart}
                  onChange={(e) => setReschedulePickerStart(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">End Time *</label>
                <input
                  type="time"
                  className="input"
                  value={reschedulePickerEnd}
                  onChange={(e) => setReschedulePickerEnd(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Room (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder={reschedulePickerLecture.weeklyEntry.room || 'Room 201'}
                  value={reschedulePickerRoom}
                  onChange={(e) => setReschedulePickerRoom(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Reschedule Reason / Topic</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Saturday makeup compensation class"
                value={reschedulePickerReason}
                onChange={(e) => setReschedulePickerReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setReschedulePickerLecture(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={isHandlingAffectedAction}
              >
                {isHandlingAffectedAction ? 'Rescheduling...' : 'Confirm Rescheduled Class'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 5: Confirm Early Return & Safe Timetable Restoration (Feature #21) */}
      <Modal
        open={Boolean(returnConfirmLeave)}
        title="Mark Faculty Returned & Restore Schedules"
        onClose={() => setReturnConfirmLeave(null)}
      >
        {returnConfirmLeave && (
          <form onSubmit={handleConfirmReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {returnConfirmLeave.teacherName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Scheduled Leave: <strong>{returnConfirmLeave.startDate}</strong> to <strong>{returnConfirmLeave.endDate}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Reason: {returnConfirmLeave.reason}
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                lineHeight: 1.45,
              }}
            >
              <strong>Safe Timetable Restoration Rule:</strong>
              <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Any lectures from the actual return date onward that were cancelled solely due to this leave will automatically be restored back to the recurring master schedule. Any manually assigned substitute faculty or rescheduled makeup sessions will remain preserved.
              </div>
            </div>

            <div className="timetable-form-grid">
              <div>
                <label className="field-label">Actual Return Date *</label>
                <input
                  type="date"
                  className="input"
                  value={returnConfirmDate}
                  min={returnConfirmLeave.startDate}
                  max={returnConfirmLeave.endDate}
                  onChange={(e) => setReturnConfirmDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Return Notes (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Resumed duty ahead of schedule"
                  value={returnConfirmNotes}
                  onChange={(e) => setReturnConfirmNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setReturnConfirmLeave(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={isSubmittingReturn}
              >
                {isSubmittingReturn ? 'Restoring Schedules...' : 'Confirm Return & Restore'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 6: Delete Faculty Leave Confirmation (Feature #21) */}
      <Modal
        open={Boolean(deleteLeaveConfirm)}
        title="Delete Leave Record"
        onClose={() => setDeleteLeaveConfirm(null)}
      >
        {deleteLeaveConfirm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Are you sure you want to permanently delete the leave record for{' '}
              <strong>{deleteLeaveConfirm.teacherName}</strong> ({deleteLeaveConfirm.startDate} to{' '}
              {deleteLeaveConfirm.endDate})?
            </p>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.78rem',
                color: '#ef4444',
              }}
            >
              Note: Existing lecture overrides will not be automatically deleted. Please restore any cancelled or substituted slots if necessary.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setDeleteLeaveConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={handleDeleteLeaveSubmit}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 7: Add Academic Course */}
      <Modal
        open={isAddCourseModalOpen}
        title="Add Academic Course / Degree"
        onClose={() => {
          setIsAddCourseModalOpen(false)
          setCourseFormError(null)
        }}
      >
        <form onSubmit={handleCreateCourseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {courseFormError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{courseFormError}</span>
            </div>
          )}

          <div className="timetable-form-grid">
            <div>
              <label className="field-label">Course / Degree Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. BSc Information Technology"
                value={courseFormName}
                onChange={(e) => setCourseFormName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">Course Code *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. BSCIT or BCA"
                value={courseFormCode}
                onChange={(e) => setCourseFormCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div>
              <label className="field-label">Department</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Information Technology"
                value={courseFormDepartment}
                onChange={(e) => setCourseFormDepartment(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Duration (Years)</label>
              <input
                type="number"
                className="input"
                min={1}
                max={6}
                value={courseFormDuration}
                onChange={(e) => setCourseFormDuration(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="field-label">Total Semesters</label>
              <input
                type="number"
                className="input"
                min={1}
                max={12}
                value={courseFormSemesters}
                onChange={(e) => setCourseFormSemesters(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setIsAddCourseModalOpen(false)
                setCourseFormError(null)
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmittingCourse}
            >
              {isSubmittingCourse ? 'Creating Course...' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 8: Add Class / Division */}
      <Modal
        open={isAddClassModalOpen}
        title="Add Academic Class / Division"
        onClose={() => {
          setIsAddClassModalOpen(false)
          setClassFormError(null)
        }}
      >
        <form onSubmit={handleCreateClassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {classFormError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{classFormError}</span>
            </div>
          )}

          <div className="timetable-form-grid">
            <div>
              <label className="field-label">Course / Program *</label>
              <select
                className="select"
                value={classFormCourseName}
                onChange={(e) => setClassFormCourseName(e.target.value)}
                required
              >
                {dynamicCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Year of Study *</label>
              <select
                className="select"
                value={classFormYear}
                onChange={(e) => setClassFormYear(e.target.value)}
                required
              >
                <option value="FY">First Year (FY)</option>
                <option value="SY">Second Year (SY)</option>
                <option value="TY">Third Year (TY)</option>
                <option value="4th Year">Fourth Year</option>
              </select>
            </div>

            <div>
              <label className="field-label">Semester *</label>
              <select
                className="select"
                value={classFormSemester}
                onChange={(e) => setClassFormSemester(e.target.value)}
                required
              >
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Division / Batch *</label>
              <select
                className="select"
                value={classFormDivision}
                onChange={(e) => setClassFormDivision(e.target.value.toUpperCase())}
                required
              >
                {['A', 'B', 'C', 'D', 'E', 'F'].map((div) => (
                  <option key={div} value={div}>
                    Division {div}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Class Display Name (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. TYIT-A, SYDS-B, BCom-A"
                value={classFormName}
                onChange={(e) => setClassFormName(e.target.value)}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Leave blank to auto-generate from Year + Course + Division
              </span>
            </div>

            <div>
              <label className="field-label">Academic Year</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 2026-27"
                value={classFormAcademicYear}
                onChange={(e) => setClassFormAcademicYear(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setIsAddClassModalOpen(false)
                setClassFormError(null)
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmittingClass}
            >
              {isSubmittingClass ? 'Creating Class...' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 9: View Enrolled Students in Class */}
      <Modal
        open={Boolean(viewStudentsClass)}
        title={`Enrolled Students — ${viewStudentsClass?.name || ''}`}
        onClose={() => setViewStudentsClass(null)}
      >
        {viewStudentsClass && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-input, rgba(0,0,0,0.03))', borderRadius: 8, fontSize: '0.85rem' }}>
              <div>
                <strong>{viewStudentsClass.courseName}</strong> · Sem {viewStudentsClass.semester} · Div {viewStudentsClass.division}
              </div>
              <span className="academic-badge-active">
                {viewStudentsClass.academicYear || '2026-27'}
              </span>
            </div>

            {(() => {
              const studentsInClass = (data?.users || []).filter((u) => {
                if (u.role !== 'student') return false
                if (u.academicClassId && u.academicClassId === viewStudentsClass.id) return true
                if (viewStudentsClass.studentIds && viewStudentsClass.studentIds.includes(u.id)) return true
                const matchesCourse = courseMatches(u.course, viewStudentsClass.courseName)
                const matchesSem = semesterMatches(u.semester, viewStudentsClass.semester)
                const matchesDiv = divisionMatches(u.division, viewStudentsClass.division)
                return matchesCourse && matchesSem && matchesDiv
              })

              if (studentsInClass.length === 0) {
                return (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No students enrolled yet</p>
                    <small>Students enrolled with matching course, semester, and division will automatically appear here.</small>
                  </div>
                )
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                  {studentsInClass.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {st.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{st.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Roll / ID: {st.identifier || st.id} · {st.email}
                          </div>
                        </div>
                      </div>
                      <span className="academic-badge-active" style={{ fontSize: '0.72rem' }}>
                        Enrolled
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setViewStudentsClass(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 10: View Academic Subjects for Class */}
      <Modal
        open={Boolean(viewSubjectsClass)}
        title={`Academic Subjects — ${viewSubjectsClass?.name || ''}`}
        onClose={() => setViewSubjectsClass(null)}
      >
        {viewSubjectsClass && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-input, rgba(0,0,0,0.03))', borderRadius: 8, fontSize: '0.85rem' }}>
              <div>
                <strong>{viewSubjectsClass.courseName}</strong> · Sem {viewSubjectsClass.semester}
              </div>
              <span className="academic-badge-active">
                {viewSubjectsClass.academicYear || '2026-27'}
              </span>
            </div>

            {(() => {
              const matchedSubjects = (subjects || []).filter((s) => {
                const matchesCourse = courseMatches(s.course, viewSubjectsClass.courseName)
                const matchesSem = semesterMatches(s.semester, viewSubjectsClass.semester)
                return matchesCourse && matchesSem
              })

              if (matchedSubjects.length === 0) {
                return (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <BookOpen size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No curriculum subjects configured for this semester</p>
                    <small>Subjects can be mapped when creating timetable entries.</small>
                  </div>
                )
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                  {matchedSubjects.map((sb) => (
                    <div
                      key={sb.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{sb.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Code: {sb.code || 'N/A'} {sb.credits ? `· ${sb.credits} Credits` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                        Sem {sb.semester || viewSubjectsClass.semester}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setViewSubjectsClass(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 11: Edit Course */}
      <Modal
        open={Boolean(editingCourse)}
        title="Edit College Course"
        onClose={() => {
          setEditingCourse(null)
          setEditCourseFormError(null)
        }}
      >
        <form onSubmit={handleEditCourseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editCourseFormError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{editCourseFormError}</span>
            </div>
          )}

          <div className="timetable-form-grid">
            <div>
              <label className="field-label">Course Name *</label>
              <input
                type="text"
                className="input"
                value={editCourseFormName}
                onChange={(e) => setEditCourseFormName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">Course Code *</label>
              <input
                type="text"
                className="input"
                value={editCourseFormCode}
                onChange={(e) => setEditCourseFormCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div>
              <label className="field-label">Department</label>
              <input
                type="text"
                className="input"
                value={editCourseFormDepartment}
                onChange={(e) => setEditCourseFormDepartment(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Duration (Years)</label>
              <input
                type="number"
                className="input"
                min={1}
                max={6}
                value={editCourseFormDuration}
                onChange={(e) => setEditCourseFormDuration(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="field-label">Total Semesters</label>
              <input
                type="number"
                className="input"
                min={1}
                max={12}
                value={editCourseFormSemesters}
                onChange={(e) => setEditCourseFormSemesters(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="field-label">Status</label>
              <select
                className="select"
                value={editCourseFormStatus}
                onChange={(e) => setEditCourseFormStatus(e.target.value as any)}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setEditingCourse(null)
                setEditCourseFormError(null)
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmittingEditCourse}
            >
              {isSubmittingEditCourse ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 12: Edit Academic Class */}
      <Modal
        open={Boolean(editingClass)}
        title="Edit Academic Class / Division"
        onClose={() => {
          setEditingClass(null)
          setEditClassFormError(null)
        }}
      >
        <form onSubmit={handleEditClassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editClassFormError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{editClassFormError}</span>
            </div>
          )}

          <div className="timetable-form-grid">
            <div>
              <label className="field-label">Class Display Name *</label>
              <input
                type="text"
                className="input"
                value={editClassFormName}
                onChange={(e) => setEditClassFormName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">Division / Batch *</label>
              <select
                className="select"
                value={editClassFormDivision}
                onChange={(e) => setEditClassFormDivision(e.target.value.toUpperCase())}
                required
              >
                {['A', 'B', 'C', 'D', 'E', 'F'].map((div) => (
                  <option key={div} value={div}>
                    Division {div}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Semester *</label>
              <select
                className="select"
                value={editClassFormSemester}
                onChange={(e) => setEditClassFormSemester(e.target.value)}
                required
              >
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Year of Study *</label>
              <select
                className="select"
                value={editClassFormYear}
                onChange={(e) => setEditClassFormYear(e.target.value)}
                required
              >
                <option value="FY">First Year (FY)</option>
                <option value="SY">Second Year (SY)</option>
                <option value="TY">Third Year (TY)</option>
                <option value="4th Year">Fourth Year</option>
              </select>
            </div>

            <div>
              <label className="field-label">Academic Year</label>
              <input
                type="text"
                className="input"
                value={editClassFormAcademicYear}
                onChange={(e) => setEditClassFormAcademicYear(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Status</label>
              <select
                className="select"
                value={editClassFormStatus}
                onChange={(e) => setEditClassFormStatus(e.target.value as any)}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setEditingClass(null)
                setEditClassFormError(null)
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmittingEditClass}
            >
              {isSubmittingEditClass ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Unified Add Weekly Lecture */}
      <Modal
        open={isAddLectureModalOpen}
        title="Add Weekly Lecture Slot"
        onClose={() => {
          setIsAddLectureModalOpen(false)
          setCreateError(null)
          setCreateSuccess(null)
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Target: <strong style={{ color: 'var(--text-main)' }}>{selectedCourse}</strong> · Sem <strong style={{ color: 'var(--text-main)' }}>{selectedSemester}</strong> · Div <strong style={{ color: 'var(--text-main)' }}>{selectedDivision}</strong>
          </div>

          {createSuccess && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#065f46',
                borderRadius: 8,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Check size={16} />
              <span>{createSuccess}</span>
            </div>
          )}

          {createError && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger, #ef4444)',
                borderRadius: 8,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              <span>{createError}</span>
            </div>
          )}

          {/* Live Conflict Warning */}
          {liveConflict && (
            <div className="timetable-conflict-box">
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Conflict Detected:</strong>
                <p style={{ margin: '3px 0 0', lineHeight: 1.4, fontSize: '0.82rem' }}>{liveConflict}</p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleCreateLecture}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div className="timetable-form-grid">
              <div>
                <label className="field-label">Target Academic Class</label>
                <select
                  className="select"
                  value={selectedClassId}
                  onChange={(e) => handleSelectClass(e.target.value)}
                >
                  <option value="custom">-- Custom ({selectedCourse} Sem {selectedSemester}-{selectedDivision}) --</option>
                  {(classes || []).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.courseName} · Sem {cls.semester}-{cls.division})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Lecture Type</label>
                <select
                  className="select"
                  value={newLectureType}
                  onChange={(e) => setNewLectureType(e.target.value as any)}
                >
                  <option value="Regular">Regular Theory Lecture</option>
                  <option value="Practical">Practical Session</option>
                  <option value="Lab">Laboratory / Hands-on</option>
                  <option value="Tutorial">Tutorial</option>
                  <option value="Extra Lecture">Extra Lecture</option>
                  <option value="Special Lecture">Special Lecture</option>
                  <option value="Exam">Exam / Internal Test</option>
                </select>
              </div>

              <div>
                <label className="field-label">Day of Week *</label>
                <select
                  className="select"
                  value={newLectureDay}
                  onChange={(e) => setNewLectureDay(e.target.value as any)}
                  required
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Start Time (24h) *</label>
                <input
                  type="time"
                  className="input"
                  value={newLectureStart}
                  onChange={(e) => setNewLectureStart(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">End Time (24h) *</label>
                <input
                  type="time"
                  className="input"
                  value={newLectureEnd}
                  onChange={(e) => setNewLectureEnd(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Subject *</label>
                <input
                  type="text"
                  className="input"
                  list="modal-add-subject-options"
                  placeholder="e.g. Data Structures"
                  value={newLectureSubject}
                  onChange={(e) => setNewLectureSubject(e.target.value)}
                  required
                />
                <datalist id="modal-add-subject-options">
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="field-label">Faculty / Teacher *</label>
                <select
                  className="select"
                  value={newLectureTeacherId}
                  onChange={(e) => setNewLectureTeacherId(e.target.value)}
                  required
                >
                  <option value="">Select teacher...</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Room / Laboratory *</label>
                <input
                  type="text"
                  className="input"
                  list="modal-add-room-options"
                  placeholder="e.g. Lab 101"
                  value={newLectureRoom}
                  onChange={(e) => setNewLectureRoom(e.target.value)}
                  required
                />
                <datalist id="modal-add-room-options">
                  {STANDARD_ROOMS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setIsAddLectureModalOpen(false)
                  setCreateError(null)
                  setCreateSuccess(null)
                }}
              >
                Cancel
              </button>
              <button type="submit" className="button button--primary">
                <Plus size={16} /> Add Lecture to Timetable
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
