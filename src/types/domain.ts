export const ROLES = ['student', 'teacher', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const USER_STATUSES = ['active', 'pending', 'rejected', 'disabled'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const TEACHER_VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'] as const
export type TeacherVerificationStatus = (typeof TEACHER_VERIFICATION_STATUSES)[number]

export type ThemeMode = 'light' | 'dark' | 'comfort'
export type AnnouncementCategory = 'Academic' | 'Event' | 'Urgent' | 'General'
export type AssignmentStatus = 'Pending' | 'Submitted' | 'Late' | 'Graded'
export type ClassStatus = 'Scheduled' | 'Cancelled' | 'Rescheduled' | 'Substitute' | 'Room_Changed' | 'Special'
export type TimetableEntryStatus = ClassStatus

export interface BaseUser {
  uid: string
  email: string
  displayName: string
  photoURL: string
  role: Role
  collegeId: string
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface StudentProfile extends BaseUser {
  role: 'student'
  rollNumber: string
  courseId: string
  courseName: string
  semester: string
  division: string
  academicClassId?: string
}

export interface TeacherProfile extends BaseUser {
  role: 'teacher'
  employeeId: string
  department: string
  subjects: string[]
  verificationStatus: TeacherVerificationStatus
}

export interface AdminProfile extends BaseUser {
  role: 'admin'
  title: string
}

export type UserProfile = StudentProfile | TeacherProfile | AdminProfile

export interface College {
  id: string
  name: string
  code: string
  university: string
  address: string
  email: string
  phone: string
  createdAt: string
  updatedAt: string
}

export interface Course {
  id: string
  collegeId: string
  name: string
  code: string
  department: string
  durationYears?: number
  totalSemesters?: number
  years?: ('FY' | 'SY' | 'TY')[]
  isActive: boolean
  status?: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface Class {
  id: string
  collegeId: string
  courseId: string
  courseName: string
  year?: 'FY' | 'SY' | 'TY' | string
  semester: string
  division: string
  name: string
  displayName?: string
  academicYear: string
  teacherIds: string[]
  studentIds: string[]
  isActive?: boolean
  status?: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export type AcademicClass = Class

export interface Subject {
  id: string
  collegeId: string
  name: string
  code: string
  courseId: string
  semester: string
  teacherIds: string[]
  createdAt: string
  updatedAt: string
}

export interface TimetableDocument {
  id: string
  collegeId: string
  course: string
  semester: string
  division: string
  academicYear: string
  fileUrl: string
  fileName: string
  fileType: 'image' | 'pdf'
  fileSize?: number
  storagePath?: string
  version: number
  effectiveFrom: string
  uploadedBy: string
  uploadedAt: string
  isActive: boolean
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface TimetableEntry {
  id: string
  collegeId: string
  timetableDocumentId?: string
  version?: number
  course: string
  semester: string
  division: string
  academicYear: string

  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
  date?: string // Optional YYYY-MM-DD for date-specific overrides/rescheduling

  startTime: string // "09:00"
  endTime: string   // "10:00"
  time: string      // "09:00 – 10:00 AM"

  subjectId?: string
  subjectName: string

  teacherId: string
  teacherName: string

  room?: string
  roomId?: string
  type?: 'Regular' | 'Practical' | 'Lab' | 'Tutorial' | 'Exam' | 'Extra Lecture' | 'Special Lecture'
  courseId?: string
  classId?: string
  academicClassId?: string
  year?: string

  status: TimetableEntryStatus
  entryType: 'weekly' | 'override' | 'rescheduled' | 'emergency'

  substituteTeacherId?: string
  substituteTeacherName?: string

  originalRoom?: string
  originalEntryId?: string
  originalDate?: string
  originalTime?: string
  replacementEntryId?: string

  reason?: string

  createdBy: string
  createdAt: string
  updatedAt: string

  // Backwards compatibility properties
  day?: string
  subject?: string
  teacher?: string
  className?: string
}

export interface Holiday {
  id: string
  collegeId: string
  name: string
  date: string // YYYY-MM-DD
  scope: 'all' | 'course' | 'semester' | 'division'
  course?: string
  semester?: string
  division?: string
  description?: string
  createdBy: string
  createdAt: string
}

export type TeacherLeaveType = 'Full Day' | 'Partial Day' | 'Half Day' | 'Emergency'
export type TeacherLeaveStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'EARLY_RETURN' | 'CANCELLED'

export interface TeacherLeave {
  id: string
  collegeId: string
  teacherId: string
  teacherName: string
  teacherEmail?: string
  teacherDepartment?: string

  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  leaveType: TeacherLeaveType

  startTime?: string // "09:00" for Partial Day
  endTime?: string   // "13:00" for Partial Day
  halfDayPeriod?: 'first_half' | 'second_half'

  reason: string
  notes?: string
  status: TeacherLeaveStatus

  actualReturnDate?: string // YYYY-MM-DD if teacher returned early
  returnNotes?: string

  affectedLectureCount?: number
  cancelledCount?: number
  substitutedCount?: number
  rescheduledCount?: number

  createdBy: string
  createdByName?: string
  createdByRole?: Role
  createdAt: string
  updatedAt: string
}


export interface SubjectReference {
  id: string
  collegeId: string
  name: string
  code: string
  course: string
  semester: string
  department?: string
  credits?: number
}

export interface Announcement {
  id: string
  collegeId: string
  createdBy: string
  createdByRole: Role
  title: string
  message: string
  audienceType: 'all_students' | 'all_teachers' | 'students_and_teachers' | 'specific_class'
  classId?: string
  subjectId?: string
  priority: 'low' | 'normal' | 'high'
  createdAt: string
  updatedAt: string
}

export interface Material {
  id: string
  collegeId: string
  classId: string
  subjectId: string
  teacherId: string
  title: string
  description: string
  fileName: string
  fileType: string
  fileSize: number
  storagePath: string
  downloadUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Assignment {
  id: string
  collegeId: string
  classId: string
  subjectId: string
  teacherId: string
  title: string
  description: string
  dueDate: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'closed'
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  classId: string
  collegeId: string
  fileName: string
  storagePath: string
  submittedAt: string
  status: 'submitted' | 'late' | 'graded'
  marks?: string
  feedback?: string
  gradedAt?: string
  gradedBy?: string
  createdAt: string
  updatedAt: string
}

export interface Doubt {
  id: string
  collegeId: string
  studentId: string
  classId: string
  subjectId: string
  question: string
  status: 'pending' | 'answered'
  teacherResponse?: string
  answeredBy?: string
  createdAt: string
  answeredAt?: string
  updatedAt: string
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderRole: Role
  classId: string
  collegeId: string
  text: string
  createdAt: string
}

export interface Notification {
  id: string
  recipientId: string
  collegeId: string
  type: 'assignment' | 'announcement' | 'class_cancelled' | 'doubt_answered' | 'assignment_graded' | 'teacher_verification' | 'message'
  title: string
  body: string
  relatedId?: string
  read: boolean
  createdAt: string
}

export interface TeacherVerificationRequest {
  id: string
  uid: string
  name: string
  email: string
  employeeId: string
  department: string
  collegeId: string
  status: TeacherVerificationStatus
  appliedAt: string
  reviewedAt?: string
  reviewedBy?: string
}

export interface DeviceToken {
  id: string
  uid: string
  token: string
  platform: 'web' | 'android' | 'ios'
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  theme: ThemeMode
  notificationsEnabled: boolean
  emailUpdates: boolean
  glassEnabled?: boolean
  backgroundAnimationEnabled?: boolean
  cardAnimationsEnabled?: boolean
  pageTransitionsEnabled?: boolean
  microInteractionsEnabled?: boolean
  reducedMotion?: boolean
  performanceMode?: boolean
}

// Phase 1 compatibility types
export interface User {
  id: string
  role: Role
  name: string
  email: string
  avatar: string
  college: string
  identifier: string
  photoURL?: string
  phone?: string
  course?: string
  semester?: string
  division?: string
  academicClassId?: string
  batch?: string
  department?: string
  designation?: string
  subjects?: string[]
  verificationStatus?: TeacherVerificationStatus
  status?: UserStatus
  createdAt?: string
}

export interface StudentProfileLegacy extends User {
  role: 'student'
  course: string
  semester: string
  division: string
}

export interface TeacherProfileLegacy extends User {
  role: 'teacher'
  employeeId: string
  department: string
  subject: string
}

export interface AdminProfileLegacy extends User {
  role: 'admin'
  title: string
}

export interface TimetableEntryLegacy {
  id: string
  day: string
  time: string
  subject: string
  teacher: string
  className: string
  room: string
  status: ClassStatus
}

export interface AnnouncementLegacy {
  id: string
  title: string
  description: string
  postedBy: string
  date: string
  category: AnnouncementCategory
  readBy: string[]
}

export interface MaterialLegacy {
  id: string
  title: string
  subject: string
  teacher: string
  className: string
  fileType: string
  date: string
  description: string
  fileName?: string
  downloadUrl?: string
}

export interface AssignmentLegacy {
  id: string
  title: string
  description: string
  subject: string
  teacher: string
  className: string
  dueDate: string
  status: AssignmentStatus
  marks?: string
  feedback?: string
  submissionFileName?: string
  submissionUrl?: string
}

export interface DoubtLegacy {
  id: string
  subject: string
  question: string
  date: string
  status: 'Pending' | 'Answered'
  studentName: string
  studentId?: string
  response?: string
  teacherName?: string
  teacherId?: string
  academicClassId?: string
  className?: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: 'image' | 'pdf' | 'document'
}

export interface MessageLegacy {
  id: string
  senderName: string
  senderRole: Role
  text: string
  date: string
}

export interface ChatAttachment {
  url: string
  fileName: string
  fileSize: number
  fileType: 'pdf' | 'doc' | 'image' | 'archive' | 'file'
}

export interface ChatMessage {
  id: string
  conversationId: string
  collegeId: string
  senderId: string
  senderName: string
  senderRole: Role
  senderAvatar?: string
  text: string
  replyTo?: {
    id: string
    senderName: string
    text: string
  }
  attachment?: ChatAttachment
  status?: 'sent' | 'delivered' | 'read'
  deletedFor?: string[]
  isDeletedForEveryone?: boolean
  createdAt: string
}

export interface ParticipantInfo {
  id: string
  name: string
  role: Role
  avatar: string
  identifier?: string
  department?: string
  email?: string
  photoURL?: string
}

export type GroupCategory = 'class' | 'faculty' | 'college' | 'custom'

export interface ChatConversation {
  id: string
  type: 'personal' | 'group'
  category?: GroupCategory
  classId?: string
  collegeId: string
  name?: string
  description?: string
  avatar?: string
  participants: string[]
  participantDetails: Record<string, ParticipantInfo>
  adminIds?: string[]
  lastMessage?: string
  lastMessageAt?: string
  lastMessageSender?: string
  unreadCount?: Record<string, number>
  isMuted?: Record<string, boolean>
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface NotificationLegacy {
  id: string
  title: string
  description: string
  date: string
  read: boolean
}

export interface TeacherVerificationRequestLegacy {
  id: string
  name: string
  employeeId: string
  department: string
  appliedDate: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

export interface DevelopmentData {
  users: User[]
  courses?: Course[]
  classes?: AcademicClass[]
  timetable: TimetableEntryLegacy[]
  timetableDocuments?: TimetableDocument[]
  timetableEntries?: TimetableEntry[]
  holidays?: Holiday[]
  teacherLeaves?: TeacherLeave[]
  subjects?: SubjectReference[]
  announcements: AnnouncementLegacy[]
  materials: MaterialLegacy[]
  assignments: AssignmentLegacy[]
  doubts: DoubtLegacy[]
  messages: MessageLegacy[]
  conversations?: ChatConversation[]
  chatMessages?: ChatMessage[]
  notifications: NotificationLegacy[]
  verifications: TeacherVerificationRequestLegacy[]
}