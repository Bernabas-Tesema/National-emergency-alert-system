import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '@/features/auth/auth-context'
import type { Role } from '@/types/role'
import type { User } from '@/types/user'
import AppRoutes from './AppRoutes'

const WAIT = { timeout: 3000 }

function makeUser(role: Role): User {
  return {
    id: 'u-test',
    username: 'tester',
    fullName: 'Test User',
    role,
    organization: 'Test Org',
  }
}

function renderAt(path: string, role: Role) {
  return render(
    <AuthContext.Provider
      value={{ user: makeUser(role), login: () => {}, logout: () => {} }}
    >
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

// [role, path]: pages that role must NOT be able to open.
const BLOCKED: [Role, string][] = [
  ['provider', '/insa/staff'],
  ['provider', '/insa/organizations'],
  ['provider', '/insa/dashboard'],
  ['provider', '/resource/org-admin'],
  ['org_admin', '/insa/staff'],
  ['org_admin', '/insa/organizations'],
  ['dispatcher', '/insa/staff'],
  ['dispatcher', '/insa/organizations'],
  ['dispatcher', '/resource/dashboard'],
  ['higher_officer', '/insa/staff'],
  ['higher_officer', '/insa/organizations'],
  ['auditor', '/insa/staff'],
  ['auditor', '/insa/organizations'],
  ['system_admin', '/resource/dashboard'],
  ['system_admin', '/resource/org-admin'],
    ['provider', '/insa/audit'],
  ['org_admin', '/insa/audit'],
  ['dispatcher', '/insa/audit'],
  ['higher_officer', '/insa/audit'],
    ['provider', '/insa/settings'],
  ['org_admin', '/insa/settings'],
  ['dispatcher', '/insa/settings'],
  ['higher_officer', '/insa/settings'],
  ['auditor', '/insa/settings'],
]

describe('who can open which page', () => {
  it.each(BLOCKED)('%s cannot open %s', async (role, path) => {
    renderAt(path, role)
    expect(
      await screen.findByRole('heading', { name: 'Access denied' }, WAIT),
    ).toBeInTheDocument()
  })

  it('lets a system admin open the staff accounts page', async () => {
    renderAt('/insa/staff', 'system_admin')
    expect(
      await screen.findByRole('heading', { name: 'Staff accounts' }, WAIT),
    ).toBeInTheDocument()
  })

  it('lets a system admin open the organizations page', async () => {
    renderAt('/insa/organizations', 'system_admin')
    expect(
      await screen.findByRole('heading', { name: 'Organizations' }, WAIT),
    ).toBeInTheDocument()
  })

  it('lets an org admin open the organization page', async () => {
    renderAt('/resource/org-admin', 'org_admin')
    expect(
      await screen.findByRole('heading', { name: 'Organization administration' }, WAIT),
    ).toBeInTheDocument()
  })
    it('lets an auditor open the audit log', async () => {
    renderAt('/insa/audit', 'auditor')
    expect(
      await screen.findByRole('heading', { name: 'Audit log' }, WAIT),
    ).toBeInTheDocument()
  })

  it('lets a system admin open the audit log', async () => {
    renderAt('/insa/audit', 'system_admin')
    expect(
      await screen.findByRole('heading', { name: 'Audit log' }, WAIT),
    ).toBeInTheDocument()
  })
    it('lets a system admin open the settings page', async () => {
    renderAt('/insa/settings', 'system_admin')
    expect(
      await screen.findByRole('heading', { name: 'Settings' }, WAIT),
    ).toBeInTheDocument()
  })
})