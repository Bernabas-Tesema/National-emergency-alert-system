import { describe, expect, it } from 'vitest'
import { ROLES, ROLE_HOME_PATH, ROLE_LABELS, hasWebAccess } from './role'

describe('roles', () => {
  it('gives citizens no web access and every staff role access', () => {
    expect(hasWebAccess('citizen')).toBe(false)
    for (const role of ROLES.filter((r) => r !== 'citizen')) {
      expect(hasWebAccess(role)).toBe(true)
    }
  })

  it('has a label for every role', () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0)
    }
  })

  it('sends every staff role to a home page, and citizens nowhere', () => {
    expect(ROLE_HOME_PATH.citizen).toBeNull()
    for (const role of ROLES.filter((r) => r !== 'citizen')) {
      expect(ROLE_HOME_PATH[role]).toMatch(/^\/(resource|insa)\//)
    }
  })
})