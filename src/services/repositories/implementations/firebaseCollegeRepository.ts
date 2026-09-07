import { getDocument, getCollection } from '../../firebase/firestore'
import type { CollegeRepository } from '../contracts'
import type { College } from '@/types/domain'

export const firebaseCollegeRepository: CollegeRepository = {
  async getCollege(collegeId: string) {
    return getDocument<College>(`colleges/${collegeId}`)
  },

  async listColleges() {
    return getCollection<College>('colleges')
  },
}
