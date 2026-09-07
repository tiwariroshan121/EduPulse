import { getCollection, getDocument, createDocument, updateDocument, where, orderBy } from '../../firebase/firestore'
import type { TeacherVerificationRepository } from '../contracts'
import type { TeacherVerificationRequest } from '@/types/domain'

export const firebaseTeacherVerificationRepository: TeacherVerificationRepository = {
  async listPendingVerifications(collegeId: string) {
    return getCollection<TeacherVerificationRequest>('teacherVerificationRequests', [where('collegeId', '==', collegeId), where('status', '==', 'pending'), orderBy('appliedAt', 'desc')])
  },

  async getVerification(requestId: string) {
    return getDocument<TeacherVerificationRequest>(`teacherVerificationRequests/${requestId}`)
  },

  async createVerificationRequest(request: Omit<TeacherVerificationRequest, 'id' | 'appliedAt' | 'status'>) {
    return createDocument('teacherVerificationRequests', { ...request, status: 'pending', appliedAt: new Date().toISOString() })
  },

  async updateVerification(requestId: string, status: 'approved' | 'rejected', reviewedBy: string) {
    await updateDocument(`teacherVerificationRequests/${requestId}`, {
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy,
    })
  },
}
