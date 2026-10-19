import { describe, expect, it } from 'vitest'
import {
  AdminError,
  changeStaffRole,
  createOrganization,
  createStaff,
  resetStaff,
  setOrganizationStatus,
  setStaffStatus,
} from './mockAdmin'

const goodStaff = {
  fullName: 'Test Person',
  username: 'test.person',
  phone: '0911000009',
  role: 'provider' as const,
  organizationId: 'org-fire',
}

describe('staff safeguards', () => {
  it('stops an admin changing their own account', async () => {
    await expect(setStaffStatus('u-006', 'u-006', 'suspended')).rejects.toBeInstanceOf(AdminError)
    await expect(changeStaffRole('u-006', 'u-006', 'auditor')).rejects.toBeInstanceOf(AdminError)
    await expect(resetStaff('u-006', 'u-006')).rejects.toBeInstanceOf(AdminError)
  })

  it('keeps the last active system admin', async () => {
    await expect(setStaffStatus('u-003', 'u-006', 'suspended')).rejects.toThrow(/at least one/i)
    await expect(changeStaffRole('u-003', 'u-006', 'auditor')).rejects.toThrow(/at least one/i)
  })

  it('rejects a role that does not fit the organization', async () => {
    await expect(
      createStaff({ ...goodStaff, role: 'provider', organizationId: 'org-insa' }),
    ).rejects.toThrow(/cannot be used/i)
    await expect(
      createStaff({ ...goodStaff, role: 'dispatcher', organizationId: 'org-fire' }),
    ).rejects.toThrow(/cannot be used/i)
    await expect(changeStaffRole('u-006', 'u-001', 'dispatcher')).rejects.toThrow(/cannot be used/i)
  })

  it('creates an account and then refuses a duplicate username', async () => {
    const account = await createStaff(goodStaff)
    expect(account.status).toBe('active')
    expect(account.lastLoginAt).toBeNull()
    await expect(createStaff(goodStaff)).rejects.toThrow(/already taken/i)
    await expect(createStaff({ ...goodStaff, username: 'SYSADMIN1' })).rejects.toThrow(/already taken/i)
  })

  it('refuses bad phone numbers and usernames', async () => {
    await expect(createStaff({ ...goodStaff, username: 'ok.name2', phone: '12345' })).rejects.toThrow(/mobile number/i)
    await expect(createStaff({ ...goodStaff, username: 'a' })).rejects.toThrow(/username/i)
  })
})

describe('organizations', () => {
  it('registers an organization and refuses a duplicate name', async () => {
    const org = await createOrganization({ name: 'Ethiopian Red Cross', kind: 'other' })
    expect(org.status).toBe('active')
    await expect(
      createOrganization({ name: 'ethiopian red cross', kind: 'other' }),
    ).rejects.toThrow(/already exists/i)
  })

  it('never suspends INSA', async () => {
    await expect(setOrganizationStatus('org-insa', 'suspended')).rejects.toThrow(/cannot be suspended/i)
  })
})