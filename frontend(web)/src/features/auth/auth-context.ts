import { createContext } from 'react'
import type { User } from '@/types/user'

export interface AuthContextValue {
  user: User | null
  login: (user: User) => void
  logout: () => void
}

// The shared "box" that holds who is logged in. null means "no provider yet".
export const AuthContext = createContext<AuthContextValue | null>(null)