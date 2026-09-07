import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type Firestore,
} from 'firebase/firestore'
import { db } from './firebaseConfig'

function requireDb(): Firestore {
  if (!db) {
    throw new Error('Firestore is not configured. Please add your credentials to the .env file.')
  }
  return db
}

export function col(path: string) {
  return collection(requireDb(), path)
}

export function document(path: string) {
  return doc(requireDb(), path)
}

export async function getDocument<T>(path: string): Promise<T | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, path))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null
}

export async function getCollection<T>(path: string, constraints: QueryConstraint[] = []): Promise<T[]> {
  if (!db) return []
  const q = query(collection(db, path), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T))
}

export async function setDocument<T extends DocumentData>(path: string, data: T): Promise<void> {
  if (!db) return
  await setDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function createDocument<T extends DocumentData>(path: string, data: T): Promise<string> {
  const database = requireDb()
  const ref = doc(collection(database, path))
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return ref.id
}

export async function updateDocument(path: string, data: Partial<DocumentData>): Promise<void> {
  if (!db) return
  await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteDocument(path: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, path))
}

export function subscribeToDocument<T>(path: string, callback: (data: T | null) => void): () => void {
  if (!db) {
    callback(null)
    return () => {}
  }
  return onSnapshot(doc(db, path), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null)
  })
}

export function subscribeToCollection<T>(path: string, constraints: QueryConstraint[], callback: (data: T[]) => void): () => void {
  if (!db) {
    callback([])
    return () => {}
  }
  const q = query(collection(db, path), ...constraints)
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)))
  })
}

export function createBatch() {
  return writeBatch(requireDb())
}

export { serverTimestamp, query, where, orderBy, limit }
