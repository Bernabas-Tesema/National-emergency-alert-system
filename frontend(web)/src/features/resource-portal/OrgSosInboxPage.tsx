import { useEffect, useState } from 'react'
import { MapPin, Siren, Send, CheckCircle2 } from 'lucide-react'

import { liveApi } from '@/api/config'
import {
  liveAcknowledgeSos,
  liveFetchSos,
  liveReturnSosToInsa,
  type ApiSosCase,
} from '@/api/liveSos'
import { StatusBadge } from '@/packages/ui/StatusBadge'

const MOCK_SOS: ApiSosCase[] = [
  {
    id: 9001,
    status: 'new',
    case_type: 'fire',
    severity: 'critical',
    region: 'Addis Ababa',
    created_at: new Date().toISOString(),
    title: 'Citizen SOS — structure fire',
    description: 'Caller reports heavy smoke from a residential block near Bole.',
    organization: 'Fire & Emergency Authority',
    assigned_organization: 'Fire & Emergency Authority',
    source: 'sos',
    latitude: 9.02,
    longitude: 38.75,
    review_comment: null,
    org_response: null,
    created_by: null,
  },
]

export default function OrgSosInboxPage() {
  const [tickets, setTickets] = useState<ApiSosCase[]>([])
  const [selected, setSelected] = useState<ApiSosCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const rows = liveApi ? await liveFetchSos() : MOCK_SOS
      setTickets(rows)
      setSelected((current) => rows.find((r) => r.id === current?.id) ?? rows[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load SOS inbox')
      setTickets([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleAcknowledge() {
    if (!selected) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (liveApi) {
        const updated = await liveAcknowledgeSos(selected.id)
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        setSelected(updated)
      } else {
        const updated = { ...selected, status: 'org_reviewing' }
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        setSelected(updated)
      }
      setMessage('SOS marked as under organization review.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acknowledge failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleReturn(decision: 'verify' | 'escalate') {
    if (!selected || !comment.trim()) {
      setError('Add a short note before sending back to Ethio Alert.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (liveApi) {
        const updated = await liveReturnSosToInsa(selected.id, comment.trim(), decision)
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        setSelected(updated)
      } else {
        const updated = {
          ...selected,
          status: decision === 'verify' ? 'verified' : 'submitted',
          org_response: comment.trim(),
          review_comment: comment.trim(),
        }
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        setSelected(updated)
      }
      setComment('')
      setMessage(
        decision === 'verify'
          ? 'SOS verified by your organization and sent to Ethio Alert.'
          : 'SOS escalated back to Ethio Alert for national handling.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not return SOS to Ethio Alert')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading organization SOS inbox...</div>
  }

  const openCount = tickets.filter((t) => t.status === 'new' || t.status === 'org_reviewing').length

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2dd4bf]">
          Organization officer
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">SOS inbox</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review citizen SOS tickets assigned to partner organizations, check them, and send findings back to Ethio Alert.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <span className="font-semibold text-slate-900">{openCount}</span> open SOS ticket
        {openCount === 1 ? '' : 's'} need organization action
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assigned SOS
          </div>
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {tickets.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No SOS tickets for your organization yet.</p>
            )}
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelected(ticket)}
                className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50 ${
                  selected?.id === ticket.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[#2dd4bf]">SOS-{ticket.id}</span>
                  <StatusBadge value={ticket.status === 'new' ? 'submitted' : ticket.status === 'org_reviewing' ? 'under_review' : ticket.status} />
                </div>
                <span className="line-clamp-1 text-sm font-medium text-slate-800">{ticket.title}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3" />
                  {ticket.region} · {ticket.case_type}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-slate-500">Select an SOS ticket to review it.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
                  <Siren className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                  <p className="text-xs text-slate-500">
                    Assigned to {selected.assigned_organization || selected.organization || 'organization'} ·{' '}
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-700">{selected.description}</p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Info label="Type" value={selected.case_type} />
                <Info label="Severity" value={selected.severity} />
                <Info label="Region" value={selected.region} />
                <Info
                  label="Location"
                  value={
                    selected.latitude != null && selected.longitude != null
                      ? `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`
                      : 'Not provided'
                  }
                />
              </div>

              {selected.org_response && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organization response</p>
                  <p className="mt-1">{selected.org_response}</p>
                </div>
              )}

              {(selected.status === 'new' || selected.status === 'org_reviewing') && (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">Response to Ethio Alert</span>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      placeholder="Describe what your team checked and what Ethio Alert should do next..."
                      className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {selected.status === 'new' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleAcknowledge()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Start review
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReturn('escalate')}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14b8a6] disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      Escalate to Ethio Alert
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReturn('verify')}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Verify & send to Ethio Alert
                    </button>
                  </div>
                </>
              )}

              {selected.status !== 'new' && selected.status !== 'org_reviewing' && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  This SOS was already returned to Ethio Alert ({selected.status}).
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  )
}
