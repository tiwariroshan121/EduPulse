import { getDocument, getCollection, where, orderBy } from '../../firebase/firestore'
import type { SubjectRepository } from '../contracts'
import type { Subject } from '@/types/domain'

export const firebaseSubjectRepository: SubjectRepository = {
  async getSubject(subjectId: string) {
    return getDocument<Subject>(`subjects/${subjectId}`)
  },

  async listSubjectsByCollege(collegeId: string) {
    return getCollection<Subject>('subjects', [where('collegeId', '==', collegeId), orderBy('createdAt', 'desc')])
  },

  async listSubjectsByClass(classId: string) {
    return getCollection<Subject>('subjects', [where('courseId', '==', classId), orderBy('createdAt', 'desc')])
  },

  async listSubjectsByTeacher(teacherId: string) {
    return getCollection<Subject>('subjects', [where('teacherIds', 'array-contains', teacherId), orderBy('createdAt', 'desc')])
  },
}
