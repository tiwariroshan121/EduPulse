import { getDocument, getCollection, createDocument, deleteDocument, where, orderBy } from '../../firebase/firestore'
import type { MaterialRepository } from '../contracts'
import type { Material } from '@/types/domain'

export const firebaseMaterialRepository: MaterialRepository = {
  async getMaterial(materialId: string) {
    return getDocument<Material>(`materials/${materialId}`)
  },

  async listMaterialsByClass(classId: string) {
    return getCollection<Material>('materials', [where('classId', '==', classId), orderBy('createdAt', 'desc')])
  },

  async listMaterialsBySubject(subjectId: string) {
    return getCollection<Material>('materials', [where('subjectId', '==', subjectId), orderBy('createdAt', 'desc')])
  },

  async listMaterialsByTeacher(teacherId: string) {
    return getCollection<Material>('materials', [where('teacherId', '==', teacherId), orderBy('createdAt', 'desc')])
  },

  async createMaterial(material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) {
    return createDocument('materials', material)
  },

  async deleteMaterial(materialId: string) {
    await deleteDocument(`materials/${materialId}`)
  },
}
