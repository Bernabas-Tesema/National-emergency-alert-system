import { describe, expect, it } from 'vitest'
import { ROLES, ROLE_HOME_PATH, ROLE_LABELS, hasWebAccess } from './role'

describe('roles', () => {
  it('gives all staff roles web access', () => {
    for (const role of ROLES) {
      expect(hasWebAccess(role)).toBe(true)
    }
    // non-role strings have no access
    expect(hasWebAccess('citizen')).toBe(false)
    expect(hasWebAccess('unknown')).toBe(false)
  })

  it('has a label for every role', () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0)
    }
  })

  it('sends every staff role to a home page', () => {
    for (const role of ROLES) {
      expect(ROLE_HOME_PATH[role]).toMatch(/^\/(resource|insa)\//)
    }
  })
})
