import { getDocument, getCollection, createDocument, updateDocument, subscribeToCollection, where, orderBy } from '../../firebase/firestore'
import type { DoubtRepository } from '../contracts'
import type { Doubt } from '@/types/domain'

export const firebaseDoubtRepository: DoubtRepository = {
  async getDoubt(doubtId: string) {
    return getDocument<Doubt>(`doubts/${doubtId}`)
  },

  async listDoubtsByStudent(studentId: string) {
    return getCollection<Doubt>('doubts', [where('studentId', '==', studentId), orderBy('createdAt', 'desc')])
  },

  async listDoubtsByTeacher(teacherId: string) {
    return getCollection<Doubt>('doubts', [where('answeredBy', '==', teacherId), orderBy('createdAt', 'desc')])
  },

  async listDoubtsByClassAndSubject(classId: string, subjectId: string) {
    return getCollection<Doubt>('doubts', [where('classId', '==', classId), where('subjectId', '==', subjectId), orderBy('createdAt', 'desc')])
  },

  async createDoubt(doubt: Omit<Doubt, 'id' | 'createdAt' | 'updatedAt'>) {
    return createDocument('doubts', doubt)
  },

  async updateDoubt(doubtId: string, data: Partial<Doubt>) {
    await updateDocument(`doubts/${doubtId}`, data)
  },

  subscribeToDoubts(classId: string, subjectId: string, callback: (doubts: Doubt[]) => void) {
    return subscribeToCollection<Doubt>('doubts', [where('classId', '==', classId), where('subjectId', '==', subjectId), orderBy('createdAt', 'desc')], callback)
  },
}
