import { describe, expect, it } from 'vitest'
import { ASSIGNABLE_ROLES, organizationFitsRole } from './roleRules'

describe('role rules', () => {
  it('can assign every staff role but not citizen', () => {
    expect(ASSIGNABLE_ROLES).not.toContain('citizen')
    expect(ASSIGNABLE_ROLES).toHaveLength(7)
    expect(ASSIGNABLE_ROLES).toEqual(
      expect.arrayContaining([
        'SUPER_ADMIN',
        'ADMINISTRATOR',
        'HIGHER_OFFICER',
        'DISPATCHER',
        'AUDITOR',
        'ORG_ADMIN',
        'ORG_OFFICER',
      ]),
    )
  })

  it('keeps INSA roles in INSA', () => {
    for (const role of ['DISPATCHER', 'HIGHER_OFFICER', 'AUDITOR', 'SUPER_ADMIN', 'ADMINISTRATOR'] as const) {
      expect(organizationFitsRole('insa', role)).toBe(true)
      expect(organizationFitsRole('police', role)).toBe(false)
    }
  })

  it('keeps outside-agency roles out of INSA', () => {
    for (const role of ['ORG_OFFICER', 'ORG_ADMIN'] as const) {
      expect(organizationFitsRole('fire', role)).toBe(true)
      expect(organizationFitsRole('insa', role)).toBe(false)
    }
  })

  it('never fits a citizen anywhere', () => {
    expect(organizationFitsRole('insa', 'citizen')).toBe(false)
    expect(organizationFitsRole('other', 'citizen')).toBe(false)
  })
})
