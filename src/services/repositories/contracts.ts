import type {
  Announcement,
  Assignment,
  Class,
  College,
  Doubt,
  Material,
  Message,
  Notification,
  Subject,
  Submission,
  TeacherVerificationRequest,
  TimetableEntry,
  UserProfile,
} from '../../types/domain'

export interface AuthRepository {
  loginWithEmail(email: string, password: string): Promise<void>
  loginWithGoogle(): Promise<void>
  registerWithEmail(email: string, password: string): Promise<void>
  logout(): Promise<void>
  resetPassword(email: string): Promise<void>
  getCurrentUser(): Promise<UserProfile | null>
  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void
}

export interface UserRepository {
  getProfile(uid: string): Promise<UserProfile | null>
  createProfile(profile: UserProfile): Promise<void>
  updateProfile(uid: string, data: Partial<UserProfile>): Promise<void>
  getUserByEmail(email: string): Promise<UserProfile | null>
}

export interface CollegeRepository {
  getCollege(collegeId: string): Promise<College | null>
  listColleges(): Promise<College[]>
}

export interface ClassRepository {
  getClass(classId: string): Promise<Class | null>
  listClassesByCollege(collegeId: string): Promise<Class[]>
  listClassesByTeacher(teacherId: string): Promise<Class[]>
  listClassesByStudent(studentId: string): Promise<Class[]>
}

export interface SubjectRepository {
  getSubject(subjectId: string): Promise<Subject | null>
  listSubjectsByCollege(collegeId: string): Promise<Subject[]>
  listSubjectsByClass(classId: string): Promise<Subject[]>
  listSubjectsByTeacher(teacherId: string): Promise<Subject[]>
}

export interface TimetableRepository {
  getTimetableEntry(entryId: string): Promise<TimetableEntry | null>
  listTimetableByClass(classId: string): Promise<TimetableEntry[]>
  listTimetableByTeacher(teacherId: string): Promise<TimetableEntry[]>
  listTimetableByClassAndDay(classId: string, day: string): Promise<TimetableEntry[]>
  updateTimetableEntry(entry: TimetableEntry): Promise<void>
  subscribeToClassTimetable(classId: string, callback: (entries: TimetableEntry[]) => void): () => void
  subscribeToTeacherTimetable(teacherId: string, callback: (entries: TimetableEntry[]) => void): () => void
}

export interface AnnouncementRepository {
  getAnnouncement(announcementId: string): Promise<Announcement | null>
  listAnnouncementsForStudent(studentId: string, collegeId: string, classId: string): Promise<Announcement[]>
  listAnnouncementsForTeacher(teacherId: string, collegeId: string): Promise<Announcement[]>
  listAnnouncementsForAdmin(collegeId: string): Promise<Announcement[]>
  createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  updateAnnouncement(announcementId: string, data: Partial<Announcement>): Promise<void>
  subscribeToAnnouncements(collegeId: string, callback: (announcements: Announcement[]) => void): () => void
}

export interface MaterialRepository {
  getMaterial(materialId: string): Promise<Material | null>
  listMaterialsByClass(classId: string): Promise<Material[]>
  listMaterialsBySubject(subjectId: string): Promise<Material[]>
  listMaterialsByTeacher(teacherId: string): Promise<Material[]>
  createMaterial(material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  deleteMaterial(materialId: string): Promise<void>
}

export interface AssignmentRepository {
  getAssignment(assignmentId: string): Promise<Assignment | null>
  listAssignmentsByClass(classId: string): Promise<Assignment[]>
  listAssignmentsByTeacher(teacherId: string): Promise<Assignment[]>
  listAssignmentsByStudent(studentId: string): Promise<Assignment[]>
  createAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void>
  deleteAssignment(assignmentId: string): Promise<void>
}

export interface SubmissionRepository {
  getSubmission(submissionId: string): Promise<Submission | null>
  listSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>
  listSubmissionsByStudent(studentId: string): Promise<Submission[]>
  createSubmission(submission: Omit<Submission, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void>
}

export interface DoubtRepository {
  getDoubt(doubtId: string): Promise<Doubt | null>
  listDoubtsByStudent(studentId: string): Promise<Doubt[]>
  listDoubtsByTeacher(teacherId: string): Promise<Doubt[]>
  listDoubtsByClassAndSubject(classId: string, subjectId: string): Promise<Doubt[]>
  createDoubt(doubt: Omit<Doubt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  updateDoubt(doubtId: string, data: Partial<Doubt>): Promise<void>
  subscribeToDoubts(classId: string, subjectId: string, callback: (doubts: Doubt[]) => void): () => void
}

export interface MessageRepository {
  listMessagesByClass(classId: string): Promise<Message[]>
  createMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<string>
  subscribeToClassMessages(classId: string, callback: (messages: Message[]) => void): () => void
}

export interface NotificationRepository {
  listNotificationsByUser(userId: string): Promise<Notification[]>
  markAsRead(notificationId: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string>
  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void
}

export interface TeacherVerificationRepository {
  listPendingVerifications(collegeId: string): Promise<TeacherVerificationRequest[]>
  getVerification(requestId: string): Promise<TeacherVerificationRequest | null>
  createVerificationRequest(request: Omit<TeacherVerificationRequest, 'id' | 'appliedAt' | 'status'>): Promise<string>
  updateVerification(requestId: string, status: 'approved' | 'rejected', reviewedBy: string): Promise<void>
}