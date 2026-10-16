import type { Case } from '@/types/case'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

const MOCK_CASES: Case[] = [
  { id: 'CASE-1001', title: 'Flash flood risk along Kebena river', category: 'Flood', area: 'Bole', status: 'broadcast', updatedAt: '2026-10-14' },
  { id: 'CASE-1002', title: 'Warehouse fire near main road', category: 'Fire', area: 'Kality', status: 'under_review', updatedAt: '2026-10-15' },
  { id: 'CASE-1003', title: 'Suspected disease outbreak in school', category: 'Health', area: 'Yeka', status: 'needs_clarification', updatedAt: '2026-10-15' },
  { id: 'CASE-1004', title: 'Road closure after multi-vehicle crash', category: 'Accident', area: 'Arada', status: 'approved', updatedAt: '2026-10-13' },
  { id: 'CASE-1005', title: 'Gas leak near market', category: 'Hazard', area: 'Lideta', status: 'draft', updatedAt: '2026-10-16' },
  { id: 'CASE-1006', title: 'Unverified rumour of dam failure', category: 'Flood', area: 'Gulele', status: 'rejected', updatedAt: '2026-10-12' },
]

// Later this becomes a real request to the backend. The page won't change.
export async function fetchCases(): Promise<Case[]> {
  await delay()
  return MOCK_CASES
}