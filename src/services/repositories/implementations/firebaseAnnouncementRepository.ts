import { getDocument, getCollection, createDocument, updateDocument, subscribeToCollection, where, orderBy, limit as qLimit } from '../../firebase/firestore'
import type { AnnouncementRepository } from '../contracts'
import type { Announcement } from '@/types/domain'

export const firebaseAnnouncementRepository: AnnouncementRepository = {
  async getAnnouncement(announcementId: string) {
    return getDocument<Announcement>(`announcements/${announcementId}`)
  },

  async listAnnouncementsForStudent(_studentId: string, collegeId: string, classId: string) {
    const announcements = await getCollection<Announcement>('announcements', [
      where('collegeId', '==', collegeId),
      where('audienceType', 'in', ['all_students', 'students_and_teachers', 'specific_class']),
      orderBy('createdAt', 'desc'),
      qLimit(50),
    ])

    return announcements.filter((a) => {
      if (a.audienceType === 'specific_class') return a.classId === classId
      return true
    })
  },

  async listAnnouncementsForTeacher(_teacherId: string, collegeId: string) {
    return getCollection<Announcement>('announcements', [
      where('collegeId', '==', collegeId),
      where('audienceType', 'in', ['all_teachers', 'students_and_teachers']),
      orderBy('createdAt', 'desc'),
      qLimit(50),
    ])
  },

  async listAnnouncementsForAdmin(collegeId: string) {
    return getCollection<Announcement>('announcements', [
      where('collegeId', '==', collegeId),
      orderBy('createdAt', 'desc'),
      qLimit(50),
    ])
  },

  async createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) {
    return createDocument('announcements', announcement)
  },

  async updateAnnouncement(announcementId: string, data: Partial<Announcement>) {
    await updateDocument(`announcements/${announcementId}`, data)
  },

  subscribeToAnnouncements(collegeId: string, callback: (announcements: Announcement[]) => void) {
    return subscribeToCollection<Announcement>('announcements', [where('collegeId', '==', collegeId), orderBy('createdAt', 'desc'), qLimit(50)], callback)
  },
}
