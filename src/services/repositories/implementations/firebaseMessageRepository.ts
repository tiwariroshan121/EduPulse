import { getCollection, createDocument, subscribeToCollection, where, orderBy, limit as qLimit } from '../../firebase/firestore'
import type { MessageRepository } from '../contracts'
import type { Message } from '@/types/domain'

export const firebaseMessageRepository: MessageRepository = {
  async listMessagesByClass(classId: string) {
    return getCollection<Message>('messages', [where('classId', '==', classId), orderBy('createdAt', 'asc'), qLimit(100)])
  },

  async createMessage(message: Omit<Message, 'id' | 'createdAt'>) {
    return createDocument('messages', message)
  },

  subscribeToClassMessages(classId: string, callback: (messages: Message[]) => void) {
    return subscribeToCollection<Message>('messages', [where('classId', '==', classId), orderBy('createdAt', 'asc'), qLimit(100)], callback)
  },
}
