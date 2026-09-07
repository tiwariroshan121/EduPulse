import { getDocument, setDocument, updateDocument, getCollection, where, limit as qLimit } from '../../firebase/firestore'
import type { UserRepository } from '../contracts'
import type { UserProfile, StudentProfile, TeacherProfile, AdminProfile } from '@/types/domain'

function mapUserProfile(data: any): UserProfile {
  const base = {
    uid: data.uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL,
    role: data.role,
    collegeId: data.collegeId,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }

  switch (data.role) {
    case 'student':
      return { ...base, role: 'student', rollNumber: data.rollNumber, courseId: data.courseId, courseName: data.courseName, semester: data.semester, division: data.division } as StudentProfile
    case 'teacher':
      return { ...base, role: 'teacher', employeeId: data.employeeId, department: data.department, subjects: data.subjects || [], verificationStatus: data.verificationStatus } as TeacherProfile
    case 'admin':
      return { ...base, role: 'admin', title: data.title } as AdminProfile
    default:
      return base as UserProfile
  }
}

export const firebaseUserRepository: UserRepository = {
  async getProfile(uid: string) {
    const profile = await getDocument<any>(`users/${uid}`)
    if (!profile) return null
    return mapUserProfile({ ...profile, uid })
  },

  async createProfile(profile: UserProfile) {
    await setDocument(`users/${profile.uid}`, profile)
  },

  async updateProfile(uid: string, data: Partial<UserProfile>) {
    await updateDocument(`users/${uid}`, data)
  },

  async getUserByEmail(email: string) {
    const users = await getCollection<any>('users', [where('email', '==', email), qLimit(1)])
    if (users.length === 0) return null
    return mapUserProfile(users[0])
  },
}
