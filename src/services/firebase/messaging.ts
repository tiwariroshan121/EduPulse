import { messaging } from './firebaseConfig'
import { getToken, onMessage } from 'firebase/messaging'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch {
    return false
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const messagingInstance = await messaging
    if (!messagingInstance) return null
    const hasPermission = await requestNotificationPermission()
    if (!hasPermission) return null
    const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY })
    return token
  } catch {
    return null
  }
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  let unsubscribe: (() => void) | null = null
  messaging.then((instance) => {
    if (instance) {
      unsubscribe = onMessage(instance, callback)
    }
  })
  return () => unsubscribe?.()
}

export async function saveDeviceToken(uid: string, token: string, platform: 'web' | 'android' | 'ios'): Promise<void> {
  const { setDocument } = await import('./firestore')
  await setDocument(`deviceTokens/${token}`, { uid, token, platform, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
}

export async function removeDeviceToken(token: string): Promise<void> {
  const { deleteDocument } = await import('./firestore')
  await deleteDocument(`deviceTokens/${token}`)
}
