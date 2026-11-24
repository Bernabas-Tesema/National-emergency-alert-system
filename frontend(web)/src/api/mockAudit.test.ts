import { describe, expect, it } from 'vitest'
import { AUDIT_ACTIONS, type AuditQuery } from '@/types/audit'
import { fetchAuditLog } from './mockAudit'

const base: AuditQuery = {
  action: '',
  search: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 10,
}

describe('fetchAuditLog', () => {
  it('returns the newest entries first', async () => {
    const { entries } = await fetchAuditLog({ ...base, pageSize: 100 })
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].timestamp > entries[i].timestamp).toBe(true)
    }
  })

  it('splits the results into pages', async () => {
    const first = await fetchAuditLog(base)
    expect(first.total).toBe(48)
    expect(first.entries).toHaveLength(10)
    const last = await fetchAuditLog({ ...base, page: 5 })
    expect(last.entries).toHaveLength(8)
    const beyond = await fetchAuditLog({ ...base, page: 6 })
    expect(beyond.entries).toHaveLength(0)
  })

  it('filters by action', async () => {
    const { entries, total } = await fetchAuditLog({
      ...base,
      action: 'login_failed',
      pageSize: 100,
    })
    expect(total).toBeGreaterThan(0)
    expect(entries.every((e) => e.action === 'login_failed')).toBe(true)
  })

  it('filters by date range', async () => {
    const { entries, total } = await fetchAuditLog({
      ...base,
      from: '2026-10-16',
      to: '2026-10-16',
      pageSize: 100,
    })
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(48)
    expect(entries.every((e) => e.timestamp.startsWith('2026-10-16'))).toBe(true)
  })

  it('searches user and target text, ignoring capital letters', async () => {
    const { entries, total } = await fetchAuditLog({
      ...base,
      search: 'MARTA HAILE',
      pageSize: 100,
    })
    expect(total).toBeGreaterThan(0)
    expect(entries.every((e) => e.actorName === 'Marta Haile')).toBe(true)
    const none = await fetchAuditLog({ ...base, search: 'zzzz-no-match' })
    expect(none.total).toBe(0)
  })

  it('has at least one sample entry for every action type', async () => {
    const { entries } = await fetchAuditLog({ ...base, pageSize: 100 })
    const seen = new Set(entries.map((e) => e.action))
    expect(seen.size).toBe(AUDIT_ACTIONS.length)
  })

  it('returns copies, so callers cannot change the log', async () => {
    const first = await fetchAuditLog(base)
    first.entries[0].target = 'TAMPERED'
    const again = await fetchAuditLog(base)
    expect(again.entries[0].target).not.toBe('TAMPERED')
  })
})