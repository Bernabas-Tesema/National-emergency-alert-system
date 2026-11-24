import { create } from 'zustand'
import type { User } from '@/types/user'
import { canonicalRole, type StaffRole } from '@/packages/core/permissions/matrix'

export interface AuthState {
  token: string | null
  user: User | null
  canonicalRole: StaffRole | 'CITIZEN' | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  canonicalRole: null,

  setAuth: (token, user) => {
    set({
      token,
      user,
      canonicalRole: canonicalRole(user.role),
    })
  },

  logout: () => {
    set({
      token: null,
      user: null,
      canonicalRole: null,
    })
  },
}))
