import { getDocument, getCollection, updateDocument, subscribeToCollection, where, orderBy } from '../../firebase/firestore'
import type { TimetableRepository } from '../contracts'
import type { TimetableEntry } from '@/types/domain'

export const firebaseTimetableRepository: TimetableRepository = {
  async getTimetableEntry(entryId: string) {
    return getDocument<TimetableEntry>(`timetable/${entryId}`)
  },

  async listTimetableByClass(classId: string) {
    return getCollection<TimetableEntry>('timetable', [where('classId', '==', classId), orderBy('day'), orderBy('startTime')])
  },

  async listTimetableByTeacher(teacherId: string) {
    return getCollection<TimetableEntry>('timetable', [where('teacherId', '==', teacherId), orderBy('day'), orderBy('startTime')])
  },

  async listTimetableByClassAndDay(classId: string, day: string) {
    return getCollection<TimetableEntry>('timetable', [where('classId', '==', classId), where('day', '==', day), orderBy('startTime')])
  },

  async updateTimetableEntry(entry: TimetableEntry) {
    await updateDocument(`timetable/${entry.id}`, entry)
  },

  subscribeToClassTimetable(classId: string, callback: (entries: TimetableEntry[]) => void) {
    return subscribeToCollection<TimetableEntry>('timetable', [where('classId', '==', classId), orderBy('day'), orderBy('startTime')], callback)
  },

  subscribeToTeacherTimetable(teacherId: string, callback: (entries: TimetableEntry[]) => void) {
    return subscribeToCollection<TimetableEntry>('timetable', [where('teacherId', '==', teacherId), orderBy('day'), orderBy('startTime')], callback)
  },
}
