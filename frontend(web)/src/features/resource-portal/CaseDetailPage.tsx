import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Radio,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

import {
  fetchCase,
  requestCaseUpdate,
  resubmitCase,
  sendCaseMessage,
} from '@/api/mockCases'
import { MapPicker } from '@/packages/ui/MapPicker'
import { MessageThread } from '@/packages/ui/MessageThread'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { useRealtimeEvents } from '@/features/realtime/useRealtime'
import {
  CHANNEL_LABELS,
  type CaseRecord,
  type CaseUpdateKind,
} from '@/types/case'
import CaseUpdateForm from './CaseUpdateForm'

const LIFECYCLE_STAGES = [
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'verified', label: 'Verified' },
  { id: 'approved', label: 'Approved' },
  { id: 'broadcast', label: 'Broadcast' },
]

function getStageIndex(status: string) {
  if (status === 'needs_clarification') return 2
  if (status === 'rejected') return -1
  return LIFECYCLE_STAGES.findIndex((s) => s.id === status)
}

export default function CaseDetailPage() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [record, setRecord] = useState<CaseRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (caseId) {
      fetchCase(caseId).then((data) => {
        if (!cancelled) {
          setRecord(data)
          setLoading(false)
        }
      })
    }
    return () => {
      cancelled = true
    }
  }, [caseId])

  // WebSocket live sync
  useRealtimeEvents((event) => {
    if (
      (event.type === 'case_changed' || event.type === 'case_message') &&
      event.caseId === caseId
    ) {
      void fetchCase(caseId!).then((data) => {
        if (data) setRecord(data)
      })
    }
  })

  async function handleSend(text: string) {
    if (!user || !record) return
    const message = await sendCaseMessage(record.id, user, text)
    setRecord((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev))
  }

  async function handleResubmit() {
    if (!record) return
    setActionError('')
    setBusy(true)
    try {
      await resubmitCase(record.id)
      setRecord((prev) => (prev ? { ...prev, status: 'submitted' } : prev))
    } catch {
      setActionError('Could not resubmit the case. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateRequest(kind: CaseUpdateKind, text: string) {
    if (!user || !record) return
    const update = await requestCaseUpdate(record.id, kind, text, user)
    setRecord((prev) => (prev ? { ...prev, updates: [...prev.updates, update] } : prev))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Clock className="w-5 h-5 animate-spin mr-2 text-teal-400" />
        <span>Loading incident case details...</span>
      </div>
    )
  }

  if (!record || !user) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/resource/dashboard')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to cases</span>
        </button>
        <p className="text-slate-300">Case record not found.</p>
      </div>
    )
  }

  const currentStageIdx = getStageIndex(record.status)
  const isRejected = record.status === 'rejected'

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/resource/dashboard')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to cases dashboard</span>
      </button>

      {/* Title & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-teal-400 font-semibold">{record.id}</span>
            <StatusBadge value={record.status} />
            {record.severity && <StatusBadge value={record.severity} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{record.title}</h1>
        </div>

        {record.status === 'draft' && (
          <button
            onClick={() => navigate(`/resource/cases/${record.id}/edit`)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 shadow-sm"
          >
            Edit Draft
          </button>
        )}
      </div>

      {/* Status Timeline */}
      <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4">
          Incident Lifecycle Progress
        </h3>

        {isRejected ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold">Case Rejected by INSA</p>
              <p className="text-[11px] mt-0.5 text-red-200">
                Reason: {record.decision?.comment || 'Duplicate or unverified information.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="relative flex items-center justify-between min-w-[420px] px-2">
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-0" />
              {LIFECYCLE_STAGES.map((stage, idx) => {
                const isPast = idx <= currentStageIdx
                const isCurrent = idx === currentStageIdx

                return (
                  <div key={stage.id} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-teal-500 text-black ring-4 ring-teal-500/20'
                          : isPast
                          ? 'bg-teal-900 text-teal-300 border border-teal-500'
                          : 'bg-slate-900 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] mt-2 font-medium ${
                        isCurrent ? 'text-teal-300 font-semibold' : isPast ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Needs Clarification Alert Box */}
      {record.status === 'needs_clarification' && (
        <div className="rounded-xl border border-purple-800/80 bg-purple-950/40 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-purple-200">INSA Clarification Requested</h4>
              <p className="text-xs text-purple-300 mt-1">
                INSA officials require additional on-ground clarification before proceeding to Tier-1 alert drafting.
                Please respond in the coordination thread below, then resubmit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => void handleResubmit()}
              disabled={busy}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 shadow-sm disabled:opacity-50"
            >
              {busy ? 'Resubmitting...' : 'Mark Clarified & Resubmit to INSA'}
            </button>
            {actionError && <p className="text-xs text-red-400">{actionError}</p>}
          </div>
        </div>
      )}

      {/* Case Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm text-xs">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Incident Category</span>
          <span className="font-semibold text-slate-200 text-sm mt-0.5 block">{record.category}</span>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Affected Area</span>
          <span className="font-semibold text-slate-200 text-sm mt-0.5 block">{record.area}</span>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Start Time</span>
          <span className="text-slate-300 mt-0.5 block font-mono">
            {record.startTime ? new Date(record.startTime).toLocaleString() : 'Not specified'}
          </span>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Last Activity</span>
          <span className="text-slate-300 mt-0.5 block font-mono">{record.updatedAt}</span>
        </div>
      </div>

      {/* Description & Recommended Public Actions */}
      <div className="space-y-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1.5">
            Situation Description
          </h4>
          <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
            {record.description || 'No description provided.'}
          </p>
        </div>

        <div className="pt-3 border-t border-[#1b2e34]">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1.5">
            Recommended Citizen Actions
          </h4>
          <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
            {record.recommendedAction || 'Follow local authority instructions.'}
          </p>
        </div>
      </div>

      {/* Map View */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
          Geographic Hazard Boundary
        </h4>
        <MapPicker
          value={{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [9.02, 38.76] },
            properties: {
              shape: 'circle',
              regionRef: { region: 'Addis Ababa', zone: 'Addis Ababa Metro', subcity: record.area },
              radiusMeters: 3000,
            },
          }}
          readOnly
          height="300px"
        />
      </div>

      {/* Broadcast Delivery Summary (if broadcasted) */}
      {record.delivery && (
        <div className="rounded-xl border border-teal-800/80 bg-[#111d21] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              INSA Alert Broadcast Delivery Summary
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {record.delivery.map((d) => (
              <div key={d.channel} className="rounded-lg bg-[#0c1417] border border-[#1b2e34] p-3 text-xs">
                <span className="font-semibold text-slate-300 block mb-1">
                  {CHANNEL_LABELS[d.channel]}
                </span>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Sent:</span>
                  <span className="font-mono text-slate-200">{d.sent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-400">
                  <span>Delivered:</span>
                  <span className="font-mono">{d.delivered.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-red-400">
                  <span>Failed:</span>
                  <span className="font-mono">{d.failed.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send an Update or All-Clear Form */}
      {record.status !== 'draft' && record.status !== 'rejected' && (
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-3">
            Post On-Ground Situation Update or All-Clear
          </h4>
          <CaseUpdateForm onSubmit={handleUpdateRequest} />
        </div>
      )}

      {/* Messages Thread with INSA */}
      <div className="space-y-2">
        <MessageThread
          caseId={record.id}
          messages={record.messages.map((m) => ({
            id: m.id,
            caseId: record.id,
            senderId: m.authorId,
            senderName: m.authorName,
            senderRole: m.authorRole,
            content: m.text,
            timestamp: m.sentAt,
          }))}
          onSendMessage={handleSend}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
