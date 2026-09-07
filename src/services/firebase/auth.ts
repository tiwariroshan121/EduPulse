import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User,
  type UserCredential,
  type Auth,
} from 'firebase/auth'
import { auth } from './firebaseConfig'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

function requireAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please add your credentials to the .env file.')
  }
  return auth
}

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  const authInstance = requireAuth()
  await setPersistence(authInstance, browserLocalPersistence)
  return signInWithEmailAndPassword(authInstance, email, password)
}

export async function registerWithEmail(email: string, password: string): Promise<UserCredential> {
  const authInstance = requireAuth()
  await setPersistence(authInstance, browserLocalPersistence)
  return createUserWithEmailAndPassword(authInstance, email, password)
}

export async function loginWithGoogle(): Promise<UserCredential> {
  const authInstance = requireAuth()
  await setPersistence(authInstance, browserLocalPersistence)
  return signInWithPopup(authInstance, googleProvider)
}

export async function logout(): Promise<void> {
  if (!auth) return
  return signOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  const authInstance = requireAuth()
  return sendPasswordResetEmail(authInstance, email)
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const authInstance = requireAuth()
  const user = authInstance.currentUser
  if (!user || !user.email) {
    throw new Error('No user is currently authenticated.')
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null
}

export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return fbOnAuthStateChanged(auth, callback)
}
