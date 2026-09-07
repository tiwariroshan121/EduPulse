import { getCollection, createDocument, updateDocument, subscribeToCollection, where, orderBy, limit as qLimit } from '../../firebase/firestore'
import type { NotificationRepository } from '../contracts'
import type { Notification } from '@/types/domain'

export const firebaseNotificationRepository: NotificationRepository = {
  async listNotificationsByUser(userId: string) {
    return getCollection<Notification>('notifications', [where('recipientId', '==', userId), orderBy('createdAt', 'desc'), qLimit(50)])
  },

  async markAsRead(notificationId: string) {
    await updateDocument(`notifications/${notificationId}`, { read: true })
  },

  async markAllAsRead(userId: string) {
    const notifications = await getCollection<Notification>('notifications', [where('recipientId', '==', userId), where('read', '==', false)])
    for (const notification of notifications) {
      await updateDocument(`notifications/${notification.id}`, { read: true })
    }
  },

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
    return createDocument('notifications', notification)
  },

  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    return subscribeToCollection<Notification>('notifications', [where('recipientId', '==', userId), orderBy('createdAt', 'desc'), qLimit(50)], callback)
  },
}
