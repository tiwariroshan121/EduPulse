import { getDownloadURL, ref, uploadBytes, deleteObject, type UploadMetadata, type FirebaseStorage } from 'firebase/storage'
import { storage } from './firebaseConfig'

function requireStorage(): FirebaseStorage {
  if (!storage) {
    throw new Error('Firebase Storage is not configured. Please add your credentials to the .env file.')
  }
  return storage
}

export async function uploadFile(
  path: string,
  file: File,
  metadata?: UploadMetadata
): Promise<{ downloadURL: string; path: string; size: number; contentType: string }> {
  const storageInstance = requireStorage()
  const storageRef = ref(storageInstance, path)
  const snapshot = await uploadBytes(storageRef, file, metadata)
  const downloadURL = await getDownloadURL(snapshot.ref)
  return {
    downloadURL,
    path: snapshot.ref.fullPath,
    size: file.size,
    contentType: file.type,
  }
}

export async function getFileURL(path: string): Promise<string> {
  const storageInstance = requireStorage()
  const storageRef = ref(storageInstance, path)
  return getDownloadURL(storageRef)
}

export async function deleteFile(path: string): Promise<void> {
  if (!storage) return
  const storageRef = ref(storage, path)
  await deleteObject(storageRef)
}

export function generateMaterialPath(collegeId: string, materialId: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
  return `materials/${collegeId}/${materialId}/${Date.now()}.${ext}`
}

export function generateAssignmentPath(collegeId: string, assignmentId: string, studentId: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
  return `assignments/${collegeId}/${assignmentId}/${studentId}/${Date.now()}.${ext}`
}

export function generateProfilePath(uid: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
  return `profiles/${uid}/${Date.now()}.${ext}`
}

export function generateTimetableDocumentPath(collegeId: string, documentId: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
  return `colleges/${collegeId}/timetables/${documentId}/${Date.now()}.${ext}`
}

export function validateFile(file: File, options: { maxSizeMB?: number; allowedTypes?: string[] } = {}): { valid: boolean; error?: string } {
  const maxSize = (options.maxSizeMB ?? 10) * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${options.maxSizeMB ?? 10}MB limit` }
  }
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const isAllowed = options.allowedTypes.some((type) => {
      if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1))
      return file.type === type
    })
    if (!isAllowed) {
      return { valid: false, error: 'File type not allowed' }
    }
  }
  return { valid: true }
}
