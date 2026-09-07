import type { Role } from '../../types/domain'
import type { AuthRepository } from '../repositories/contracts'

export const developmentAuthService: AuthRepository & { selectRole(role: Role): Promise<void> } = {
  async selectRole(_role: Role) {
    void _role
  },
  async loginWithEmail(_email: string, _password: string) {
    void _email; void _password
  },
  async loginWithGoogle() {
    throw new Error('Google Sign-In will be connected in Firebase Phase 2.')
  },
  async logout() {
  },
  async resetPassword() {
  },
  async registerWithEmail() {
  },
  async getCurrentUser() {
    return null
  },
  onAuthStateChanged() {
    return () => {}
  },
}