import { useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import { ROLES } from '@/types/role'
import type { User } from '@/types/user'
import { clearAccessToken, getAccessToken } from '@/api/client'
import { liveApi } from '@/api/config'

// ---------------------------------------------------------------
// TEMPORARY (MOCK ONLY): the signed-in user is saved in
// sessionStorage so a browser refresh does not sign us out.
//
// TODO: Replace this before using the real backend. Real sessions must
// use secure, short-lived tokens or HttpOnly cookies issued by the
// server, and the user must be restored by asking the backend "who am I?".
// Never trust a user object stored in browser storage: anyone can edit it.
// ---------------------------------------------------------------
const STORAGE_KEY = 'ness-mock-user'

function loadSavedUser(): User | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as User
    // Ignore saved data that does not look right (e.g. an old or edited role).
    return ROLES.includes(parsed.role) && (!liveApi || getAccessToken()) ? parsed : null
  } catch {
    return null
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  // Passing a function to useState means it runs once, on the first render.
  const [user, setUser] = useState<User | null>(loadSavedUser)

  function login(nextUser: User) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY)
    clearAccessToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}