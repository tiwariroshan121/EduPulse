import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  logout,
  resetPassword,
  getCurrentUser,
  onAuthStateChanged,
} from '../../firebase/auth'
import { getDocument } from '../../firebase/firestore'
import type { AuthRepository } from '../contracts'
import type { UserProfile, StudentProfile, TeacherProfile, AdminProfile } from '@/types/domain'

function mapUserProfile(data: Record<string, any>): UserProfile {
  const base = {
    uid: data.uid,
    email: data.email ?? '',
    displayName: data.displayName ?? 'Unknown User',
    photoURL: data.photoURL ?? '',
    role: data.role,
    collegeId: data.collegeId ?? '',
    status: data.status ?? 'active',
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
  }

  switch (data.role) {
    case 'student':
      return {
        ...base,
        role: 'student',
        rollNumber: data.rollNumber ?? '',
        courseId: data.courseId ?? '',
        courseName: data.courseName ?? '',
        semester: data.semester ?? '',
        division: data.division ?? '',
      } as StudentProfile
    case 'teacher':
      return {
        ...base,
        role: 'teacher',
        employeeId: data.employeeId ?? '',
        department: data.department ?? '',
        subjects: Array.isArray(data.subjects) ? data.subjects : [],
        verificationStatus: data.verificationStatus ?? 'pending',
      } as TeacherProfile
    case 'admin':
      return {
        ...base,
        role: 'admin',
        title: data.title ?? 'Administrator',
      } as AdminProfile
    default:
      // Unknown role — treat as base (AppProvider will return null for missing role guard)
      return base as UserProfile
  }
}

export const firebaseAuthRepository: AuthRepository = {
  async loginWithEmail(email: string, password: string) {
    await loginWithEmail(email, password)
  },

  async loginWithGoogle() {
    await loginWithGoogle()
  },

  async registerWithEmail(email: string, password: string) {
    await registerWithEmail(email, password)
  },

  async logout() {
    await logout()
  },

  async resetPassword(email: string) {
    await resetPassword(email)
  },

  async getCurrentUser() {
    const user = getCurrentUser()
    if (!user) return null

    const profile = await getDocument<Record<string, any>>(`users/${user.uid}`)
    if (!profile) return null

    return mapUserProfile({
      ...profile,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    })
  },

  onAuthStateChanged(callback) {
    return onAuthStateChanged(async (user) => {
      if (!user) {
        callback(null)
        return
      }

      try {
        const profile = await getDocument<Record<string, any>>(`users/${user.uid}`)
        if (!profile) {
          // User is authenticated in Firebase Auth but has no Firestore profile yet.
          // This happens if registration was incomplete. Return null so Guard shows login.
          callback(null)
          return
        }

        callback(mapUserProfile({
          ...profile,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }))
      } catch (error) {
        // Firestore read failure (network/permission). Return null to avoid stuck loading.
        callback(null)
      }
    })
  },
}
