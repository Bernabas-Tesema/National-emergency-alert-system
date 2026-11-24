import { describe, expect, it } from 'vitest'
import { parseRealtimeEvent } from './realtime'

describe('parseRealtimeEvent', () => {
  it('accepts a case_changed event', () => {
    const raw = JSON.stringify({
      type: 'case_changed',
      caseId: 'CASE-1',
      status: 'approved',
    })
    expect(parseRealtimeEvent(raw)).toEqual({
      type: 'case_changed',
      caseId: 'CASE-1',
      status: 'approved',
    })
  })

  it('accepts a case_message event', () => {
    const raw = JSON.stringify({
      type: 'case_message',
      caseId: 'CASE-1',
      authorId: 'u-006',
      authorName: 'Marta Haile',
    })
    expect(parseRealtimeEvent(raw)?.type).toBe('case_message')
  })

  it('rejects anything it does not understand', () => {
    expect(parseRealtimeEvent('not json')).toBeNull()
    expect(parseRealtimeEvent('null')).toBeNull()
    expect(parseRealtimeEvent(42)).toBeNull()
    expect(parseRealtimeEvent('{"type":"delete_everything"}')).toBeNull()
    // a status the app does not have
    expect(
      parseRealtimeEvent('{"type":"case_changed","caseId":"X","status":"nope"}'),
    ).toBeNull()
    // a missing field
    expect(parseRealtimeEvent('{"type":"case_changed","status":"draft"}')).toBeNull()
  })
})