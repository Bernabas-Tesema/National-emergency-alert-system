import { apiFetch } from './client'

export interface ApiSosCase {
  id: number
  status: string
  case_type: string
  severity: string
  region: string
  created_at: string
  updated_at?: string
  title: string
  description: string
  organization: string | null
  assigned_organization: string | null
  source: string
  latitude: number | null
  longitude: number | null
  review_comment: string | null
  org_response: string | null
  created_by: string | null
}

export async function liveFetchSos(): Promise<ApiSosCase[]> {
  return apiFetch<ApiSosCase[]>('/api/v1/sos')
}

export async function liveAcknowledgeSos(id: number): Promise<ApiSosCase> {
  return apiFetch<ApiSosCase>(`/api/v1/sos/${id}/acknowledge`, { method: 'POST' })
}

export async function liveReturnSosToInsa(
  id: number,
  comment: string,
  decision: 'verify' | 'escalate' = 'escalate',
): Promise<ApiSosCase> {
  return apiFetch<ApiSosCase>(`/api/v1/sos/${id}/return-to-insa`, {
    method: 'POST',
    body: JSON.stringify({ comment, decision }),
  })
}

export async function liveAssignSos(id: number, note = ''): Promise<ApiSosCase> {
  return apiFetch<ApiSosCase>(`/api/v1/sos/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

export async function liveUpdateSosStatus(
  id: number,
  status: 'assigned' | 'in_progress' | 'resolved',
  note = '',
): Promise<ApiSosCase> {
  return apiFetch<ApiSosCase>(`/api/v1/sos/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  })
}
