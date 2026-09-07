import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

export const isFirebaseConfigured = Boolean(
  apiKey &&
  apiKey !== 'your_api_key_here' &&
  !apiKey.startsWith('your_') &&
  projectId &&
  projectId !== 'your_project_id' &&
  !projectId.startsWith('your_')
)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let messaging: Promise<Messaging | null> = Promise.resolve(null)

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    messaging = isSupported().then((supported) => (supported && app ? getMessaging(app) : null)).catch(() => null)
  } catch (error) {
    console.warn('Firebase initialization error:', error)
  }
}

export { app, auth, db, storage, messaging }
export default app
