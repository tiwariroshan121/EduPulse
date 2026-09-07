import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { developmentUsers, initialData, initialCourses, initialAcademicClasses } from '../services/local/developmentData'
import { developmentAuthService } from '../services/local/developmentAuth'
import { firebaseAuthRepository } from '../services/repositories/implementations/firebaseAuthRepository'
import { isFirebaseConfigured } from '../services/firebase/firebaseConfig'
import { setDocument, updateDocument, deleteDocument, subscribeToCollection, where } from '../services/firebase/firestore'
import type {
  AnnouncementLegacy, AppSettings, AssignmentLegacy, ChatAttachment, ChatConversation, ChatMessage,
  DevelopmentData, DoubtLegacy, MaterialLegacy, MessageLegacy, ParticipantInfo, Role, ThemeMode, User, UserProfile,
  TimetableDocument, TimetableEntry, Holiday, SubjectReference, TimetableEntryStatus,
  TeacherLeave, TeacherLeaveStatus, TeacherLeaveType, Course, AcademicClass, GroupCategory,
} from '../types/domain'
import {
  type AppearanceConfig,
  applyAppearanceToDOM,
  loadAppearanceConfig,
  saveAppearanceConfig,
  defaultAppearanceConfig,
} from '../theme/appearanceConfig'
import { themePresets } from '../theme/themePresets'

interface Toast {
  id: number
  message: string
  tone?: 'success' | 'info' | 'error'
}

interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

interface AppContextValue {
  currentUser: User | null
  authState: AuthState
  data: DevelopmentData
  settings: AppSettings
  appearance: AppearanceConfig
  toast: Toast | null
  isFirebaseMode: boolean
  isOnline: boolean
  login: (email: string, password: string, role?: Role) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  switchRole: (role: Role) => void
  setTheme: (theme: ThemeMode) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  updateAppearance: (updates: Partial<AppearanceConfig>) => void
  setAppearancePreset: (presetId: string) => void
  resetAppearance: () => void
  notify: (message: string, tone?: Toast['tone']) => void
  markAnnouncementRead: (id: string) => void
  createAssignment: (assignment: Omit<AssignmentLegacy, 'id' | 'status'>) => void
  submitAssignment: (id: string, fileName: string, fileUrl?: string) => void
  gradeAssignment: (id: string, marks: string, feedback: string) => void
  createDoubt: (doubt: Omit<DoubtLegacy, 'id' | 'date' | 'status' | 'studentName'>) => void
  answerDoubt: (id: string, response: string) => void
  cancelClass: (id: string) => void
  createMaterial: (material: Omit<MaterialLegacy, 'id' | 'date'>) => void
  createAnnouncement: (announcement: Omit<AnnouncementLegacy, 'id' | 'date' | 'readBy'>) => void
  updateVerification: (id: string, status: 'Approved' | 'Rejected') => void
  sendMessage: (text: string) => void
  conversations: ChatConversation[]
  chatMessages: ChatMessage[]
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  sendChatMessage: (params: {
    conversationId: string
    text: string
    replyTo?: { id: string; senderName: string; text: string }
    attachment?: ChatAttachment
  }) => Promise<void>
  createGroupConversation: (params: {
    name: string
    description?: string
    participantIds: string[]
    category?: GroupCategory
  }) => Promise<string>
  startPersonalConversation: (otherUserId: string) => Promise<string>
  addParticipantToGroup: (conversationId: string, userId: string) => Promise<void>
  removeParticipantFromGroup: (conversationId: string, userId: string) => Promise<void>
  leaveGroup: (conversationId: string) => Promise<void>
  toggleMuteConversation: (conversationId: string) => Promise<void>
  deleteMessage: (messageId: string, mode: 'for_me' | 'for_everyone') => Promise<void>
  markConversationRead: (conversationId: string) => Promise<void>
  updateProfile: (nameOrUpdates: string | Partial<User>, email?: string) => Promise<void>
  uploadProfilePhoto: (file: File) => Promise<string>
  removeProfilePhoto: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  markNotificationsRead: () => void
  timetableDocuments: TimetableDocument[]
  timetableEntries: TimetableEntry[]
  holidays: Holiday[]
  teacherLeaves: TeacherLeave[]
  subjects: SubjectReference[]
  createTeacherLeave: (
    leave: Omit<TeacherLeave, 'id' | 'collegeId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>
  updateTeacherLeave: (leaveId: string, updates: Partial<TeacherLeave>) => Promise<void>
  deleteTeacherLeave: (leaveId: string) => Promise<void>
  endTeacherLeaveEarly: (leaveId: string, actualReturnDate: string, returnNotes?: string) => Promise<void>
  cancelLeaveAffectedLecture: (leaveId: string, weeklyEntryId: string, date: string, reason?: string) => Promise<void>
  substituteLeaveAffectedLecture: (
    leaveId: string,
    weeklyEntryId: string,
    date: string,
    substituteTeacherId: string,
    substituteTeacherName: string,
    reason?: string
  ) => Promise<void>
  rescheduleLeaveAffectedLecture: (
    leaveId: string,
    weeklyEntryId: string,
    originalDate: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    newRoom?: string,
    reason?: string
  ) => Promise<void>
  cancelAllPendingAffectedLectures: (leaveId: string) => Promise<void>
  restoreLecture: (entryId: string) => Promise<void>
  getTeacherAvailability: (
    teacherId: string,
    dateStr?: string,
    timeRange?: { start: string; end: string }
  ) => {
    onLeave: boolean
    leave?: TeacherLeave
    statusLabel: 'Available' | 'On Leave'
    reason?: string
  }
  getAffectedLecturesForLeave: (leaveParams: {
    teacherId: string
    startDate: string
    endDate: string
    leaveType: TeacherLeaveType
    startTime?: string
    endTime?: string
  }) => Array<{
    date: string
    dayOfWeek: TimetableEntry['dayOfWeek']
    weeklyEntry: TimetableEntry
    overrideEntry?: TimetableEntry
    status: TimetableEntryStatus
    currentTeacherName: string
    currentRoom: string
  }>
  checkSubstituteConflict: (
    substituteTeacherId: string,
    date: string,
    startTime: string,
    endTime: string
  ) => {
    hasConflict: boolean
    conflictingClass?: TimetableEntry
    reason?: string
  }
  courses: Course[]
  classes: AcademicClass[]
  createCourse: (course: Omit<Course, 'id' | 'collegeId' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>
  deleteCourse: (courseId: string) => Promise<void>
  archiveCourse: (courseId: string) => Promise<void>
  restoreCourse: (courseId: string) => Promise<void>
  createAcademicClass: (academicClass: Omit<AcademicClass, 'id' | 'collegeId' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateAcademicClass: (classId: string, updates: Partial<AcademicClass>) => Promise<void>
  deleteAcademicClass: (classId: string) => Promise<void>
  archiveAcademicClass: (classId: string) => Promise<void>
  restoreAcademicClass: (classId: string) => Promise<void>
  uploadTimetableDocument: (params: {
    course: string
    semester: string
    division: string
    academicYear: string
    effectiveFrom: string
    file: File
  }) => Promise<string>
  createTimetableEntry: (
    entry: Omit<TimetableEntry, 'id' | 'collegeId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'time'>
  ) => Promise<string>
  updateTimetableEntry: (entryId: string, updates: Partial<TimetableEntry>) => Promise<void>
  deleteTimetableEntry: (entryId: string) => Promise<void>
  cancelLecture: (entryId: string, reason: string, targetDate?: string) => Promise<void>
  rescheduleLecture: (
    entryId: string,
    params: {
      newDate: string
      newStartTime: string
      newEndTime: string
      newRoom?: string
      reason?: string
      originalDate?: string
    }
  ) => Promise<void>
  applyEmergencyChange: (
    entryId: string,
    params: {
      date: string
      teacherId?: string
      teacherName?: string
      room?: string
      reason: string
      substituteTeacherId?: string
      substituteTeacherName?: string
    }
  ) => Promise<void>
  assignSubstituteTeacher: (
    entryId: string,
    params: {
      date: string
      substituteTeacherId: string
      substituteTeacherName: string
      reason: string
    }
  ) => Promise<void>
  changeRoom: (
    entryId: string,
    params: {
      date: string
      newRoom: string
      reason: string
    }
  ) => Promise<void>
  addHoliday: (
    params: Omit<Holiday, 'id' | 'collegeId' | 'createdBy' | 'createdAt'>
  ) => Promise<string>
  deleteHoliday: (holidayId: string) => Promise<void>
  resolveTodaySchedule: (
    user: User | null,
    targetDate?: string
  ) => {
    isHoliday: boolean
    holidayName?: string
    entries: TimetableEntry[]
  }
}

const AppContext = createContext<AppContextValue | undefined>(undefined)
const dataStorageKey = 'edupulse-development-data'
const sessionStorageKey = 'edupulse-development-session'
const settingsStorageKey = 'edupulse-settings'

const restore = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function mapProfileToUser(profile: UserProfile | null): User | null {
  if (!profile) return null
  if (!profile.uid || !profile.role) return null
  return {
    id: profile.uid,
    role: profile.role,
    name: profile.displayName || 'College Member',
    email: profile.email || 'No email provided',
    avatar: profile.photoURL
      || (profile.displayName?.split(' ').map((n) => n[0]).join('') || 'U'),
    college: profile.collegeId || 'EduPulse Campus',
    identifier: profile.role === 'student'
      ? (profile as any).rollNumber || 'STU-001'
      : profile.role === 'teacher'
        ? (profile as any).employeeId || 'FAC-001'
        : profile.uid,
    photoURL: profile.photoURL || undefined,
    phone: (profile as any).phone || (profile as any).phoneNumber || undefined,
    course: (profile as any).courseName || undefined,
    semester: (profile as any).semester || undefined,
    division: (profile as any).division || undefined,
    batch: (profile as any).batch || undefined,
    department: (profile as any).department || undefined,
    designation: (profile as any).title || (profile as any).designation || undefined,
    subjects: (profile as any).subjects || undefined,
    verificationStatus: (profile as any).verificationStatus || undefined,
    status: profile.status || 'active',
    createdAt: profile.createdAt || undefined,
  }
}

function deriveAcademicConversations(
  academicClasses: AcademicClass[],
  allUsers: User[],
  collegeId: string,
  existingConversations: ChatConversation[] = [],
): ChatConversation[] {
  const existingMap = new Map<string, ChatConversation>()
  existingConversations.forEach((c) => existingMap.set(c.id, c))

  const userMap = new Map<string, User>()
  allUsers.forEach((u) => userMap.set(u.id, u))

  const adminUsers = allUsers.filter((u) => u.role === 'admin')
  const teacherUsers = allUsers.filter((u) => u.role === 'teacher')
  const studentUsers = allUsers.filter((u) => u.role === 'student')

  const adminIds = adminUsers.map((u) => u.id)
  if (adminIds.length === 0) adminIds.push('admin-1')

  const makeParticipantDetails = (pids: string[]): Record<string, ParticipantInfo> => {
    const details: Record<string, ParticipantInfo> = {}
    pids.forEach((uid) => {
      const u = userMap.get(uid)
      if (u) {
        details[uid] = {
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar || u.name[0] || 'U',
          identifier: u.identifier,
          department: u.department,
          email: u.email,
          photoURL: u.photoURL,
        }
      } else {
        details[uid] = {
          id: uid,
          name: uid === 'admin-1' ? 'Priya Nair (Principal)' : uid,
          role: uid.startsWith('admin') ? 'admin' : uid.startsWith('teacher') ? 'teacher' : 'student',
          avatar: uid.slice(0, 2).toUpperCase(),
        }
      }
    })
    return details
  }

  const result: ChatConversation[] = []

  // 1. Campus Community Hub (College-wide channel)
  const collegeConvId = 'conv-college-all'
  const allCollegeUserIds = Array.from(new Set([...allUsers.map((u) => u.id), ...adminIds]))
  const existingCollege = existingMap.get(collegeConvId)
  result.push({
    id: collegeConvId,
    type: 'group',
    category: 'college',
    collegeId,
    name: 'Campus Announcements & Community',
    description: 'Official campus-wide channel for general updates, student discussions, and verified announcements.',
    avatar: '🏛️',
    participants: allCollegeUserIds,
    participantDetails: makeParticipantDetails(allCollegeUserIds),
    adminIds: adminIds,
    lastMessage: existingCollege?.lastMessage || 'Welcome to the EduPulse Campus Community! Connect and ask questions here.',
    lastMessageAt: existingCollege?.lastMessageAt || 'Today',
    lastMessageSender: existingCollege?.lastMessageSender || 'Principal Office',
    unreadCount: existingCollege?.unreadCount || {},
    isMuted: existingCollege?.isMuted || {},
    createdAt: existingCollege?.createdAt || '2026-08-01T00:00:00.000Z',
    updatedAt: existingCollege?.updatedAt || new Date().toISOString(),
    createdBy: adminIds[0] || 'admin-1',
  })
  existingMap.delete(collegeConvId)

  // 2. Faculty Lounge & Admin Board
  const facultyConvId = 'conv-faculty-lounge'
  const facultyUserIds = Array.from(new Set([...teacherUsers.map((u) => u.id), ...adminIds]))
  const existingFaculty = existingMap.get(facultyConvId)
  result.push({
    id: facultyConvId,
    type: 'group',
    category: 'faculty',
    collegeId,
    name: 'Faculty Lounge & Admin Board',
    description: 'Private board for teaching staff, department chairs, and college management coordination.',
    avatar: '👨‍🏫',
    participants: facultyUserIds,
    participantDetails: makeParticipantDetails(facultyUserIds),
    adminIds: adminIds,
    lastMessage: existingFaculty?.lastMessage || 'Faculty notices and administrative schedules will be posted here.',
    lastMessageAt: existingFaculty?.lastMessageAt || 'Yesterday',
    lastMessageSender: existingFaculty?.lastMessageSender || 'Principal Office',
    unreadCount: existingFaculty?.unreadCount || {},
    isMuted: existingFaculty?.isMuted || {},
    createdAt: existingFaculty?.createdAt || '2026-08-01T00:00:00.000Z',
    updatedAt: existingFaculty?.updatedAt || new Date().toISOString(),
    createdBy: adminIds[0] || 'admin-1',
  })
  existingMap.delete(facultyConvId)

  // 3. Academic Class Groups for each class
  academicClasses.forEach((cls) => {
    const convId = `conv-class-${cls.id}`
    const existingClassConv = existingMap.get(convId) || existingConversations.find((c) => c.classId === cls.id)

    // Match students explicitly or via course/semester/division
    const matchingStudents = studentUsers.filter((s) => {
      if (cls.studentIds && cls.studentIds.includes(s.id)) return true
      const matchesCourse =
        s.course?.toLowerCase().includes(cls.courseName?.toLowerCase() || '') ||
        s.course?.toLowerCase().includes(cls.courseId?.toLowerCase() || '') ||
        s.department?.toLowerCase().includes(cls.courseName?.toLowerCase() || '')
      const matchesSem = String(s.semester || '') === String(cls.semester || '')
      const matchesDiv = (s.division || 'A').toUpperCase() === (cls.division || 'A').toUpperCase()
      return matchesCourse && matchesSem && matchesDiv
    })

    const classStudentIds = Array.from(new Set([...(cls.studentIds || []), ...matchingStudents.map((s) => s.id)]))
    const classTeacherIds = Array.from(
      new Set([
        ...(cls.teacherIds || []),
        ...((cls as any).classTeacherId ? [(cls as any).classTeacherId] : []),
      ]),
    )
    const classParticipantIds = Array.from(new Set([...classStudentIds, ...classTeacherIds, ...adminIds]))
    const classAdmins = Array.from(new Set([...classTeacherIds, ...adminIds]))

    const classDisplayName = cls.name
      ? `${cls.courseName || cls.courseId} · Sem ${cls.semester} · ${cls.division} (${cls.name})`
      : `${cls.courseName || cls.courseId} · Sem ${cls.semester} · Div ${cls.division}`

    result.push({
      id: convId,
      type: 'group',
      category: 'class',
      classId: cls.id,
      collegeId,
      name: classDisplayName,
      description: `Official class group for ${classDisplayName}. Enrolled students and faculty.`,
      avatar: '🎓',
      participants: classParticipantIds,
      participantDetails: makeParticipantDetails(classParticipantIds),
      adminIds: classAdmins,
      lastMessage: existingClassConv?.lastMessage || `Welcome to ${cls.name || cls.id} class channel!`,
      lastMessageAt: existingClassConv?.lastMessageAt || 'Today',
      lastMessageSender: existingClassConv?.lastMessageSender || 'Faculty',
      unreadCount: existingClassConv?.unreadCount || {},
      isMuted: existingClassConv?.isMuted || {},
      createdAt: existingClassConv?.createdAt || '2026-08-10T00:00:00.000Z',
      updatedAt: existingClassConv?.updatedAt || new Date().toISOString(),
      createdBy: classAdmins[0] || 'admin-1',
    })

    if (existingClassConv) {
      existingMap.delete(existingClassConv.id)
    }
  })

  // 4. Retain all user-created custom groups and 1-to-1 personal chats
  existingMap.forEach((conv) => {
    if (conv.type === 'personal') {
      result.push(conv)
    } else {
      let cat: GroupCategory = conv.category || 'custom'
      if (!conv.category) {
        if (conv.id === 'conv-group-1' || conv.name?.includes('Sem 2 · A')) {
          cat = 'class'
        }
      }
      result.push({
        ...conv,
        category: cat,
      })
    }
  })

  return result
}

export function AppProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<DevelopmentData>(() => {
    const loaded = restore(dataStorageKey, initialData)
    const loadedEntries = loaded.timetableEntries || []
    const existingEntryIds = new Set(loadedEntries.map((e: any) => e.id))
    const missingInitialEntries = (initialData.timetableEntries || []).filter((e) => !existingEntryIds.has(e.id))
    const mergedEntries = [...loadedEntries, ...missingInitialEntries]

    const effectiveClasses = loaded.classes && loaded.classes.length > 0 ? loaded.classes : (initialData.classes || initialAcademicClasses)
    const allUsers = loaded.users && loaded.users.length > 0 ? loaded.users : developmentUsers
    const collegeId = (allUsers[0]?.college) || 'Bonsalo College'

    const existingConvs = loaded.conversations && loaded.conversations.length > 0 ? loaded.conversations : (initialData.conversations || [])
    const derivedConvs = deriveAcademicConversations(effectiveClasses, allUsers, collegeId, existingConvs)

    return {
      ...initialData,
      ...loaded,
      courses: loaded.courses && loaded.courses.length > 0 ? loaded.courses : (initialData.courses || initialCourses),
      classes: effectiveClasses,
      timetableDocuments: loaded.timetableDocuments && loaded.timetableDocuments.length > 0 ? loaded.timetableDocuments : initialData.timetableDocuments,
      timetableEntries: mergedEntries.length > 0 ? mergedEntries : initialData.timetableEntries,
      teacherLeaves: loaded.teacherLeaves && loaded.teacherLeaves.length > 0 ? loaded.teacherLeaves : initialData.teacherLeaves,
      holidays: loaded.holidays && loaded.holidays.length > 0 ? loaded.holidays : initialData.holidays,
      subjects: loaded.subjects && loaded.subjects.length > 0 ? loaded.subjects : initialData.subjects,
      conversations: derivedConvs,
      chatMessages: loaded.chatMessages && loaded.chatMessages.length > 0 ? loaded.chatMessages : initialData.chatMessages,
    }
  })
  const [activeRole, setActiveRole] = useState<Role | null>(() => restore<Role | null>(sessionStorageKey, null))
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const [settings, setSettings] = useState<AppSettings>(() => {
    const initialDefault: AppSettings = {
      theme: 'dark',
      notificationsEnabled: true,
      emailUpdates: true,
      glassEnabled: true,
      backgroundAnimationEnabled: true,
      cardAnimationsEnabled: true,
      pageTransitionsEnabled: true,
      microInteractionsEnabled: true,
      reducedMotion: false,
      performanceMode: false,
    }
    const saved = restore<AppSettings>(settingsStorageKey, initialDefault)
    return { ...initialDefault, ...saved }
  })
  const [appearance, setAppearance] = useState<AppearanceConfig>(loadAppearanceConfig)

  // Synchronize dynamic appearance configuration with DOM and localStorage
  useEffect(() => {
    applyAppearanceToDOM(appearance)
    saveAppearanceConfig(appearance)
  }, [appearance])

  const [toast, setToast] = useState<Toast | null>(null)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: isFirebaseConfigured,
    error: null,
  })

  const conversations = useMemo(() => data.conversations || initialData.conversations || [], [data.conversations])
  const chatMessages = useMemo(() => data.chatMessages || initialData.chatMessages || [], [data.chatMessages])

  // Derive currentUser from Firebase profile (when configured) or dev role selection
  const currentUser = isFirebaseConfigured
    ? mapProfileToUser(authState.user)
    : (activeRole
        ? data.users.find((user) => user.role === activeRole)
          ?? developmentUsers.find((user) => user.role === activeRole)
          ?? null
        : null)

  // Persist dev data and settings
  useEffect(() => { localStorage.setItem(dataStorageKey, JSON.stringify(data)) }, [data])
  useEffect(() => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
    const currentTheme = appearance?.mode && appearance.mode !== 'system' ? appearance.mode : (settings.theme || 'dark')
    document.documentElement.dataset.theme = currentTheme
    document.documentElement.dataset.glass = String(settings.glassEnabled ?? true)
    document.documentElement.dataset.bgAnim = String(settings.backgroundAnimationEnabled ?? true)
    document.documentElement.dataset.cardAnim = String(settings.cardAnimationsEnabled ?? true)
    document.documentElement.dataset.pageTrans = String(settings.pageTransitionsEnabled ?? true)
    document.documentElement.dataset.microInteract = String(settings.microInteractionsEnabled ?? true)
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion ?? false)
    document.documentElement.dataset.perfMode = String(settings.performanceMode ?? false)
  }, [settings])
  useEffect(() => {
    if (activeRole) localStorage.setItem(sessionStorageKey, JSON.stringify(activeRole))
    else localStorage.removeItem(sessionStorageKey)
  }, [activeRole])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now()
    setToast({ id, message, tone })
    window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 3600)
  }, [])

  // Online / Offline network event detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      notify('Connection restored. You are back online.', 'success')
    }
    const handleOffline = () => {
      setIsOnline(false)
      notify('Connection lost. Working offline with cached data.', 'error')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [notify])

  // Firebase auth listener — only when configured
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthState({ user: null, loading: false, error: null })
      return
    }
    const unsubscribe = firebaseAuthRepository.onAuthStateChanged((user) => {
      setAuthState({ user, loading: false, error: null })
    })
    return unsubscribe
  }, [])

  // Real-time Firestore sync when Firebase is configured and user is active
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser?.college) return

    const college = currentUser.college

    const unsubAnnouncements = subscribeToCollection<AnnouncementLegacy>(
      'announcements',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, announcements: items }))
        }
      }
    )

    const unsubMaterials = subscribeToCollection<MaterialLegacy>(
      'materials',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, materials: items }))
        }
      }
    )

    const unsubAssignments = subscribeToCollection<AssignmentLegacy>(
      'assignments',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, assignments: items }))
        }
      }
    )

    const unsubDoubts = subscribeToCollection<DoubtLegacy>(
      'doubts',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, doubts: items }))
        }
      }
    )

    const unsubMessages = subscribeToCollection<MessageLegacy>(
      'messages',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, messages: items }))
        }
      }
    )

    const unsubConversations = subscribeToCollection<ChatConversation>(
      'conversations',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => {
            const currentConvs = prev.conversations || []
            const map = new Map<string, ChatConversation>()
            currentConvs.forEach((c) => map.set(c.id, c))
            items.forEach((c) => map.set(c.id, c))
            return { ...prev, conversations: Array.from(map.values()) }
          })
        }
      },
    )

    const unsubChatMessages = subscribeToCollection<ChatMessage>(
      'chatMessages',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => {
            const currentMsgs = prev.chatMessages || []
            const map = new Map<string, ChatMessage>()
            currentMsgs.forEach((m) => map.set(m.id, m))
            items.forEach((m) => map.set(m.id, m))
            return { ...prev, chatMessages: Array.from(map.values()) }
          })
        }
      },
    )

    const unsubTimetableDocs = subscribeToCollection<TimetableDocument>(
      'timetableDocuments',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, timetableDocuments: items }))
        }
      }
    )

    const unsubTimetableEntries = subscribeToCollection<TimetableEntry>(
      'timetableEntries',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({
            ...prev,
            timetableEntries: items,
            timetable: items as any,
          }))
        }
      }
    )

    const unsubHolidays = subscribeToCollection<Holiday>(
      'holidays',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, holidays: items }))
        }
      }
    )

    const unsubTeacherLeaves = subscribeToCollection<TeacherLeave>(
      'teacherLeaves',
      [where('collegeId', '==', college)],
      (items) => {
        if (items.length > 0) {
          setData((prev) => ({ ...prev, teacherLeaves: items }))
        }
      }
    )

    return () => {
      unsubAnnouncements()
      unsubMaterials()
      unsubAssignments()
      unsubDoubts()
      unsubMessages()
      unsubConversations()
      unsubChatMessages()
      unsubTimetableDocs()
      unsubTimetableEntries()
      unsubHolidays()
      unsubTeacherLeaves()
    }
  }, [currentUser?.college])

  const login = useCallback(async (email: string, password: string, role?: Role) => {
    if (!isFirebaseConfigured) {
      void developmentAuthService.loginWithEmail(email, password)
      const devRole = role ?? activeRole ?? 'student'
      setActiveRole(devRole)
      notify(`Signed in as ${devRole}.`, 'success')
      return
    }
    setAuthState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      await firebaseAuthRepository.loginWithEmail(email, password)
      notify('Signed in successfully.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.'
      setAuthState((prev) => ({ ...prev, error: message, loading: false }))
      notify(message, 'error')
      throw error
    }
  }, [activeRole, notify])

  const loginWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) {
      notify('Google Sign-In requires Firebase configuration. Please add your .env credentials.', 'info')
      return
    }
    setAuthState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      await firebaseAuthRepository.loginWithGoogle()
      notify('Signed in with Google.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google Sign-In failed.'
      setAuthState((prev) => ({ ...prev, error: message, loading: false }))
      notify(message, 'error')
      throw error
    }
  }, [notify])

  const logout = useCallback(async () => {
    if (!isFirebaseConfigured) {
      void developmentAuthService.logout()
      setActiveRole(null)
      notify('You have been signed out.', 'info')
      return
    }
    setAuthState((prev) => ({ ...prev, loading: true }))
    try {
      await firebaseAuthRepository.logout()
      notify('Signed out.', 'info')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed.'
      setAuthState((prev) => ({ ...prev, loading: false }))
      notify(message, 'error')
    }
  }, [notify])

  const resetPassword = useCallback(async (email: string) => {
    if (!isFirebaseConfigured) {
      notify('Password reset requires Firebase configuration.', 'info')
      return
    }
    try {
      await firebaseAuthRepository.resetPassword(email)
      notify('Password reset email sent. Check your inbox.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed.'
      notify(message, 'error')
      throw error
    }
  }, [notify])

  const switchRole = (role: Role) => {
    setActiveRole(role)
    notify(`Switched to ${role} workspace.`, 'info')
  }

  const setTheme = (theme: ThemeMode) => {
    setSettings((current) => ({ ...current, theme }))
    setAppearance((curr) => ({ ...curr, mode: theme }))
    const label = theme === 'comfort' ? 'Eye comfort' : theme[0].toUpperCase() + theme.slice(1)
    notify(`${label} mode enabled.`, 'info')
  }

  const updateSettings = (newSettings: Partial<AppSettings>) =>
    setSettings((current) => ({ ...current, ...newSettings }))

  const updateAppearance = useCallback((updates: Partial<AppearanceConfig>) => {
    setAppearance((curr) => ({
      ...curr,
      ...updates,
      palette: { ...curr.palette, ...(updates.palette || {}) },
      glass: { ...curr.glass, ...(updates.glass || {}) },
      orb: { ...curr.orb, ...(updates.orb || {}) },
      button: { ...curr.button, ...(updates.button || {}) },
      card: { ...curr.card, ...(updates.card || {}) },
      sidebar: { ...curr.sidebar, ...(updates.sidebar || {}) },
      navigation: { ...curr.navigation, ...(updates.navigation || {}) },
      background: { ...curr.background, ...(updates.background || {}) },
      typography: { ...curr.typography, ...(updates.typography || {}) },
    }))
  }, [])

  const setAppearancePreset = useCallback((presetId: string) => {
    const preset = themePresets.find((p) => p.id === presetId)
    if (!preset) return
    setAppearance((curr) => ({
      ...curr,
      ...preset.config,
      presetId: preset.id,
      palette: { ...curr.palette, ...(preset.config.palette || {}) },
      glass: { ...curr.glass, ...(preset.config.glass || {}) },
      orb: { ...curr.orb, ...(preset.config.orb || {}) },
      button: { ...curr.button, ...(preset.config.button || {}) },
      card: { ...curr.card, ...(preset.config.card || {}) },
      sidebar: { ...curr.sidebar, ...(preset.config.sidebar || {}) },
      navigation: { ...curr.navigation, ...(preset.config.navigation || {}) },
      background: { ...curr.background, ...(preset.config.background || {}) },
      typography: { ...curr.typography, ...(preset.config.typography || {}) },
    }))
    notify(`Theme updated to ${preset.name}`, 'info')
  }, [notify])

  const resetAppearance = useCallback(() => {
    setAppearance(defaultAppearanceConfig)
    applyAppearanceToDOM(defaultAppearanceConfig)
    saveAppearanceConfig(defaultAppearanceConfig)
    notify('Appearance reset to default Ocean Glass.', 'info')
  }, [notify])

  const markAnnouncementRead = (id: string) => {
    if (!currentUser) return
    const target = data.announcements.find((item) => item.id === id)
    if (!target) return
    const newReadBy = target.readBy.includes(currentUser.id) ? target.readBy : [...target.readBy, currentUser.id]
    setData((current) => ({
      ...current,
      announcements: current.announcements.map((item) =>
        item.id === id ? { ...item, readBy: newReadBy } : item,
      ),
    }))
    if (isFirebaseConfigured) {
      void updateDocument(`announcements/${id}`, { readBy: newReadBy }).catch((err) =>
        console.warn('Firestore markAnnouncementRead sync:', err)
      )
    }
  }

  const createAssignment = (assignment: Omit<AssignmentLegacy, 'id' | 'status'>) => {
    const id = `as-${Date.now()}`
    const collegeId = currentUser?.college || 'college-1'
    const newAssignment: AssignmentLegacy = {
      ...assignment,
      id,
      status: 'Pending',
    }
    setData((current) => ({
      ...current,
      assignments: [newAssignment, ...current.assignments],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'New assignment published',
          description: `${assignment.title} assigned for ${assignment.subject}. Due ${assignment.dueDate}.`,
          date: 'Just now',
          read: false,
        },
        ...current.notifications,
      ],
    }))
    if (isFirebaseConfigured) {
      void setDocument(`assignments/${id}`, {
        ...newAssignment,
        collegeId,
        teacherId: currentUser?.id,
      }).catch((err) => console.warn('Firestore createAssignment sync:', err))
    }
    notify('Assignment published to the class.')
  }

  const submitAssignment = (id: string, fileName: string, fileUrl?: string) => {
    const target = data.assignments.find((a) => a.id === id)
    const collegeId = currentUser?.college || 'college-1'
    setData((current) => ({
      ...current,
      assignments: current.assignments.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'Submitted',
              submissionFileName: fileName,
              ...(fileUrl ? { submissionUrl: fileUrl } : {}),
            }
          : item,
      ),
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Assignment submitted',
          description: `Submission recorded for ${target?.title ?? 'assignment'}. File: ${fileName}`,
          date: 'Just now',
          read: false,
        },
        ...current.notifications,
      ],
    }))
    if (isFirebaseConfigured) {
      const submissionId = `sub-${Date.now()}`
      void setDocument(`submissions/${submissionId}`, {
        id: submissionId,
        assignmentId: id,
        studentId: currentUser?.id,
        collegeId,
        fileName,
        fileUrl: fileUrl || null,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
      }).catch((err) => console.warn('Firestore submission sync:', err))
      void updateDocument(`assignments/${id}`, {
        status: 'Submitted',
        submissionFileName: fileName,
        ...(fileUrl ? { submissionUrl: fileUrl } : {}),
      }).catch((err) => console.warn('Firestore assignment status sync:', err))
    }
    notify('Assignment submitted successfully.')
  }

  const gradeAssignment = (id: string, marks: string, feedback: string) => {
    const target = data.assignments.find((a) => a.id === id)
    setData((current) => ({
      ...current,
      assignments: current.assignments.map((item) =>
        item.id === id ? { ...item, status: 'Graded', marks, feedback } : item,
      ),
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Assignment graded',
          description: `${target?.title ?? 'Assignment'} has been evaluated: ${marks}.`,
          date: 'Just now',
          read: false,
        },
        ...current.notifications,
      ],
    }))
    if (isFirebaseConfigured) {
      void updateDocument(`assignments/${id}`, {
        status: 'Graded',
        marks,
        feedback,
        gradedAt: new Date().toISOString(),
        gradedBy: currentUser?.name,
      }).catch((err) => console.warn('Firestore gradeAssignment sync:', err))
    }
    notify('Marks and feedback recorded.')
  }

  const createDoubt = (doubt: Omit<DoubtLegacy, 'id' | 'date' | 'status' | 'studentName'>) => {
    const id = `doubt-${Date.now()}`
    const collegeId = currentUser?.college || 'college-1'
    const newDoubt: DoubtLegacy = {
      ...doubt,
      id,
      date: new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending',
      studentName: currentUser?.name ?? 'Student',
      studentId: currentUser?.id,
      academicClassId: doubt.academicClassId || currentUser?.academicClassId,
    }
    setData((current) => ({
      ...current,
      doubts: [newDoubt, ...current.doubts],
    }))
    if (isFirebaseConfigured) {
      void setDocument(`doubts/${id}`, {
        ...newDoubt,
        studentId: currentUser?.id,
        collegeId,
      }).catch((err) => console.warn('Firestore createDoubt sync:', err))
    }
    notify('Doubt submitted. Your teacher will respond here.')
  }

  const answerDoubt = (id: string, response: string) => {
    const target = data.doubts.find((d) => d.id === id)
    const teacherName = currentUser?.name ?? 'Teacher'
    setData((current) => ({
      ...current,
      doubts: current.doubts.map((item) =>
        item.id === id
          ? { ...item, status: 'Answered', response, teacherName }
          : item,
      ),
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Doubt answered',
          description: `Teacher answered question on ${target?.subject ?? 'subject'}.`,
          date: 'Just now',
          read: false,
        },
        ...current.notifications,
      ],
    }))
    if (isFirebaseConfigured) {
      void updateDocument(`doubts/${id}`, {
        status: 'Answered',
        response,
        teacherName,
        teacherId: currentUser?.id,
        answeredAt: new Date().toISOString(),
      }).catch((err) => console.warn('Firestore answerDoubt sync:', err))
    }
    notify('Your answer has been shared with the student.')
  }

  // Time range overlap detector
  const checkTimesOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const parseMin = (t: string) => {
      if (!t) return 0
      const parts = t.trim().split(':')
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10)
    }
    const sA = parseMin(startA)
    const eA = parseMin(endA)
    const sB = parseMin(startB)
    const eB = parseMin(endB)
    return Math.max(sA, sB) < Math.min(eA, eB)
  }

  const createCourse = async (courseInput: Omit<Course, 'id' | 'collegeId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `course-${courseInput.code.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`
    const collegeId = currentUser?.college || 'Bonsalo College'
    const nowIso = new Date().toISOString()
    const newCourse: Course = {
      ...courseInput,
      id,
      collegeId,
      isActive: courseInput.isActive !== undefined ? courseInput.isActive : true,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    setData((prev) => ({
      ...prev,
      courses: [...(prev.courses || []), newCourse],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`courses/${id}`, newCourse).catch((err) =>
        console.warn('Firestore createCourse error:', err)
      )
    }

    notify(`Course "${newCourse.name}" created successfully.`, 'success')
    return id
  }

  const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<void> => {
    const nowIso = new Date().toISOString()
    setData((prev) => ({
      ...prev,
      courses: (prev.courses || []).map((c) => (c.id === courseId ? { ...c, ...updates, updatedAt: nowIso } : c)),
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`courses/${courseId}`, { ...updates, updatedAt: nowIso }).catch((err) =>
        console.warn('Firestore updateCourse error:', err)
      )
    }

    notify('Course updated successfully.', 'success')
  }

  const deleteCourse = async (courseId: string): Promise<void> => {
    setData((prev) => ({
      ...prev,
      courses: (prev.courses || []).filter((c) => c.id !== courseId),
    }))

    if (isFirebaseConfigured) {
      void deleteDocument(`courses/${courseId}`).catch((err) =>
        console.warn('Firestore deleteCourse error:', err)
      )
    }

    notify('Course removed.', 'info')
  }

  const archiveCourse = async (courseId: string): Promise<void> => {
    await updateCourse(courseId, { status: 'archived', isActive: false })
    notify('Course archived.', 'info')
  }

  const restoreCourse = async (courseId: string): Promise<void> => {
    await updateCourse(courseId, { status: 'active', isActive: true })
    notify('Course restored.', 'success')
  }

  const createAcademicClass = async (classInput: Omit<AcademicClass, 'id' | 'collegeId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const collegeId = currentUser?.college || 'Bonsalo College'

    // Strict duplicate check: (collegeId + courseId/courseName + semester + division + academicYear)
    const isDuplicate = (data.classes || []).some((c) => {
      const sameCollege = !c.collegeId || c.collegeId === collegeId
      const sameCourse =
        (c.courseId && classInput.courseId && c.courseId === classInput.courseId) ||
        (c.courseName && classInput.courseName && c.courseName.trim().toLowerCase() === classInput.courseName.trim().toLowerCase())
      const sameSem = String(c.semester).trim() === String(classInput.semester).trim()
      const sameDiv = c.division.trim().toUpperCase() === classInput.division.trim().toUpperCase()
      const sameYear = !classInput.academicYear || !c.academicYear || c.academicYear === classInput.academicYear
      return sameCollege && sameCourse && sameSem && sameDiv && sameYear
    })

    if (isDuplicate) {
      throw new Error(
        `Academic class already exists for ${classInput.courseName || classInput.courseId} Sem ${classInput.semester} Div ${classInput.division} (${classInput.academicYear || 'current session'}).`
      )
    }

    const courseSlug = (classInput.courseName || 'class').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const id = `class-${courseSlug}-s${classInput.semester}-${classInput.division.toLowerCase()}-${Date.now()}`
    const nowIso = new Date().toISOString()
    const newClass: AcademicClass = {
      ...classInput,
      id,
      collegeId,
      name: classInput.name || `${classInput.courseName} - Sem ${classInput.semester} - Div ${classInput.division}`,
      displayName: classInput.displayName || `${classInput.courseName} · Sem ${classInput.semester} · Div ${classInput.division}`,
      status: classInput.status || 'active',
      teacherIds: classInput.teacherIds || [],
      studentIds: classInput.studentIds || [],
      isActive: classInput.isActive !== undefined ? classInput.isActive : true,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    setData((prev) => ({
      ...prev,
      classes: [...(prev.classes || []), newClass],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`classes/${id}`, newClass).catch((err) =>
        console.warn('Firestore createAcademicClass error:', err)
      )
    }

    notify(`Academic Class "${newClass.name}" created successfully.`, 'success')
    return id
  }

  const updateAcademicClass = async (classId: string, updates: Partial<AcademicClass>): Promise<void> => {
    const nowIso = new Date().toISOString()
    setData((prev) => ({
      ...prev,
      classes: (prev.classes || []).map((c) => (c.id === classId ? { ...c, ...updates, updatedAt: nowIso } : c)),
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`classes/${classId}`, { ...updates, updatedAt: nowIso }).catch((err) =>
        console.warn('Firestore updateAcademicClass error:', err)
      )
    }

    notify('Academic Class updated successfully.', 'success')
  }

  const deleteAcademicClass = async (classId: string): Promise<void> => {
    setData((prev) => ({
      ...prev,
      classes: (prev.classes || []).filter((c) => c.id !== classId),
    }))

    if (isFirebaseConfigured) {
      void deleteDocument(`classes/${classId}`).catch((err) =>
        console.warn('Firestore deleteAcademicClass error:', err)
      )
    }

    notify('Academic Class removed.', 'info')
  }

  const archiveAcademicClass = async (classId: string): Promise<void> => {
    await updateAcademicClass(classId, { status: 'archived', isActive: false })
    notify('Academic Class archived.', 'info')
  }

  const restoreAcademicClass = async (classId: string): Promise<void> => {
    await updateAcademicClass(classId, { status: 'active', isActive: true })
    notify('Academic Class restored.', 'success')
  }

  const uploadTimetableDocument = async (params: {
    course: string
    semester: string
    division: string
    academicYear: string
    effectiveFrom: string
    file: File
  }): Promise<string> => {
    const collegeId = currentUser?.college || 'Bonsalo College'
    const docId = `tt-doc-${Date.now()}`

    // 1. Calculate Version
    const existingDocs = (data.timetableDocuments || []).filter(
      (d) =>
        d.collegeId === collegeId &&
        d.course.toLowerCase() === params.course.toLowerCase() &&
        d.semester === params.semester &&
        d.division.toUpperCase() === params.division.toUpperCase() &&
        d.academicYear === params.academicYear
    )
    const currentMaxVersion = existingDocs.reduce((max, d) => Math.max(max, d.version || 0), 0)
    const newVersion = currentMaxVersion + 1

    // 2. Upload file or generate preview URL
    let fileUrl = ''
    let storagePath: string | undefined
    const isPdf = params.file.type.includes('pdf') || params.file.name.toLowerCase().endsWith('.pdf')
    const fileType: 'pdf' | 'image' = isPdf ? 'pdf' : 'image'

    if (isFirebaseConfigured) {
      try {
        const { uploadFile, generateTimetableDocumentPath, validateFile } = await import('../services/firebase/storage')
        const validation = validateFile(params.file, { maxSizeMB: 20 })
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid file')
        }
        storagePath = generateTimetableDocumentPath(collegeId, docId, params.file.name)
        const res = await uploadFile(storagePath, params.file)
        fileUrl = res.downloadURL
      } catch (err: any) {
        console.warn('Firebase storage upload failed, falling back to blob URL:', err)
        fileUrl = URL.createObjectURL(params.file)
      }
    } else {
      fileUrl = URL.createObjectURL(params.file)
    }

    const nowIso = new Date().toISOString()
    const newDoc: TimetableDocument = {
      id: docId,
      collegeId,
      course: params.course,
      semester: params.semester,
      division: params.division,
      academicYear: params.academicYear,
      fileUrl,
      fileName: params.file.name,
      fileType,
      fileSize: params.file.size,
      storagePath,
      version: newVersion,
      effectiveFrom: params.effectiveFrom,
      uploadedBy: currentUser?.name || 'Administrator',
      uploadedAt: nowIso,
      isActive: true,
      status: 'published',
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    // 3. Archive previous active versions for this class
    const updatedDocs = (data.timetableDocuments || []).map((doc) => {
      if (
        doc.collegeId === collegeId &&
        doc.course.toLowerCase() === params.course.toLowerCase() &&
        doc.semester === params.semester &&
        doc.division.toUpperCase() === params.division.toUpperCase() &&
        doc.academicYear === params.academicYear &&
        doc.isActive
      ) {
        const archived = { ...doc, isActive: false, status: 'archived' as const, updatedAt: nowIso }
        if (isFirebaseConfigured) {
          void updateDocument(`timetableDocuments/${doc.id}`, { isActive: false, status: 'archived', updatedAt: nowIso })
        }
        return archived
      }
      return doc
    })

    const allDocs = [newDoc, ...updatedDocs]

    // 4. Create Notification
    const notif = {
      id: `notif-${Date.now()}`,
      title: '📢 New timetable published',
      description: `${params.course} Sem ${params.semester} Div ${params.division} official timetable (v${newVersion}) effective from ${params.effectiveFrom} has been published.`,
      date: 'Just now',
      read: false,
    }

    setData((prev) => ({
      ...prev,
      timetableDocuments: allDocs,
      notifications: [notif, ...prev.notifications],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`timetableDocuments/${newDoc.id}`, newDoc).catch((err) =>
        console.warn('Firestore timetableDocument sync:', err)
      )
    }

    notify(`Timetable v${newVersion} published. Previous version archived.`, 'success')
    return docId
  }

  const createTimetableEntry = async (
    entry: Omit<TimetableEntry, 'id' | 'collegeId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'time'>
  ): Promise<string> => {
    const collegeId = currentUser?.college || 'Bonsalo College'

    if (entry.startTime >= entry.endTime) {
      throw new Error('Start time must be strictly before end time.')
    }

    // Conflict detection
    const existing = (data.timetableEntries || []).filter(
      (e) =>
        e.collegeId === collegeId &&
        e.status !== 'Cancelled' &&
        (e.dayOfWeek === entry.dayOfWeek || (e.date && entry.date && e.date === entry.date))
    )

    for (const item of existing) {
      if (checkTimesOverlap(entry.startTime, entry.endTime, item.startTime, item.endTime)) {
        const isSameTeacher =
          (entry.teacherId && (item.teacherId === entry.teacherId || item.substituteTeacherId === entry.teacherId)) ||
          (entry.teacherName && (item.teacherName === entry.teacherName || item.substituteTeacherName === entry.teacherName))
        if (isSameTeacher) {
          throw new Error(
            `Teacher Conflict: ${entry.teacherName} is already assigned from ${item.startTime} to ${item.endTime} for ${item.subjectName || item.subject} (${item.course || ''}).`
          )
        }

        const isSameClass =
          (entry.academicClassId && item.academicClassId && entry.academicClassId === item.academicClassId) ||
          (entry.classId && item.classId && entry.classId === item.classId) ||
          (item.course.trim().toLowerCase() === entry.course.trim().toLowerCase() &&
            String(item.semester).trim() === String(entry.semester).trim() &&
            item.division.trim().toUpperCase() === entry.division.trim().toUpperCase())
        if (isSameClass) {
          throw new Error(
            `Class Conflict: ${entry.course} Sem ${entry.semester} Div ${entry.division} already has ${item.subjectName || item.subject} scheduled from ${item.startTime} to ${item.endTime}.`
          )
        }

        if (entry.room && item.room && entry.room.trim().toLowerCase() === item.room.trim().toLowerCase()) {
          throw new Error(
            `Room Conflict: Room ${entry.room} is already booked from ${item.startTime} to ${item.endTime} for ${item.subjectName || item.subject}.`
          )
        }
      }
    }

    const id = `tt-${Date.now()}`
    const nowIso = new Date().toISOString()
    const newEntry: TimetableEntry = {
      ...entry,
      id,
      collegeId,
      academicClassId: entry.academicClassId || entry.classId,
      classId: entry.classId || entry.academicClassId,
      time: `${entry.startTime} – ${entry.endTime}`,
      status: entry.status || 'Scheduled',
      entryType: entry.entryType || 'weekly',
      createdBy: currentUser?.id || 'admin',
      createdAt: nowIso,
      updatedAt: nowIso,
      day: entry.dayOfWeek,
      subject: entry.subjectName,
      teacher: entry.teacherName,
      className: entry.className || `${entry.course} · Sem ${entry.semester} · ${entry.division}`,
    }

    setData((prev) => ({
      ...prev,
      timetableEntries: [newEntry, ...(prev.timetableEntries || [])],
      timetable: [newEntry as any, ...prev.timetable],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`timetableEntries/${id}`, newEntry).catch((err) =>
        console.warn('Firestore timetableEntry sync:', err)
      )
      void setDocument(`timetable/${id}`, newEntry).catch((err) =>
        console.warn('Firestore legacy timetable sync:', err)
      )
    }

    notify(`Lecture added: ${newEntry.subjectName} (${newEntry.time})`, 'success')
    return id
  }

  const updateTimetableEntry = async (entryId: string, updates: Partial<TimetableEntry>): Promise<void> => {
    const existingEntry = (data.timetableEntries || []).find((e) => e.id === entryId)
    if (!existingEntry) throw new Error('Lecture entry not found')

    const merged = { ...existingEntry, ...updates }
    if (merged.startTime && merged.endTime && merged.startTime >= merged.endTime) {
      throw new Error('Start time must be before end time.')
    }

    const others = (data.timetableEntries || []).filter(
      (e) =>
        e.id !== entryId &&
        e.collegeId === merged.collegeId &&
        e.status !== 'Cancelled' &&
        (e.dayOfWeek === merged.dayOfWeek || (e.date && merged.date && e.date === merged.date))
    )

    for (const item of others) {
      if (checkTimesOverlap(merged.startTime, merged.endTime, item.startTime, item.endTime)) {
        if (
          (item.teacherId && item.teacherId === merged.teacherId) ||
          (item.substituteTeacherId && item.substituteTeacherId === merged.teacherId) ||
          (item.teacherName && item.teacherName === merged.teacherName)
        ) {
          throw new Error(`Teacher Conflict: ${merged.teacherName} is already assigned at ${item.startTime}–${item.endTime}.`)
        }
        const isSameClass =
          (merged.academicClassId && item.academicClassId && merged.academicClassId === item.academicClassId) ||
          (merged.classId && item.classId && merged.classId === item.classId) ||
          (item.course.trim().toLowerCase() === merged.course.trim().toLowerCase() &&
            String(item.semester).trim() === String(merged.semester).trim() &&
            item.division.trim().toUpperCase() === merged.division.trim().toUpperCase())
        if (isSameClass) {
          throw new Error(`Class Conflict: ${merged.course} Sem ${merged.semester} Div ${merged.division} already has a lecture at ${item.startTime}–${item.endTime}.`)
        }
        if (merged.room && item.room && merged.room.trim().toLowerCase() === item.room.trim().toLowerCase()) {
          throw new Error(`Room Conflict: Room ${merged.room} is already booked at ${item.startTime}–${item.endTime}.`)
        }
      }
    }

    const nowIso = new Date().toISOString()
    const updated: TimetableEntry = {
      ...merged,
      time: `${merged.startTime} – ${merged.endTime}`,
      day: merged.dayOfWeek,
      subject: merged.subjectName,
      teacher: merged.substituteTeacherName || merged.teacherName,
      className: updates.className || merged.className || `${merged.course} · Sem ${merged.semester} · ${merged.division}`,
      updatedAt: nowIso,
    }

    setData((prev) => ({
      ...prev,
      timetableEntries: (prev.timetableEntries || []).map((e) => (e.id === entryId ? updated : e)),
      timetable: prev.timetable.map((e) => (e.id === entryId ? (updated as any) : e)),
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`timetableEntries/${entryId}`, updated).catch((err) =>
        console.warn('Firestore timetableEntry update:', err)
      )
      void updateDocument(`timetable/${entryId}`, updated).catch((err) =>
        console.warn('Firestore legacy timetable update:', err)
      )
    }

    notify('Timetable entry updated.', 'success')
  }

  const deleteTimetableEntry = async (entryId: string): Promise<void> => {
    setData((prev) => ({
      ...prev,
      timetableEntries: (prev.timetableEntries || []).filter((e) => e.id !== entryId),
      timetable: prev.timetable.filter((e) => e.id !== entryId),
    }))
    if (isFirebaseConfigured) {
      void deleteDocument(`timetableEntries/${entryId}`).catch((err) =>
        console.warn('Firestore timetableEntry delete:', err)
      )
      void deleteDocument(`timetable/${entryId}`).catch((err) =>
        console.warn('Firestore legacy timetable delete:', err)
      )
    }
    notify('Lecture entry removed.', 'info')
  }

  const getTeacherAvailability = useCallback(
    (teacherId: string, dateStr?: string, timeRange?: { start: string; end: string }) => {
      const now = new Date()
      const targetDate = dateStr || now.toISOString().split('T')[0]
      const leaves = (data.teacherLeaves || []).filter(
        (l) => l.teacherId === teacherId && l.status !== 'CANCELLED'
      )

      for (const leave of leaves) {
        if (leave.actualReturnDate && targetDate >= leave.actualReturnDate) {
          continue
        }

        if (targetDate >= leave.startDate && targetDate <= leave.endDate) {
          if (leave.leaveType === 'Partial Day' && leave.startTime && leave.endTime && timeRange) {
            const maxStart = leave.startTime > timeRange.start ? leave.startTime : timeRange.start
            const minEnd = leave.endTime < timeRange.end ? leave.endTime : timeRange.end
            if (maxStart < minEnd) {
              return {
                onLeave: true,
                leave,
                statusLabel: 'On Leave' as const,
                reason: leave.reason,
              }
            }
          } else {
            return {
              onLeave: true,
              leave,
              statusLabel: 'On Leave' as const,
              reason: leave.reason,
            }
          }
        }
      }

      return {
        onLeave: false,
        statusLabel: 'Available' as const,
      }
    },
    [data.teacherLeaves]
  )

  const checkSubstituteConflict = useCallback(
    (substituteTeacherId: string, date: string, startTime: string, endTime: string) => {
      const avail = getTeacherAvailability(substituteTeacherId, date, { start: startTime, end: endTime })
      if (avail.onLeave) {
        return {
          hasConflict: true,
          reason: `Faculty is on leave on ${date}: ${avail.reason || 'Active leave'}.`,
        }
      }

      const d = new Date(date + 'T12:00:00')
      const daysOfWeekMap: Record<number, TimetableEntry['dayOfWeek']> = {
        0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
      }
      const weekday = daysOfWeekMap[d.getDay()] || 'Monday'

      const allEntries =
        data.timetableEntries && data.timetableEntries.length > 0
          ? data.timetableEntries
          : (data.timetable as any[] as TimetableEntry[])
      const college = currentUser?.college || 'Bonsalo College'

      const dateOverrides = allEntries.filter(
        (e) =>
          (!e.collegeId || e.collegeId === college) &&
          e.date === date &&
          (e.teacherId === substituteTeacherId || e.substituteTeacherId === substituteTeacherId) &&
          e.status !== 'Cancelled'
      )

      const overriddenWeeklyIds = new Set(
        allEntries
          .filter((e) => e.date === date && e.originalEntryId)
          .map((e) => e.originalEntryId)
      )

      const weeklyClasses = allEntries.filter(
        (e) =>
          (!e.collegeId || e.collegeId === college) &&
          (e.dayOfWeek === weekday || e.day === weekday) &&
          (e.entryType === 'weekly' || !e.entryType) &&
          !overriddenWeeklyIds.has(e.id) &&
          (e.teacherId === substituteTeacherId || e.substituteTeacherId === substituteTeacherId) &&
          e.status !== 'Cancelled'
      )

      const activeClasses = [...weeklyClasses, ...dateOverrides]

      for (const cls of activeClasses) {
        const s = cls.startTime || (cls.time ? cls.time.split('–')[0].trim() : '')
        const e = cls.endTime || (cls.time ? cls.time.split('–')[1].trim() : '')
        if (s && e) {
          const maxStart = s > startTime ? s : startTime
          const minEnd = e < endTime ? e : endTime
          if (maxStart < minEnd) {
            return {
              hasConflict: true,
              conflictingClass: cls,
              reason: `Faculty already has ${cls.subjectName || cls.subject} scheduled from ${s} to ${e} (${cls.course || ''} ${cls.division || ''}).`,
            }
          }
        }
      }

      return { hasConflict: false }
    },
    [data.timetableEntries, data.timetable, currentUser, getTeacherAvailability]
  )

  const cancelLecture = async (entryId: string, reason: string, targetDate?: string): Promise<void> => {
    const entry = (data.timetableEntries || []).find((e) => e.id === entryId) || (data.timetable as any[]).find((e) => e.id === entryId)
    const nowIso = new Date().toISOString()
    const notif = {
      id: `notif-${Date.now()}`,
      title: `⚠️ ${entry?.subjectName || entry?.subject || 'Lecture'} cancelled`,
      description: `${entry?.subjectName || entry?.subject || 'Class'} (${entry?.time ?? ''}) has been marked as cancelled. Reason: ${reason}`,
      date: 'Just now',
      read: false,
    }

    // If targetDate is supplied and the entry is a master recurring weekly entry,
    // preserve the recurring master entry and add a date-specific cancellation override!
    if (targetDate && entry && (entry.entryType === 'weekly' || !entry.entryType) && !entry.originalEntryId) {
      const newId = `tt-cancel-${Date.now()}`
      const d = new Date(targetDate + 'T12:00:00')
      const daysMap: Record<number, TimetableEntry['dayOfWeek']> = {
        0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday'
      }
      const targetDayOfWeek = daysMap[d.getDay()] || (entry.dayOfWeek as TimetableEntry['dayOfWeek']) || 'Monday'
      const cancelOverride: TimetableEntry = {
        ...entry,
        id: newId,
        date: targetDate,
        dayOfWeek: targetDayOfWeek,
        day: targetDayOfWeek,
        status: 'Cancelled',
        entryType: 'cancelled',
        originalEntryId: entryId,
        originalDate: targetDate,
        reason,
        createdAt: nowIso,
        updatedAt: nowIso,
      }

      setData((prev) => ({
        ...prev,
        timetableEntries: [cancelOverride, ...(prev.timetableEntries || [])],
        notifications: [notif, ...prev.notifications],
      }))

      if (isFirebaseConfigured) {
        void setDocument(`timetableEntries/${newId}`, cancelOverride).catch((err) =>
          console.warn('Firestore cancelLecture override:', err)
        )
      }
      notify('Lecture cancelled for this date. Students have been notified.', 'info')
      return
    }

    // Direct cancellation of single entry / override
    setData((prev) => ({
      ...prev,
      timetableEntries: (prev.timetableEntries || []).map((item) =>
        item.id === entryId ? { ...item, status: 'Cancelled' as const, reason, updatedAt: nowIso } : item
      ),
      timetable: prev.timetable.map((item) =>
        item.id === entryId ? { ...item, status: 'Cancelled' } : item
      ),
      notifications: [notif, ...prev.notifications],
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`timetableEntries/${entryId}`, { status: 'Cancelled', reason, updatedAt: nowIso }).catch(
        (err) => console.warn('Firestore cancelLecture:', err)
      )
      void updateDocument(`timetable/${entryId}`, { status: 'Cancelled', updatedAt: nowIso }).catch(
        (err) => console.warn('Firestore legacy cancelLecture:', err)
      )
    }
    notify('Lecture cancelled. Students have been notified.', 'info')
  }

  const cancelClass = (id: string) => {
    void cancelLecture(id, 'Class cancelled by teacher')
  }

  const rescheduleLecture = async (
    entryId: string,
    params: { newDate: string; newStartTime: string; newEndTime: string; newRoom?: string; reason?: string; originalDate?: string }
  ): Promise<void> => {
    const orig = (data.timetableEntries || []).find((e) => e.id === entryId) || (data.timetable as any[]).find((e) => e.id === entryId)
    if (!orig) throw new Error('Original lecture not found')

    // 1. Conflict Check: Teacher on leave on newDate
    const teacherId = orig.teacherId
    if (teacherId) {
      const avail = getTeacherAvailability(teacherId, params.newDate, {
        start: params.newStartTime,
        end: params.newEndTime,
      })
      if (avail.onLeave) {
        throw new Error(
          `Cannot reschedule: ${orig.teacherName || orig.teacher || 'Faculty'} is on leave on ${params.newDate} (${avail.reason || 'Active leave'}).`
        )
      }
    }

    // 2. Conflict Checks: Teacher double-booking, Room conflict, Batch clash on newDate
    const allEntries =
      data.timetableEntries && data.timetableEntries.length > 0
        ? data.timetableEntries
        : (data.timetable as any[] as TimetableEntry[])
    const targetRoom = params.newRoom || orig.room
    const newD = new Date(params.newDate + 'T12:00:00')
    const daysMap: Record<number, TimetableEntry['dayOfWeek']> = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday'
    }
    const targetDayOfWeek = daysMap[newD.getDay()] || 'Monday'

    const dateSpecificOnNewDate = allEntries.filter(
      (e) => e.date === params.newDate && e.id !== entryId && e.status !== 'Cancelled'
    )
    const overriddenWeeklyIdsOnNewDate = new Set(
      allEntries.filter((e) => e.date === params.newDate && e.originalEntryId).map((e) => e.originalEntryId)
    )
    const weeklyOnNewDate = allEntries.filter(
      (e) =>
        (e.dayOfWeek === targetDayOfWeek || e.day === targetDayOfWeek) &&
        (e.entryType === 'weekly' || !e.entryType) &&
        !overriddenWeeklyIdsOnNewDate.has(e.id) &&
        e.id !== entryId &&
        e.status !== 'Cancelled'
    )
    const activeOnNewDate = [...weeklyOnNewDate, ...dateSpecificOnNewDate]

    for (const act of activeOnNewDate) {
      const s = act.startTime || (act.time ? act.time.split('–')[0].trim() : '')
      const e = act.endTime || (act.time ? act.time.split('–')[1].trim() : '')
      if (s && e) {
        const maxStart = s > params.newStartTime ? s : params.newStartTime
        const minEnd = e < params.newEndTime ? e : params.newEndTime
        if (maxStart < minEnd) {
          if (teacherId && (act.teacherId === teacherId || act.substituteTeacherId === teacherId)) {
            throw new Error(
              `Faculty conflict: ${orig.teacherName || 'Faculty'} already has ${act.subjectName || act.subject} scheduled at ${s}–${e} on ${params.newDate}.`
            )
          }
          if (targetRoom && act.room && act.room === targetRoom) {
            throw new Error(
              `Room conflict: Room ${targetRoom} is already occupied by ${act.subjectName || act.subject} (${act.course || ''} ${act.division || ''}) at ${s}–${e} on ${params.newDate}.`
            )
          }
          if (
            orig.course && act.course &&
            orig.semester && act.semester &&
            orig.division && act.division &&
            orig.course === act.course &&
            orig.semester === act.semester &&
            orig.division === act.division
          ) {
            throw new Error(
              `Class conflict: Batch ${orig.course} Sem ${orig.semester} Div ${orig.division} already has ${act.subjectName || act.subject} at ${s}–${e} on ${params.newDate}.`
            )
          }
        }
      }
    }

    const newId = `tt-resched-${Date.now()}`
    const nowIso = new Date().toISOString()
    const origDate = params.originalDate || orig.date || new Date().toISOString().split('T')[0]

    const newEntry: TimetableEntry = {
      ...orig,
      id: newId,
      dayOfWeek: targetDayOfWeek,
      date: params.newDate,
      startTime: params.newStartTime,
      endTime: params.newEndTime,
      time: `${params.newStartTime} – ${params.newEndTime}`,
      room: targetRoom,
      status: 'Rescheduled',
      entryType: 'rescheduled',
      originalEntryId: entryId,
      originalDate: origDate,
      originalTime: orig.time,
      reason: params.reason || 'Lecture rescheduled',
      createdAt: nowIso,
      updatedAt: nowIso,
      day: targetDayOfWeek,
      subject: orig.subjectName || orig.subject,
      teacher: orig.teacherName || orig.teacher,
    }

    const notif = {
      id: `notif-${Date.now()}`,
      title: `🔄 ${orig.subjectName || orig.subject} rescheduled`,
      description: `${orig.subjectName || orig.subject} moved to ${params.newDate} at ${params.newStartTime}–${params.newEndTime}${targetRoom ? ` in Room ${targetRoom}` : ''}.`,
      date: 'Just now',
      read: false,
    }

    // If orig was a weekly recurring entry, we preserve the master recurring entry!
    // We add a date-specific override for origDate marking it rescheduled, and the newEntry for newDate.
    if ((orig.entryType === 'weekly' || !orig.entryType) && !orig.originalEntryId) {
      const origOverrideId = `tt-resched-orig-${Date.now()}`
      const origOverride: TimetableEntry = {
        ...orig,
        id: origOverrideId,
        date: origDate,
        status: 'Rescheduled',
        entryType: 'rescheduled',
        originalEntryId: entryId,
        replacementEntryId: newId,
        reason: params.reason || `Rescheduled to ${params.newDate} (${params.newStartTime}–${params.newEndTime})`,
        createdAt: nowIso,
        updatedAt: nowIso,
      }

      setData((prev) => ({
        ...prev,
        timetableEntries: [
          newEntry,
          origOverride,
          ...(prev.timetableEntries || []),
        ],
        notifications: [notif, ...prev.notifications],
      }))

      if (isFirebaseConfigured) {
        void setDocument(`timetableEntries/${newId}`, newEntry).catch((err) => console.warn(err))
        void setDocument(`timetableEntries/${origOverrideId}`, origOverride).catch((err) => console.warn(err))
      }
    } else {
      setData((prev) => ({
        ...prev,
        timetableEntries: [
          newEntry,
          ...(prev.timetableEntries || []).map((item) =>
            item.id === entryId
              ? { ...item, status: 'Rescheduled' as const, replacementEntryId: newId, reason: params.reason, updatedAt: nowIso }
              : item
          ),
        ],
        notifications: [notif, ...prev.notifications],
      }))

      if (isFirebaseConfigured) {
        void setDocument(`timetableEntries/${newId}`, newEntry).catch((err) => console.warn(err))
        void updateDocument(`timetableEntries/${entryId}`, {
          status: 'Rescheduled',
          replacementEntryId: newId,
          reason: params.reason,
          updatedAt: nowIso,
        }).catch((err) => console.warn(err))
      }
    }

    notify(`Lecture rescheduled to ${params.newDate} at ${params.newStartTime}.`, 'success')
  }

  const applyEmergencyChange = async (
    entryId: string,
    params: {
      date: string
      teacherId?: string
      teacherName?: string
      room?: string
      reason: string
      substituteTeacherId?: string
      substituteTeacherName?: string
    }
  ): Promise<void> => {
    const orig = (data.timetableEntries || []).find((e) => e.id === entryId) || (data.timetable as any[]).find((e) => e.id === entryId)
    if (!orig) throw new Error('Original lecture not found')

    const origStart = orig.startTime || (orig.time ? orig.time.split('–')[0].trim() : '')
    const origEnd = orig.endTime || (orig.time ? orig.time.split('–')[1].trim() : '')

    // Validate Substitute Conflict
    if (params.substituteTeacherId && origStart && origEnd) {
      const conflict = checkSubstituteConflict(params.substituteTeacherId, params.date, origStart, origEnd)
      if (conflict.hasConflict) {
        throw new Error(`Substitute conflict: ${conflict.reason}`)
      }
    }

    // Validate Room Conflict
    if (params.room && params.room !== orig.room && origStart && origEnd) {
      const allEntries =
        data.timetableEntries && data.timetableEntries.length > 0
          ? data.timetableEntries
          : (data.timetable as any[] as TimetableEntry[])
      const college = currentUser?.college || orig.collegeId || 'Bonsalo College'
      const d = new Date(params.date + 'T12:00:00')
      const daysMap: Record<number, TimetableEntry['dayOfWeek']> = {
        0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday'
      }
      const weekday = daysMap[d.getDay()] || 'Monday'

      const roomClash = allEntries.find((e) => {
        if (e.id === entryId || e.originalEntryId === entryId) return false
        if (e.collegeId && e.collegeId !== college) return false
        if (e.status === 'Cancelled') return false
        if (e.room !== params.room) return false
        const isMatchDate = e.date === params.date || (!e.date && (e.dayOfWeek === weekday || e.day === weekday))
        if (!isMatchDate) return false
        const s = e.startTime || (e.time ? e.time.split('–')[0].trim() : '')
        const endT = e.endTime || (e.time ? e.time.split('–')[1].trim() : '')
        return (s < origEnd && endT > origStart)
      })

      if (roomClash) {
        throw new Error(
          `Room conflict: Room ${params.room} is already booked for ${roomClash.subjectName || roomClash.subject} (${roomClash.course || ''} ${roomClash.time || ''}).`
        )
      }
    }

    const newId = `tt-override-${Date.now()}`
    const nowIso = new Date().toISOString()
    const d = new Date(params.date + 'T12:00:00')
    const daysMap: Record<number, TimetableEntry['dayOfWeek']> = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday'
    }
    const targetDayOfWeek = daysMap[d.getDay()] || orig.dayOfWeek

    const isSubstitute = Boolean(params.substituteTeacherId)
    const isRoomChanged = Boolean(params.room && params.room !== orig.room)
    const status: TimetableEntryStatus = isSubstitute ? 'Substitute' : isRoomChanged ? 'Room_Changed' : 'Special'

    const newOverride: TimetableEntry = {
      ...orig,
      id: newId,
      date: params.date,
      dayOfWeek: targetDayOfWeek,
      room: params.room || orig.room,
      originalRoom: isRoomChanged ? orig.room : undefined,
      teacherId: params.teacherId || orig.teacherId,
      teacherName: params.teacherName || orig.teacherName,
      substituteTeacherId: params.substituteTeacherId,
      substituteTeacherName: params.substituteTeacherName,
      status,
      entryType: 'emergency',
      originalEntryId: entryId,
      reason: params.reason,
      createdAt: nowIso,
      updatedAt: nowIso,
      day: targetDayOfWeek,
      subject: orig.subjectName || orig.subject,
      teacher: params.substituteTeacherName || params.teacherName || orig.teacherName || orig.teacher,
    }

    const notif = {
      id: `notif-${Date.now()}`,
      title: `⚡ Timetable Notice: ${orig.subjectName || orig.subject}`,
      description: `For ${params.date}: ${params.reason}`,
      date: 'Just now',
      read: false,
    }

    setData((prev) => ({
      ...prev,
      timetableEntries: [newOverride, ...(prev.timetableEntries || [])],
      notifications: [notif, ...prev.notifications],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`timetableEntries/${newId}`, newOverride).catch((err) => console.warn(err))
    }

    notify(`Emergency override saved for ${params.date}.`, 'success')
  }

  const assignSubstituteTeacher = async (
    entryId: string,
    params: { date: string; substituteTeacherId: string; substituteTeacherName: string; reason: string }
  ): Promise<void> => {
    return applyEmergencyChange(entryId, {
      date: params.date,
      substituteTeacherId: params.substituteTeacherId,
      substituteTeacherName: params.substituteTeacherName,
      reason: `Substitute Teacher: ${params.substituteTeacherName}. Reason: ${params.reason}`,
    })
  }

  const changeRoom = async (
    entryId: string,
    params: { date: string; newRoom: string; reason: string }
  ): Promise<void> => {
    return applyEmergencyChange(entryId, {
      date: params.date,
      room: params.newRoom,
      reason: `Room changed to ${params.newRoom}. Reason: ${params.reason}`,
    })
  }

  const addHoliday = async (
    params: Omit<Holiday, 'id' | 'collegeId' | 'createdBy' | 'createdAt'>
  ): Promise<string> => {
    const id = `hol-${Date.now()}`
    const collegeId = currentUser?.college || 'Bonsalo College'
    const newHol: Holiday = {
      ...params,
      id,
      collegeId,
      createdBy: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
    }

    const notif = {
      id: `notif-${Date.now()}`,
      title: `🏖 Campus Holiday: ${params.name}`,
      description: `${params.date}: ${params.description || 'No regular lectures scheduled.'}`,
      date: 'Just now',
      read: false,
    }

    setData((prev) => ({
      ...prev,
      holidays: [newHol, ...(prev.holidays || [])],
      notifications: [notif, ...prev.notifications],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`holidays/${id}`, newHol).catch((err) => console.warn('Firestore holiday sync:', err))
    }

    notify(`Holiday "${params.name}" announced for ${params.date}.`, 'success')
    return id
  }

  const deleteHoliday = async (holidayId: string): Promise<void> => {
    setData((prev) => ({
      ...prev,
      holidays: (prev.holidays || []).filter((h) => h.id !== holidayId),
    }))
    if (isFirebaseConfigured) {
      void deleteDocument(`holidays/${holidayId}`).catch((err) => console.warn(err))
    }
    notify('Holiday removed.', 'info')
  }

  const getAffectedLecturesForLeave = useCallback(
    (leaveParams: {
      teacherId: string
      startDate: string
      endDate: string
      leaveType: TeacherLeaveType
      startTime?: string
      endTime?: string
    }) => {
      const allEntries =
        data.timetableEntries && data.timetableEntries.length > 0
          ? data.timetableEntries
          : (data.timetable as any[] as TimetableEntry[])

      const college = currentUser?.college || 'Bonsalo College'
      const collegeWeeklyEntries = allEntries.filter(
        (e) =>
          (!e.collegeId || e.collegeId === college) &&
          e.entryType === 'weekly' &&
          (e.teacherId === leaveParams.teacherId || e.teacherName === leaveParams.teacherId)
      )

      const daysOfWeekMap: Record<number, TimetableEntry['dayOfWeek']> = {
        0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
      }

      const results: Array<{
        date: string
        dayOfWeek: TimetableEntry['dayOfWeek']
        weeklyEntry: TimetableEntry
        overrideEntry?: TimetableEntry
        status: TimetableEntryStatus
        currentTeacherName: string
        currentRoom: string
      }> = []

      const cur = new Date(leaveParams.startDate + 'T12:00:00')
      const end = new Date(leaveParams.endDate + 'T12:00:00')

      while (cur <= end) {
        const dStr = cur.toISOString().split('T')[0]
        const dayOfWeek = daysOfWeekMap[cur.getDay()] || 'Monday'

        const matchingWeekly = collegeWeeklyEntries.filter(
          (w) => w.dayOfWeek === dayOfWeek || w.day === dayOfWeek
        )

        for (const weekly of matchingWeekly) {
          if (
            leaveParams.leaveType === 'Partial Day' &&
            leaveParams.startTime &&
            leaveParams.endTime
          ) {
            const wStart = weekly.startTime || (weekly.time ? weekly.time.split('–')[0].trim() : '')
            const wEnd = weekly.endTime || (weekly.time ? weekly.time.split('–')[1].trim() : '')
            if (wStart && wEnd) {
              const maxStart = wStart > leaveParams.startTime ? wStart : leaveParams.startTime
              const minEnd = wEnd < leaveParams.endTime ? wEnd : leaveParams.endTime
              if (maxStart >= minEnd) {
                continue
              }
            }
          }

          const override = allEntries.find(
            (e) => e.date === dStr && e.originalEntryId === weekly.id
          )

          results.push({
            date: dStr,
            dayOfWeek,
            weeklyEntry: weekly,
            overrideEntry: override,
            status: override ? override.status : 'Scheduled',
            currentTeacherName: override?.substituteTeacherName || override?.teacherName || weekly.teacherName,
            currentRoom: override?.room || weekly.room || 'TBD',
          })
        }

        cur.setDate(cur.getDate() + 1)
      }

      results.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        const sA = a.weeklyEntry.startTime || a.weeklyEntry.time || ''
        const sB = b.weeklyEntry.startTime || b.weeklyEntry.time || ''
        return sA.localeCompare(sB)
      })

      return results
    },
    [data.timetableEntries, data.timetable, currentUser?.college]
  )

  const createTeacherLeave = async (
    leaveInput: Omit<TeacherLeave, 'id' | 'collegeId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (leaveInput.startDate > leaveInput.endDate) {
      throw new Error('End date cannot be before start date.')
    }

    const college = currentUser?.college || 'Bonsalo College'

    const existingLeave = (data.teacherLeaves || []).find(
      (l) =>
        l.teacherId === leaveInput.teacherId &&
        l.collegeId === college &&
        l.status !== 'CANCELLED' &&
        l.startDate <= leaveInput.endDate &&
        l.endDate >= leaveInput.startDate &&
        (!l.actualReturnDate || leaveInput.startDate < l.actualReturnDate)
    )

    if (existingLeave) {
      throw new Error(
        `Teacher already has an active or scheduled leave from ${existingLeave.startDate} to ${existingLeave.endDate} (${existingLeave.reason}).`
      )
    }

    const teacherUser = (data.users || []).find((u) => u.id === leaveInput.teacherId)
    const teacherName = teacherUser?.name || leaveInput.teacherName || 'Faculty Member'
    const teacherEmail = teacherUser?.email || leaveInput.teacherEmail
    const teacherDepartment = teacherUser?.department || leaveInput.teacherDepartment

    const affected = getAffectedLecturesForLeave({
      teacherId: leaveInput.teacherId,
      startDate: leaveInput.startDate,
      endDate: leaveInput.endDate,
      leaveType: leaveInput.leaveType,
      startTime: leaveInput.startTime,
      endTime: leaveInput.endTime,
    })

    const id = `leave-${Date.now()}`
    const nowIso = new Date().toISOString()
    const todayStr = nowIso.split('T')[0]

    const initialStatus: TeacherLeaveStatus =
      todayStr >= leaveInput.startDate && todayStr <= leaveInput.endDate ? 'ACTIVE' : 'UPCOMING'

    const newLeave: TeacherLeave = {
      ...leaveInput,
      id,
      collegeId: college,
      teacherName,
      teacherEmail,
      teacherDepartment,
      status: initialStatus,
      affectedLectureCount: affected.length,
      cancelledCount: 0,
      substitutedCount: 0,
      rescheduledCount: 0,
      createdBy: currentUser?.id || 'admin-1',
      createdByName: currentUser?.name || 'Administrator',
      createdByRole: currentUser?.role || 'admin',
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const notif = {
      id: `notif-${Date.now()}`,
      title: `🌴 Faculty Leave: ${teacherName}`,
      description: `${teacherName} on leave from ${leaveInput.startDate} to ${leaveInput.endDate} (${leaveInput.leaveType}). ${affected.length} lecture(s) affected. Reason: ${leaveInput.reason || 'Personal'}`,
      date: 'Just now',
      read: false,
    }

    setData((prev) => ({
      ...prev,
      teacherLeaves: [newLeave, ...(prev.teacherLeaves || [])],
      notifications: [notif, ...prev.notifications],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`teacherLeaves/${id}`, newLeave).catch((err) =>
        console.warn('Firestore teacherLeave sync:', err)
      )
    }

    notify(`Leave recorded for ${teacherName} (${affected.length} lecture(s) affected).`, 'success')
    return id
  }

  const updateTeacherLeave = async (
    leaveId: string,
    updates: Partial<TeacherLeave>
  ): Promise<void> => {
    const nowIso = new Date().toISOString()
    setData((prev) => ({
      ...prev,
      teacherLeaves: (prev.teacherLeaves || []).map((l) =>
        l.id === leaveId ? { ...l, ...updates, updatedAt: nowIso } : l
      ),
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`teacherLeaves/${leaveId}`, { ...updates, updatedAt: nowIso }).catch((err) =>
        console.warn('Firestore updateTeacherLeave:', err)
      )
    }

    notify('Leave details updated.', 'success')
  }

  const deleteTeacherLeave = async (leaveId: string): Promise<void> => {
    setData((prev) => ({
      ...prev,
      teacherLeaves: (prev.teacherLeaves || []).filter((l) => l.id !== leaveId),
    }))

    if (isFirebaseConfigured) {
      void deleteDocument(`teacherLeaves/${leaveId}`).catch((err) => console.warn(err))
    }

    notify('Leave record removed.', 'info')
  }

  const cancelLeaveAffectedLecture = async (
    leaveId: string,
    weeklyEntryId: string,
    date: string,
    reason?: string
  ): Promise<void> => {
    const orig =
      (data.timetableEntries || []).find((e) => e.id === weeklyEntryId) ||
      (data.timetable as any[]).find((e) => e.id === weeklyEntryId)
    if (!orig) throw new Error('Original lecture not found')

    const daysOfWeekMap: Record<number, TimetableEntry['dayOfWeek']> = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
    }
    const d = new Date(date + 'T12:00:00')
    const targetDayOfWeek = daysOfWeekMap[d.getDay()] || orig.dayOfWeek
    const newId = `tt-override-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const nowIso = new Date().toISOString()
    const finalReason = reason || 'Teacher on leave'

    const existingOverride = (data.timetableEntries || []).find(
      (e) => e.date === date && e.originalEntryId === orig.id
    )

    const overrideEntry: TimetableEntry = {
      ...orig,
      id: existingOverride ? existingOverride.id : newId,
      date,
      dayOfWeek: targetDayOfWeek,
      status: 'Cancelled',
      entryType: 'override',
      originalEntryId: orig.id,
      reason: finalReason,
      createdAt: existingOverride ? existingOverride.createdAt : nowIso,
      updatedAt: nowIso,
      day: targetDayOfWeek,
      subject: orig.subjectName,
      teacher: orig.teacherName,
    }

    const notif = {
      id: `notif-${Date.now()}`,
      title: `⚠️ ${orig.subjectName} cancelled`,
      description: `For ${date}: ${orig.subjectName} (${orig.time || orig.startTime + ' – ' + orig.endTime}) cancelled. Reason: ${finalReason}.`,
      date: 'Just now',
      read: false,
    }

    setData((prev) => {
      const updatedEntries = existingOverride
        ? (prev.timetableEntries || []).map((e) => (e.id === existingOverride.id ? overrideEntry : e))
        : [overrideEntry, ...(prev.timetableEntries || [])]

      const updatedLeaves = (prev.teacherLeaves || []).map((l) => {
        if (l.id === leaveId) {
          return {
            ...l,
            cancelledCount: (l.cancelledCount || 0) + 1,
            updatedAt: nowIso,
          }
        }
        return l
      })

      return {
        ...prev,
        timetableEntries: updatedEntries,
        teacherLeaves: updatedLeaves,
        notifications: [notif, ...prev.notifications],
      }
    })

    if (isFirebaseConfigured) {
      void setDocument(`timetableEntries/${overrideEntry.id}`, overrideEntry).catch((err) => console.warn(err))
      void updateDocument(`teacherLeaves/${leaveId}`, {
        cancelledCount: ((data.teacherLeaves || []).find((l) => l.id === leaveId)?.cancelledCount || 0) + 1,
        updatedAt: nowIso,
      }).catch((err) => console.warn(err))
    }

    notify(`Lecture for ${orig.subjectName} on ${date} marked as cancelled.`, 'info')
  }

  const substituteLeaveAffectedLecture = async (
    leaveId: string,
    weeklyEntryId: string,
    date: string,
    substituteTeacherId: string,
    substituteTeacherName: string,
    reason?: string
  ): Promise<void> => {
    const orig =
      (data.timetableEntries || []).find((e) => e.id === weeklyEntryId) ||
      (data.timetable as any[]).find((e) => e.id === weeklyEntryId)
    if (!orig) throw new Error('Original lecture not found')

    const daysOfWeekMap: Record<number, TimetableEntry['dayOfWeek']> = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
    }
    const d = new Date(date + 'T12:00:00')
    const targetDayOfWeek = daysOfWeekMap[d.getDay()] || orig.dayOfWeek
    const newId = `tt-override-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const nowIso = new Date().toISOString()
    const finalReason = reason || `Substitute Teacher: ${substituteTeacherName} (Faculty on leave)`

    const existingOverride = (data.timetableEntries || []).find(
      (e) => e.date === date && e.originalEntryId === orig.id
    )

    const overrideEntry: TimetableEntry = {
      ...orig,
      id: existingOverride ? existingOverride.id : newId,
      date,
      dayOfWeek: targetDayOfWeek,
      status: 'Substitute',
      entryType: 'override',
      originalEntryId: orig.id,
      substituteTeacherId,
      substituteTeacherName,
      reason: finalReason,
      createdAt: existingOverride ? existingOverride.createdAt : nowIso,
      updatedAt: nowIso,
      day: targetDayOfWeek,
      subject: orig.subjectName,
      teacher: substituteTeacherName,
    }

    const notif = {
      id: `notif-${Date.now()}`,
      title: `🔄 Substitute: ${orig.subjectName}`,
      description: `For ${date}: ${substituteTeacherName} will conduct ${orig.subjectName} (${orig.time || orig.startTime + ' – ' + orig.endTime}).`,
      date: 'Just now',
      read: false,
    }

    setData((prev) => {
      const updatedEntries = existingOverride
        ? (prev.timetableEntries || []).map((e) => (e.id === existingOverride.id ? overrideEntry : e))
        : [overrideEntry, ...(prev.timetableEntries || [])]

      const updatedLeaves = (prev.teacherLeaves || []).map((l) => {
        if (l.id === leaveId) {
          return {
            ...l,
            substitutedCount: (l.substitutedCount || 0) + 1,
            updatedAt: nowIso,
          }
        }
        return l
      })

      return {
        ...prev,
        timetableEntries: updatedEntries,
        teacherLeaves: updatedLeaves,
        notifications: [notif, ...prev.notifications],
      }
    })

    if (isFirebaseConfigured) {
      void setDocument(`timetableEntries/${overrideEntry.id}`, overrideEntry).catch((err) => console.warn(err))
      void updateDocument(`teacherLeaves/${leaveId}`, {
        substitutedCount: ((data.teacherLeaves || []).find((l) => l.id === leaveId)?.substitutedCount || 0) + 1,
        updatedAt: nowIso,
      }).catch((err) => console.warn(err))
    }

    notify(`Substitute ${substituteTeacherName} assigned for ${orig.subjectName} on ${date}.`, 'success')
  }

  const rescheduleLeaveAffectedLecture = async (
    leaveId: string,
    weeklyEntryId: string,
    _originalDate: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    newRoom?: string,
    reason?: string
  ): Promise<void> => {
    await rescheduleLecture(weeklyEntryId, {
      newDate,
      newStartTime,
      newEndTime,
      newRoom,
      reason: reason || 'Lecture rescheduled due to faculty leave',
    })

    const nowIso = new Date().toISOString()
    setData((prev) => ({
      ...prev,
      teacherLeaves: (prev.teacherLeaves || []).map((l) =>
        l.id === leaveId
          ? { ...l, rescheduledCount: (l.rescheduledCount || 0) + 1, updatedAt: nowIso }
          : l
      ),
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`teacherLeaves/${leaveId}`, {
        rescheduledCount: ((data.teacherLeaves || []).find((l) => l.id === leaveId)?.rescheduledCount || 0) + 1,
        updatedAt: nowIso,
      }).catch((err) => console.warn(err))
    }
  }

  const cancelAllPendingAffectedLectures = async (leaveId: string): Promise<void> => {
    const leave = (data.teacherLeaves || []).find((l) => l.id === leaveId)
    if (!leave) throw new Error('Leave record not found')

    const affected = getAffectedLecturesForLeave({
      teacherId: leave.teacherId,
      startDate: leave.startDate,
      endDate: leave.endDate,
      leaveType: leave.leaveType,
      startTime: leave.startTime,
      endTime: leave.endTime,
    })

    const pending = affected.filter((item) => item.status === 'Scheduled')
    if (pending.length === 0) {
      notify('All affected lectures are already handled.', 'info')
      return
    }

    for (const item of pending) {
      await cancelLeaveAffectedLecture(
        leaveId,
        item.weeklyEntry.id,
        item.date,
        `Teacher on leave: ${leave.reason || 'Personal'}`
      )
    }

    notify(`${pending.length} remaining affected lecture(s) marked as cancelled.`, 'success')
  }

  const endTeacherLeaveEarly = async (
    leaveId: string,
    actualReturnDate: string,
    returnNotes?: string
  ): Promise<void> => {
    const leave = (data.teacherLeaves || []).find((l) => l.id === leaveId)
    if (!leave) throw new Error('Leave record not found')

    const nowIso = new Date().toISOString()
    const isEarly = actualReturnDate < leave.endDate
    const newStatus: TeacherLeaveStatus = isEarly ? 'EARLY_RETURN' : 'COMPLETED'

    const overridesToRestore = (data.timetableEntries || []).filter(
      (e) =>
        e.entryType === 'override' &&
        e.date &&
        e.date >= actualReturnDate &&
        (e.teacherId === leave.teacherId || e.teacherName === leave.teacherName) &&
        e.status === 'Cancelled' &&
        (e.reason?.includes('Teacher on leave') || (leave.reason && e.reason?.includes(leave.reason)))
    )

    const idsToRemove = new Set(overridesToRestore.map((e) => e.id))

    const notif = {
      id: `notif-${Date.now()}`,
      title: `🟢 Faculty Returned: ${leave.teacherName}`,
      description: `${leave.teacherName} has returned on ${actualReturnDate}.${
        overridesToRestore.length > 0
          ? ` ${overridesToRestore.length} future lecture(s) restored to regular schedule.`
          : ''
      }`,
      date: 'Just now',
      read: false,
    }

    setData((prev) => ({
      ...prev,
      teacherLeaves: (prev.teacherLeaves || []).map((l) =>
        l.id === leaveId
          ? {
              ...l,
              status: newStatus,
              actualReturnDate,
              returnNotes: returnNotes || l.returnNotes,
              updatedAt: nowIso,
            }
          : l
      ),
      timetableEntries: (prev.timetableEntries || []).filter((e) => !idsToRemove.has(e.id)),
      notifications: [notif, ...prev.notifications],
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`teacherLeaves/${leaveId}`, {
        status: newStatus,
        actualReturnDate,
        returnNotes: returnNotes || '',
        updatedAt: nowIso,
      }).catch((err) => console.warn(err))

      for (const overrideId of idsToRemove) {
        void deleteDocument(`timetableEntries/${overrideId}`).catch((err) => console.warn(err))
      }
    }

    notify(
      `${leave.teacherName} marked as returned on ${actualReturnDate}.${
        overridesToRestore.length > 0 ? ` Restored ${overridesToRestore.length} lecture(s).` : ''
      }`,
      'success'
    )
  }

  const restoreLecture = async (entryId: string): Promise<void> => {
    const entry = (data.timetableEntries || []).find((e) => e.id === entryId) || (data.timetable as any[]).find((e) => e.id === entryId)
    if (!entry) throw new Error('Lecture entry not found')

    const nowIso = new Date().toISOString()

    if (entry.originalEntryId) {
      setData((prev) => ({
        ...prev,
        timetableEntries: (prev.timetableEntries || []).filter((e) => e.id !== entryId),
        notifications: [
          {
            id: `notif-${Date.now()}`,
            title: `🟢 Lecture restored: ${entry.subjectName || entry.subject}`,
            description: `${entry.subjectName || entry.subject} on ${entry.date || ''} (${entry.time || ''}) has been restored to normal schedule.`,
            date: 'Just now',
            read: false,
          },
          ...prev.notifications,
        ],
      }))

      if (isFirebaseConfigured) {
        void deleteDocument(`timetableEntries/${entryId}`).catch((err) => console.warn(err))
      }

      notify(`Lecture for ${entry.subjectName || entry.subject} on ${entry.date || ''} restored.`, 'success')
      return
    }

    setData((prev) => ({
      ...prev,
      timetableEntries: (prev.timetableEntries || []).map((e) =>
        e.id === entryId
          ? {
              ...e,
              status: 'Scheduled' as const,
              substituteTeacherId: undefined,
              substituteTeacherName: undefined,
              reason: undefined,
              updatedAt: nowIso,
            }
          : e
      ),
      timetable: prev.timetable.map((e) =>
        e.id === entryId
          ? {
              ...e,
              status: 'Scheduled',
            }
          : e
      ),
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: `🟢 Lecture restored: ${entry.subjectName || entry.subject}`,
          description: `${entry.subjectName || entry.subject} (${entry.time || ''}) has been restored to Scheduled status.`,
          date: 'Just now',
          read: false,
        },
        ...prev.notifications,
      ],
    }))

    if (isFirebaseConfigured) {
      void updateDocument(`timetableEntries/${entryId}`, {
        status: 'Scheduled',
        substituteTeacherId: null,
        substituteTeacherName: null,
        reason: null,
        updatedAt: nowIso,
      }).catch((err) => console.warn(err))
      void updateDocument(`timetable/${entryId}`, {
        status: 'Scheduled',
        updatedAt: nowIso,
      }).catch((err) => console.warn(err))
    }

    notify(`Lecture for ${entry.subjectName || entry.subject} restored.`, 'success')
  }


  const resolveTodaySchedule = useCallback(
    (user: User | null, targetDate?: string) => {
      const now = new Date()
      const dateStr = targetDate || now.toISOString().split('T')[0]
      const targetDateObj = targetDate ? new Date(targetDate + 'T12:00:00') : now
      const weekday = targetDateObj.toLocaleDateString('en-IN', { weekday: 'long' }) as TimetableEntry['dayOfWeek']

      // 1. Check Holiday Priority
      const matchingHoliday = (data.holidays || []).find((h) => {
        if (h.date !== dateStr) return false
        if (user?.college && h.collegeId && h.collegeId !== user.college) return false
        if (h.scope === 'all') return true
        if (!user) return false
        if (h.scope === 'course' && user.course && h.course === user.course) return true
        if (h.scope === 'semester' && user.semester && h.semester === user.semester) return true
        if (h.scope === 'division' && user.division && h.division === user.division) return true
        return false
      })

      if (matchingHoliday) {
        return {
          isHoliday: true,
          holidayName: matchingHoliday.name,
          entries: [],
        }
      }

      // 2. Filter candidate entries by user role & class
      const allEntries = data.timetableEntries && data.timetableEntries.length > 0
        ? data.timetableEntries
        : (data.timetable as any[] as TimetableEntry[])

      const userEntries = allEntries.filter((e) => {
        if (user?.college && e.collegeId && e.collegeId !== user.college) return false

        if (user?.role === 'student') {
          if (user.academicClassId) {
            if (e.academicClassId && e.academicClassId === user.academicClassId) return true
            if (e.classId && e.classId === user.academicClassId) return true
          }
          if (user.course && e.course) {
            const uCourse = user.course.toLowerCase().trim()
            const eCourse = e.course.toLowerCase().trim()
            const simplify = (s: string) =>
              s
                .replace(/information\s*technology/gi, 'it')
                .replace(/computer\s*science/gi, 'cs')
                .replace(/data\s*science/gi, 'ds')
                .replace(/bachelor\s*of\s*commerce/gi, 'bcom')
                .replace(/bachelor\s*of\s*computer\s*applications/gi, 'bca')
                .replace(/b\.?sc\.?/gi, '')
                .replace(/[^a-z0-9]/g, '')
            const simU = simplify(uCourse)
            const simE = simplify(eCourse)
            if (simU && simE && simU !== simE) return false
          }
          if (user.semester && e.semester && String(user.semester).trim() !== String(e.semester).trim()) return false
          if (user.division && e.division && user.division.trim().toUpperCase() !== e.division.trim().toUpperCase()) return false
          return true
        }

        if (user?.role === 'teacher') {
          return (
            e.teacherId === user.id ||
            e.substituteTeacherId === user.id ||
            e.teacherName === user.name ||
            e.teacher === user.name
          )
        }

        return true
      })

      // 3. Merge: Weekly Recurring vs Date-specific Overrides
      const dateSpecific = userEntries.filter((e) => e.date === dateStr)
      const weekly = userEntries.filter((e) => {
        if (e.date && e.date !== dateStr) return false
        return (e.dayOfWeek === weekday || e.day === weekday) && (e.entryType === 'weekly' || !e.entryType)
      })

      const overriddenWeeklyIds = new Set(
        dateSpecific.filter((d) => d.originalEntryId).map((d) => d.originalEntryId)
      )

      const activeWeekly = weekly.filter((w) => !overriddenWeeklyIds.has(w.id))
      const combined = [...activeWeekly, ...dateSpecific]

      combined.sort((a, b) => (a.startTime || a.time || '').localeCompare(b.startTime || b.time || ''))

      return {
        isHoliday: false,
        entries: combined,
      }
    },
    [data.holidays, data.timetableEntries, data.timetable]
  )

  const createMaterial = (material: Omit<MaterialLegacy, 'id' | 'date'>) => {
    const id = `mat-${Date.now()}`
    const collegeId = currentUser?.college || 'college-1'
    const newMaterial: MaterialLegacy = {
      ...material,
      id,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
    setData((current) => ({
      ...current,
      materials: [newMaterial, ...current.materials],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'New learning material',
          description: `${material.title} is now available for ${material.subject}.`,
          date: 'Just now',
          read: false,
        },
        ...current.notifications,
      ],
    }))
    if (isFirebaseConfigured) {
      void setDocument(`materials/${id}`, {
        ...newMaterial,
        collegeId,
        teacherId: currentUser?.id,
      }).catch((err) => console.warn('Firestore createMaterial sync:', err))
    }
    notify('Material added and visible to students.')
  }

  const createAnnouncement = (announcement: Omit<AnnouncementLegacy, 'id' | 'date' | 'readBy'>) => {
    const id = `ann-${Date.now()}`
    const collegeId = currentUser?.college || 'college-1'
    const newAnnouncement: AnnouncementLegacy = {
      ...announcement,
      id,
      date: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      readBy: [],
    }
    setData((current) => ({
      ...current,
      announcements: [newAnnouncement, ...current.announcements],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: `Campus update: ${announcement.title}`,
          description: announcement.description,
          date: 'Just now',
          read: false,
        },
        ...current.notifications,
      ],
    }))
    if (isFirebaseConfigured) {
      void setDocument(`announcements/${id}`, {
        ...newAnnouncement,
        collegeId,
        createdBy: currentUser?.id,
        audienceType: 'students_and_teachers',
      }).catch((err) => console.warn('Firestore createAnnouncement sync:', err))
    }
    notify('Announcement published to the campus.')
  }

  const updateVerification = (id: string, status: 'Approved' | 'Rejected') => {
    const req = data.verifications.find((v) => v.id === id)
    setData((current) => {
      let updatedUsers = current.users
      if (status === 'Approved' && req) {
        const existing = current.users.find((u) => u.identifier === req.employeeId)
        if (!existing) {
          updatedUsers = [
            ...current.users,
            {
              id: `teacher-${Date.now()}`,
              role: 'teacher',
              name: req.name,
              email: `${req.name.toLowerCase().replace(/\s+/g, '.')}@edupulse.dev`,
              avatar: req.name.split(' ').map((n) => n[0]).join(''),
              college: currentUser?.college || 'Bonsalo College',
              identifier: req.employeeId,
            },
          ]
        }
      }
      return {
        ...current,
        users: updatedUsers,
        verifications: current.verifications.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
        notifications: [
          {
            id: `notif-${Date.now()}`,
            title: `Teacher verification ${status.toLowerCase()}`,
            description: `${req?.name ?? 'Teacher'} application was ${status.toLowerCase()}.`,
            date: 'Just now',
            read: false,
          },
          ...current.notifications,
        ],
      }
    })
    if (isFirebaseConfigured) {
      void updateDocument(`teacherVerificationRequests/${id}`, {
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser?.id,
      }).catch((err) => console.warn('Firestore updateVerification sync:', err))
    }
    notify(`Teacher request ${status.toLowerCase()}.`, status === 'Approved' ? 'success' : 'error')
  }

  const sendMessage = (text: string) => {
    if (!currentUser) return
    const id = `msg-${Date.now()}`
    const collegeId = currentUser.college || 'college-1'
    const newMsg: MessageLegacy = {
      id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text,
      date: new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }
    setData((current) => ({
      ...current,
      messages: [...current.messages, newMsg],
    }))
    if (isFirebaseConfigured) {
      void setDocument(`messages/${id}`, {
        ...newMsg,
        collegeId,
        senderId: currentUser.id,
      }).catch((err) => console.warn('Firestore sendMessage sync:', err))
    }
  }

  const updateProfile = async (nameOrUpdates: string | Partial<User>, emailArg?: string) => {
    if (!currentUser) return
    let updates: Partial<User> = {}
    if (typeof nameOrUpdates === 'string') {
      updates = { name: nameOrUpdates, email: emailArg || currentUser.email }
    } else {
      updates = { ...nameOrUpdates }
    }

    // Never allow updating protected fields on client
    delete updates.id
    delete updates.college
    delete updates.role
    delete updates.identifier

    // Auto-update avatar initials if name is updated and user has no custom photoURL
    if (updates.name && !updates.photoURL && !currentUser.photoURL) {
      updates.avatar = updates.name.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'
    }

    setData((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === currentUser.id ? { ...user, ...updates } : user,
      ),
    }))

    if (isFirebaseConfigured) {
      const firestoreUpdates: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      }
      if (updates.name) firestoreUpdates.displayName = updates.name
      if (updates.photoURL !== undefined) firestoreUpdates.photoURL = updates.photoURL
      if (updates.phone !== undefined) firestoreUpdates.phone = updates.phone
      if (updates.division !== undefined) firestoreUpdates.division = updates.division

      void updateDocument(`users/${currentUser.id}`, firestoreUpdates).catch((err) =>
        console.warn('Firestore updateProfile sync:', err),
      )
    }
    notify('Profile updated successfully.', 'success')
  }

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error('No user is logged in.')
    if (file.size > 5 * 1024 * 1024) {
      notify('Profile photo size exceeds 5MB limit.', 'error')
      throw new Error('Profile photo size exceeds 5MB limit.')
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      notify('Please upload a valid image file (JPG, PNG, or WEBP).', 'error')
      throw new Error('Please upload a valid image file (JPG, PNG, or WEBP).')
    }

    let photoURL = ''
    if (isFirebaseConfigured) {
      const { uploadFile, generateProfilePath } = await import('../services/firebase/storage')
      const path = generateProfilePath(currentUser.id, file.name)
      const res = await uploadFile(path, file)
      photoURL = res.downloadURL
    } else {
      photoURL = URL.createObjectURL(file)
    }

    await updateProfile({ photoURL })
    notify('Profile photo updated successfully.', 'success')
    return photoURL
  }

  const removeProfilePhoto = async (): Promise<void> => {
    if (!currentUser) return
    const initials = currentUser.name.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'
    await updateProfile({ photoURL: '', avatar: initials })
    notify('Profile photo removed.', 'info')
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!currentUser) throw new Error('No user is logged in.')
    if (newPassword.length < 6) {
      notify('Password must be at least 6 characters long.', 'error')
      throw new Error('Password must be at least 6 characters long.')
    }
    if (isFirebaseConfigured) {
      const { changeUserPassword } = await import('../services/firebase/auth')
      await changeUserPassword(currentPassword, newPassword)
    }
    notify('Password changed successfully.', 'success')
  }

  const markNotificationsRead = () =>
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ({ ...item, read: true })),
    }))

  const sendChatMessage = async (params: {
    conversationId: string
    text: string
    replyTo?: { id: string; senderName: string; text: string }
    attachment?: ChatAttachment
  }) => {
    if (!currentUser) return
    const id = `cmsg-${Date.now()}`
    const collegeId = currentUser.college || 'college-1'
    const nowIso = new Date().toISOString()
    const newMsg: ChatMessage = {
      id,
      conversationId: params.conversationId,
      collegeId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      text: params.text.trim(),
      createdAt: nowIso,
      status: 'sent',
      replyTo: params.replyTo,
      attachment: params.attachment,
      deletedFor: [],
      isDeletedForEveryone: false,
    }

    const previewText = params.attachment
      ? `📎 ${params.attachment.fileName || 'Attachment'}${params.text ? `: ${params.text}` : ''}`
      : params.text

    const targetConv = (data.conversations || []).find((c) => c.id === params.conversationId)
    const nextUnread = { ...(targetConv?.unreadCount || {}) }
    if (targetConv) {
      targetConv.participants.forEach((pid) => {
        if (pid !== currentUser.id) {
          nextUnread[pid] = (nextUnread[pid] || 0) + 1
        }
      })
    }

    setData((current) => {
      const prevConvs = current.conversations || []
      const updatedConvs = prevConvs.map((conv) => {
        if (conv.id === params.conversationId) {
          return {
            ...conv,
            lastMessage: previewText,
            lastMessageAt: 'Just now',
            lastMessageSender: currentUser.name,
            unreadCount: nextUnread,
            updatedAt: nowIso,
          }
        }
        return conv
      })
      const prevMsgs = current.chatMessages || []
      return {
        ...current,
        conversations: updatedConvs,
        chatMessages: [...prevMsgs, newMsg],
      }
    })

    if (isFirebaseConfigured) {
      void setDocument(`chatMessages/${id}`, newMsg).catch((err) =>
        console.warn('Firestore sendChatMessage sync:', err),
      )

      void updateDocument(`conversations/${params.conversationId}`, {
        lastMessage: previewText,
        lastMessageAt: nowIso,
        lastMessageSender: currentUser.name,
        unreadCount: nextUnread,
        updatedAt: nowIso,
      }).catch((err) => console.warn('Firestore update lastMessage sync:', err))
    }
  }

  const createGroupConversation = async (params: {
    name: string
    description?: string
    participantIds: string[]
    category?: GroupCategory
  }): Promise<string> => {
    if (!currentUser) return ''
    const convId = `conv-grp-${Date.now()}`
    const collegeId = currentUser.college || 'college-1'
    const allParticipantIds = Array.from(new Set([currentUser.id, ...params.participantIds]))
    const nowIso = new Date().toISOString()

    const allUsers = [...data.users, ...developmentUsers]
    const participantDetails: Record<string, ParticipantInfo> = {}
    allParticipantIds.forEach((uid) => {
      const u = allUsers.find((x) => x.id === uid)
      if (u) {
        participantDetails[uid] = {
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar || u.name[0] || 'U',
          identifier: u.identifier,
          department: u.department,
          email: u.email,
          photoURL: u.photoURL,
        }
      }
    })
    participantDetails[currentUser.id] = {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar || currentUser.name[0] || 'U',
      identifier: currentUser.identifier,
      department: currentUser.department,
      email: currentUser.email,
      photoURL: currentUser.photoURL,
    }

    const newConv: ChatConversation = {
      id: convId,
      type: 'group',
      category: params.category || 'custom',
      name: params.name.trim(),
      description: params.description?.trim(),
      participants: allParticipantIds,
      participantDetails,
      adminIds: [currentUser.id],
      collegeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: currentUser.id,
      lastMessage: 'Group created',
      lastMessageAt: 'Just now',
      lastMessageSender: currentUser.name,
      unreadCount: {},
      isMuted: {},
    }

    setData((current) => ({
      ...current,
      conversations: [newConv, ...(current.conversations || [])],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`conversations/${convId}`, newConv).catch((err) =>
        console.warn('Firestore createGroupConversation sync:', err),
      )
    }

    setActiveConversationId(convId)
    notify(`Group "${params.name}" created successfully.`, 'success')
    return convId
  }

  const startPersonalConversation = async (otherUserId: string): Promise<string> => {
    if (!currentUser) return ''
    if (otherUserId === currentUser.id) {
      notify('Cannot start a direct message with yourself.', 'error')
      return ''
    }

    const convId = `conv-p-${[currentUser.id, otherUserId].sort().join('-')}`
    const existing = (data.conversations || []).find(
      (c) =>
        c.id === convId ||
        (c.type === 'personal' &&
          c.participants.includes(currentUser.id) &&
          c.participants.includes(otherUserId)),
    )

    if (existing) {
      setActiveConversationId(existing.id)
      return existing.id
    }

    const allUsers = [...data.users, ...developmentUsers]
    const otherUser = allUsers.find((u) => u.id === otherUserId)
    if (!otherUser) {
      notify('Selected user not found in campus directory.', 'error')
      return ''
    }

    const collegeId = currentUser.college || 'college-1'
    const nowIso = new Date().toISOString()
    const participantDetails: Record<string, ParticipantInfo> = {
      [currentUser.id]: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        avatar: currentUser.avatar || currentUser.name[0] || 'U',
        identifier: currentUser.identifier,
        department: currentUser.department,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
      },
      [otherUser.id]: {
        id: otherUser.id,
        name: otherUser.name,
        role: otherUser.role,
        avatar: otherUser.avatar || otherUser.name[0] || 'U',
        identifier: otherUser.identifier,
        department: otherUser.department,
        email: otherUser.email,
        photoURL: otherUser.photoURL,
      },
    }

    const newConv: ChatConversation = {
      id: convId,
      type: 'personal',
      name: otherUser.name,
      participants: [currentUser.id, otherUser.id],
      participantDetails,
      adminIds: [currentUser.id, otherUser.id],
      collegeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: currentUser.id,
      lastMessage: 'Conversation started',
      lastMessageAt: 'Just now',
      lastMessageSender: currentUser.name,
      unreadCount: {},
      isMuted: {},
    }

    setData((current) => ({
      ...current,
      conversations: [newConv, ...(current.conversations || [])],
    }))

    if (isFirebaseConfigured) {
      void setDocument(`conversations/${convId}`, newConv).catch((err) =>
        console.warn('Firestore startPersonalConversation sync:', err),
      )
    }

    setActiveConversationId(convId)
    return convId
  }

  const addParticipantToGroup = async (conversationId: string, userId: string) => {
    if (!currentUser) return
    const allUsers = [...data.users, ...developmentUsers]
    const newUser = allUsers.find((u) => u.id === userId)
    if (!newUser) return
    const nowIso = new Date().toISOString()

    setData((current) => {
      const convs = (current.conversations || []).map((c) => {
        if (c.id === conversationId) {
          const nextParticipants = Array.from(new Set([...c.participants, userId]))
          const nextDetails = {
            ...c.participantDetails,
            [userId]: {
              id: newUser.id,
              name: newUser.name,
              role: newUser.role,
              avatar: newUser.avatar,
              identifier: newUser.identifier,
            },
          }
          return {
            ...c,
            participants: nextParticipants,
            participantDetails: nextDetails,
            updatedAt: nowIso,
          }
        }
        return c
      })
      return { ...current, conversations: convs }
    })

    if (isFirebaseConfigured) {
      void updateDocument(`conversations/${conversationId}`, {
        updatedAt: nowIso,
      }).catch((err) => console.warn('Firestore addParticipant sync:', err))
    }
    notify(`${newUser.name} added to the group.`, 'success')
  }

  const removeParticipantFromGroup = async (conversationId: string, userId: string) => {
    if (!currentUser) return
    const nowIso = new Date().toISOString()
    setData((current) => {
      const convs = (current.conversations || []).map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            participants: c.participants.filter((id) => id !== userId),
            updatedAt: nowIso,
          }
        }
        return c
      })
      return { ...current, conversations: convs }
    })
    notify('Member removed from group.')
  }

  const leaveGroup = async (conversationId: string) => {
    if (!currentUser) return
    await removeParticipantFromGroup(conversationId, currentUser.id)
    setActiveConversationId(null)
    notify('You left the group.')
  }

  const toggleMuteConversation = async (conversationId: string) => {
    if (!currentUser) return
    setData((current) => {
      const convs = (current.conversations || []).map((c) => {
        if (c.id === conversationId) {
          const currentMuted = !!c.isMuted?.[currentUser.id]
          return {
            ...c,
            isMuted: {
              ...(c.isMuted || {}),
              [currentUser.id]: !currentMuted,
            },
          }
        }
        return c
      })
      return { ...current, conversations: convs }
    })
    notify('Notification preference updated.')
  }

  const deleteMessage = async (messageId: string, mode: 'for_me' | 'for_everyone') => {
    if (!currentUser) return
    setData((current) => {
      const msgs = (current.chatMessages || []).map((m) => {
        if (m.id === messageId) {
          if (mode === 'for_everyone') {
            return {
              ...m,
              text: 'This message was deleted',
              attachment: undefined,
              isDeletedForEveryone: true,
            }
          } else {
            return {
              ...m,
              deletedFor: [...(m.deletedFor || []), currentUser.id],
            }
          }
        }
        return m
      })
      return { ...current, chatMessages: msgs }
    })
    if (isFirebaseConfigured && mode === 'for_everyone') {
      void updateDocument(`chatMessages/${messageId}`, {
        text: 'This message was deleted',
        isDeletedForEveryone: true,
      }).catch((err) => console.warn('Firestore deleteMessage sync:', err))
    }
    notify(mode === 'for_everyone' ? 'Message deleted for everyone.' : 'Message deleted for you.')
  }

  const markConversationRead = useCallback(async (conversationId: string) => {
    if (!currentUser) return
    setData((current) => {
      let changed = false
      const convs = (current.conversations || []).map((c) => {
        if (c.id === conversationId) {
          if ((c.unreadCount?.[currentUser.id] ?? 0) === 0) {
            return c
          }
          changed = true
          return {
            ...c,
            unreadCount: {
              ...(c.unreadCount || {}),
              [currentUser.id]: 0,
            },
          }
        }
        return c
      })
      if (!changed) return current
      return { ...current, conversations: convs }
    })

    if (isFirebaseConfigured) {
      void updateDocument(`conversations/${conversationId}`, {
        [`unreadCount.${currentUser.id}`]: 0,
      }).catch((err) => console.warn('Firestore markConversationRead sync:', err))
    }
  }, [currentUser])

  const value = useMemo<AppContextValue>(() => ({
    currentUser, authState, data, settings, appearance, toast, isFirebaseMode: isFirebaseConfigured, isOnline,
    login, loginWithGoogle, logout, resetPassword, switchRole, setTheme, updateSettings, updateAppearance, setAppearancePreset, resetAppearance, notify,
    markAnnouncementRead, createAssignment, submitAssignment, gradeAssignment, createDoubt, answerDoubt, cancelClass,
    createMaterial, createAnnouncement, updateVerification, sendMessage, updateProfile, markNotificationsRead,
    uploadProfilePhoto, removeProfilePhoto, changePassword,
    conversations, chatMessages, activeConversationId, setActiveConversationId,
    sendChatMessage, createGroupConversation, startPersonalConversation, addParticipantToGroup,
    removeParticipantFromGroup, leaveGroup, toggleMuteConversation, deleteMessage, markConversationRead,
    timetableDocuments: data.timetableDocuments || [],
    timetableEntries: data.timetableEntries || [],
    courses: data.courses || initialData.courses || [],
    classes: data.classes || initialData.classes || [],
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
    holidays: data.holidays || [],
    teacherLeaves: data.teacherLeaves || [],
    subjects: data.subjects || [],
    createTeacherLeave,
    updateTeacherLeave,
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
    uploadTimetableDocument,
    createTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    cancelLecture,
    rescheduleLecture,
    applyEmergencyChange,
    assignSubstituteTeacher,
    changeRoom,
    addHoliday,
    deleteHoliday,
    resolveTodaySchedule,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentUser, authState, data, settings, appearance, toast, isOnline, notify, conversations, chatMessages, activeConversationId, resolveTodaySchedule, updateAppearance, setAppearancePreset, resetAppearance])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}