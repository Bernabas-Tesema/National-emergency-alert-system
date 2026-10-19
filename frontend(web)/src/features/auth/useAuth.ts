import { useContext } from 'react'
import { AuthContext } from './auth-context'

// Any component calls useAuth() to get { user, login, logout }.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}