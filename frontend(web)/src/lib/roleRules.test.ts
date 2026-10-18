import { describe, expect, it } from 'vitest'
import { ASSIGNABLE_ROLES, organizationFitsRole } from './roleRules'

describe('role rules', () => {
  it('can assign every staff role but not citizen', () => {
    expect(ASSIGNABLE_ROLES).not.toContain('citizen')
    expect(ASSIGNABLE_ROLES).toHaveLength(6)
  })

  it('keeps INSA roles in INSA', () => {
    for (const role of ['dispatcher', 'higher_officer', 'auditor', 'system_admin'] as const) {
      expect(organizationFitsRole('insa', role)).toBe(true)
      expect(organizationFitsRole('police', role)).toBe(false)
    }
  })

  it('keeps outside-agency roles out of INSA', () => {
    for (const role of ['provider', 'org_admin'] as const) {
      expect(organizationFitsRole('fire', role)).toBe(true)
      expect(organizationFitsRole('insa', role)).toBe(false)
    }
  })

  it('never fits a citizen anywhere', () => {
    expect(organizationFitsRole('insa', 'citizen')).toBe(false)
    expect(organizationFitsRole('other', 'citizen')).toBe(false)
  })
})