import { describe, expect, it } from 'vitest'
import { EMPTY_CASE_FORM } from '@/lib/caseForm'
import { validateDraft, validateSubmission } from '@/lib/caseValidation'
import type { CaseFormValues } from '@/types/case'

const complete: CaseFormValues = {
  ...EMPTY_CASE_FORM,
  title: 'Flash flood risk',
  category: 'flood_weather',
  severity: 'HIGH',
  area: { regionId: 'bole', points: [] },
  startTime: '2026-10-16T08:00',
  description: 'The river is rising quickly.',
}

describe('draft validation', () => {
  it('needs only a title', () => {
    expect(validateDraft({ ...EMPTY_CASE_FORM, title: 'Draft' })).toEqual({})
  })

  it('rejects an empty or blank title', () => {
    expect(validateDraft(EMPTY_CASE_FORM).title).toBeDefined()
    expect(validateDraft({ ...EMPTY_CASE_FORM, title: '   ' }).title).toBeDefined()
  })
})

describe('submission validation', () => {
  it('accepts a complete case', () => {
    expect(validateSubmission(complete)).toEqual({})
  })

  it('reports every missing required field on an empty form', () => {
    const errors = validateSubmission(EMPTY_CASE_FORM)
    expect(Object.keys(errors).sort()).toEqual(
      ['area', 'category', 'description', 'severity', 'startTime', 'title'].sort(),
    )
  })

  it('does not require the optional fields', () => {
    const errors = validateSubmission({
      ...complete,
      recommendedAction: '',
      files: [],
    })
    expect(errors).toEqual({})
  })

  it('accepts a drawn area with 3 corners but not with 2', () => {
    const corners: [number, number][] = [
      [9.0, 38.7],
      [9.1, 38.7],
      [9.1, 38.8],
    ]
    const drawn = (points: [number, number][]) => ({
      ...complete,
      area: { regionId: null, points },
    })
    expect(validateSubmission(drawn(corners)).area).toBeUndefined()
    expect(validateSubmission(drawn(corners.slice(0, 2))).area).toBeDefined()
  })
})