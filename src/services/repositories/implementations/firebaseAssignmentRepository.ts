import { getDocument, getCollection, createDocument, updateDocument, deleteDocument, where, orderBy } from '../../firebase/firestore'
import type { AssignmentRepository } from '../contracts'
import type { Assignment } from '@/types/domain'

export const firebaseAssignmentRepository: AssignmentRepository = {
  async getAssignment(assignmentId: string) {
    return getDocument<Assignment>(`assignments/${assignmentId}`)
  },

  async listAssignmentsByClass(classId: string) {
    return getCollection<Assignment>('assignments', [where('classId', '==', classId), orderBy('createdAt', 'desc')])
  },

  async listAssignmentsByTeacher(teacherId: string) {
    return getCollection<Assignment>('assignments', [where('teacherId', '==', teacherId), orderBy('createdAt', 'desc')])
  },

  async listAssignmentsByStudent(_studentId: string) {
    return getCollection<Assignment>('assignments', [where('classId', 'in', []), orderBy('createdAt', 'desc')])
  },

  async createAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) {
    return createDocument('assignments', assignment)
  },

  async updateAssignment(assignmentId: string, data: Partial<Assignment>) {
    await updateDocument(`assignments/${assignmentId}`, data)
  },

  async deleteAssignment(assignmentId: string) {
    await deleteDocument(`assignments/${assignmentId}`)
  },
}
