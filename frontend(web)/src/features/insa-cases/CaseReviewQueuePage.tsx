import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Radio,
} from 'lucide-react'

import { fetchCases, verifyCase, rejectCase, requestCaseClarification } from '@/api/mockCases'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { DataTable } from '@/packages/ui/DataTable'
import { useAuth } from '@/features/auth/useAuth'
import type { Case } from '@/types/case'

export default function CaseReviewQueuePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [clarifyQuestion, setClarifyQuestion] = useState('')
  const [actionModal, setActionModal] = useState<'reject' | 'clarify' | 'merge' | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchCases().then((data) => {
      // Sort by severity rank (critical > high > medium > low), then updated
      const severityOrder: Record<string, number> = {
        CRITICAL: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      }
      const sorted = [...data].sort((a, b) => {
        const bSev = b.severity ? (severityOrder[b.severity] || 0) : 0
        const aSev = a.severity ? (severityOrder[a.severity] || 0) : 0
        const diff = bSev - aSev
        return diff !== 0 ? diff : b.updatedAt.localeCompare(a.updatedAt)
      })
      setCases(sorted)
      setSelectedCase(sorted[0] || null)
      setLoading(false)
    })
  }, [])

  async function handleVerify(caseItem: Case) {
    if (!user) return
    setBusy(true)
    try {
      await verifyCase(caseItem.id, user)
      setCases((prev) =>
        prev.map((c) => (c.id === caseItem.id ? { ...c, status: 'verified' } : c)),
      )
      if (selectedCase?.id === caseItem.id) {
        setSelectedCase({ ...selectedCase, status: 'verified' })
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!selectedCase || !user || !rejectReason.trim()) return
    setBusy(true)
    try {
      await rejectCase(selectedCase.id, user, rejectReason.trim())
      setCases((prev) =>
        prev.map((c) => (c.id === selectedCase.id ? { ...c, status: 'rejected' } : c)),
      )
      setSelectedCase({ ...selectedCase, status: 'rejected' })
      setActionModal(null)
      setRejectReason('')
    } finally {
      setBusy(false)
    }
  }

  async function handleClarify() {
    if (!selectedCase || !user || !clarifyQuestion.trim()) return
    setBusy(true)
    try {
      await requestCaseClarification(selectedCase.id, user, clarifyQuestion.trim())
      setCases((prev) =>
        prev.map((c) => (c.id === selectedCase.id ? { ...c, status: 'needs_clarification' } : c)),
      )
      setSelectedCase({ ...selectedCase, status: 'needs_clarification' })
      setActionModal(null)
      setClarifyQuestion('')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }: any) => <span className="font-mono text-teal-400 font-semibold">{row.original.id}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Incident Title',
      cell: ({ row }: any) => (
        <span className="font-medium text-slate-200 block truncate max-w-xs">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }: any) => <StatusBadge value={row.original.severity} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => <StatusBadge value={row.original.status} />,
    },
    {
      accessorKey: 'area',
      header: 'Area',
      cell: ({ row }: any) => <span className="text-slate-400 text-xs">{row.original.area}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Eyebrow & Title */}
      <div>
        <p className="text-[11px] font-bold text-teal-400 tracking-widest uppercase">
          INSA Triage Operations
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
          Case Review & Moderation Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, verify, request clarification, or escalate partner emergency cases into public alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-4 shadow-sm">
            <DataTable
              columns={columns}
              data={cases}
              loading={loading}
              searchPlaceholder="Filter incoming cases..."
              onRowClick={(c) => setSelectedCase(c)}
            />
          </div>
        </div>

        {/* Right: Selected Case Review Workspace */}
        <div className="lg:col-span-5 space-y-4">
          {selectedCase ? (
            <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 space-y-5 shadow-sm">
              <div className="flex items-start justify-between border-b border-[#1b2e34] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-teal-400 font-bold">{selectedCase.id}</span>
                    <StatusBadge value={selectedCase.status} />
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedCase.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Target Area: {selectedCase.area}</p>
                </div>
                {selectedCase.severity && <StatusBadge value={selectedCase.severity} />}
              </div>

              {/* AI Triage & Analysis Card */}
              <div className="rounded-lg border border-teal-800/60 bg-[#0c1417] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>AI Triage & Synthesis</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    AI-generated
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Calculated threat score is <strong>94/100</strong>. High population density area with limited immediate drainage.
                  Matches pattern of 2 past incidents in Awash Valley. Potential duplicate of Case ETH-001 (92% semantic similarity).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#1b2e34] space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Moderation Actions
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVerify(selectedCase)}
                    disabled={busy || selectedCase.status === 'verified' || selectedCase.status === 'approved'}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Case</span>
                  </button>

                  <button
                    onClick={() => navigate('/insa/alerts/composer')}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Compose Alert</span>
                  </button>

                  <button
                    onClick={() => setActionModal('clarify')}
                    disabled={busy}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-800 bg-purple-950/40 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-900/40 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Ask Clarification</span>
                  </button>

                  <button
                    onClick={() => setActionModal('reject')}
                    disabled={busy || selectedCase.status === 'rejected'}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/40 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Case</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-12 text-center text-xs text-slate-500">
              Select a case from the queue to inspect details and perform moderation.
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {actionModal === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-800 bg-[#0c1417] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Reject Emergency Case</h3>
            <p className="text-xs text-slate-400">
              A clear justification is legally required so the reporting partner organization can understand why the case was dismissed.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Duplicate of existing verified case ETH-001. On-ground verification confirmed water subsided."
              className="w-full rounded-lg bg-[#111d21] border border-[#1b2e34] p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || busy}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {actionModal === 'clarify' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl border border-purple-800 bg-[#0c1417] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Request Organization Clarification</h3>
            <p className="text-xs text-slate-400">
              This message will be instantly sent to the reporting officer's dashboard via WebSocket notification.
            </p>
            <textarea
              rows={3}
              value={clarifyQuestion}
              onChange={(e) => setClarifyQuestion(e.target.value)}
              placeholder="e.g. Please confirm if downstream evacuation has commenced in Woreda 03, and supply updated river gauge readings."
              className="w-full rounded-lg bg-[#111d21] border border-[#1b2e34] p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleClarify}
                disabled={!clarifyQuestion.trim() || busy}
                className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
