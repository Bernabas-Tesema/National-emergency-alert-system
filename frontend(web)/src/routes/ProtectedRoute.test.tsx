import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '@/features/auth/auth-context'
import type { Role } from '@/types/role'
import type { User } from '@/types/user'
import ProtectedRoute from './ProtectedRoute'

function makeUser(role: Role): User {
  return {
    id: 'u-test',
    username: 'tester',
    fullName: 'Test User',
    role,
    organization: 'Test Org',
  }
}

function renderAt(path: string, user: User | null) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/forbidden" element={<p>forbidden page</p>} />
          <Route element={<ProtectedRoute allowedRoles={['system_admin']} />}>
            <Route path="/insa/dashboard" element={<p>secret page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('sends a signed-out visitor to the login page', async () => {
    renderAt('/insa/dashboard', null)
    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })

  it('sends a signed-in user with the wrong role to the forbidden page', async () => {
    renderAt('/insa/dashboard', makeUser('provider'))
    expect(await screen.findByText('forbidden page')).toBeInTheDocument()
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })

  it('lets a user with an allowed role through', async () => {
    renderAt('/insa/dashboard', makeUser('system_admin'))
    expect(await screen.findByText('secret page')).toBeInTheDocument()
  })
})