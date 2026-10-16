import { useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import type { User } from '@/types/user'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  return (
    <AuthContext.Provider
      value={{ user, login: setUser, logout: () => setUser(null) }}
    >
      {children}
    </AuthContext.Provider>
  )
}