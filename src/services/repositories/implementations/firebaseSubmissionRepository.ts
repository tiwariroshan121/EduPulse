import { getDocument, getCollection, createDocument, updateDocument, where, orderBy } from '../../firebase/firestore'
import type { SubmissionRepository } from '../contracts'
import type { Submission } from '@/types/domain'

export const firebaseSubmissionRepository: SubmissionRepository = {
  async getSubmission(submissionId: string) {
    return getDocument<Submission>(`submissions/${submissionId}`)
  },

  async listSubmissionsByAssignment(assignmentId: string) {
    return getCollection<Submission>('submissions', [where('assignmentId', '==', assignmentId), orderBy('submittedAt', 'desc')])
  },

  async listSubmissionsByStudent(studentId: string) {
    return getCollection<Submission>('submissions', [where('studentId', '==', studentId), orderBy('submittedAt', 'desc')])
  },

  async createSubmission(submission: Omit<Submission, 'id' | 'createdAt' | 'updatedAt'>) {
    return createDocument('submissions', submission)
  },

  async updateSubmission(submissionId: string, data: Partial<Submission>) {
    await updateDocument(`submissions/${submissionId}`, data)
  },
}
