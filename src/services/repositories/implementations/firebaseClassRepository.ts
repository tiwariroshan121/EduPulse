import { getDocument, getCollection, where, orderBy } from '../../firebase/firestore'
import type { ClassRepository } from '../contracts'
import type { Class } from '@/types/domain'

export const firebaseClassRepository: ClassRepository = {
  async getClass(classId: string) {
    return getDocument<Class>(`classes/${classId}`)
  },

  async listClassesByCollege(collegeId: string) {
    return getCollection<Class>('classes', [where('collegeId', '==', collegeId), orderBy('createdAt', 'desc')])
  },

  async listClassesByTeacher(teacherId: string) {
    return getCollection<Class>('classes', [where('teacherIds', 'array-contains', teacherId), orderBy('createdAt', 'desc')])
  },

  async listClassesByStudent(studentId: string) {
    return getCollection<Class>('classes', [where('studentIds', 'array-contains', studentId), orderBy('createdAt', 'desc')])
  },
}
