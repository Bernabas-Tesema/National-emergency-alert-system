import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Zap,
  ShieldCheck,
  AlertOctagon,
  Radio,
  ArrowRight,
} from 'lucide-react'

import {
  fetchAlerts,
  approveTier2,
  emergencyFastTrack,
  dispatchAlert,
  type Alert,
} from '@/api/mockAlerts'
import { TwoFactorPrompt } from '@/packages/ui/TwoFactorPrompt'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'

export default function ApprovalQueuePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [show2Fa, setShow2Fa] = useState(false)
  const [showFastTrackModal, setShowFastTrackModal] = useState(false)
  const [fastTrackReason, setFastTrackReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  useEffect(() => {
    fetchAlerts().then((data) => {
      setAlerts(data)
      const pending = data.find((a) => a.status === 'pending_approval')
      setSelectedAlert(pending || data[0] || null)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading Tier-2 approval queue...</div>
  }

  if (!user) return null

  // HARD RULE: Mutual exclusion check
  const isSubmitter = selectedAlert?.tier1SubmittedBy?.id === user.id

  async function handleApprove(code: string) {
    if (!selectedAlert || !user) return false
    setErrorNotice('')
    try {
      const updated = await approveTier2(selectedAlert.id, user, code)
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSelectedAlert(updated)
      setShow2Fa(false)
      setSuccessNotice(`Alert ${updated.id} digitally signed and approved for broadcast.`)
      return true
    } catch (err: any) {
      setErrorNotice(err.message || 'Approval signature failed.')
      return false
    }
  }

  async function handleFastTrack() {
    if (!selectedAlert || !user || fastTrackReason.trim().length < 20) return
    setBusy(true)
    setErrorNotice('')
    try {
      const updated = await emergencyFastTrack(selectedAlert.id, user, fastTrackReason.trim())
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSelectedAlert(updated)
      setShowFastTrackModal(false)
      setFastTrackReason('')
      setSuccessNotice(`CRITICAL Alert ${updated.id} emergency fast-tracked! Recorded in audit logs.`)
    } catch (err: any) {
      setErrorNotice(err.message || 'Fast-track failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOneClickDispatch(alertId: string) {
    setBusy(true)
    try {
      const dispatched = await dispatchAlert(alertId)
      setAlerts((prev) => prev.map((a) => (a.id === dispatched.id ? dispatched : a)))
      setSelectedAlert(dispatched)
      navigate(`/insa/dispatch/${alertId}`)
    } catch (err: any) {
      setErrorNotice(err.message || 'Dispatch failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Eyebrow & Title */}
      <div>
        <p className="text-[11px] font-bold text-teal-400 tracking-widest uppercase">
          INSA High Command Authorization
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
          Tier-2 Public Broadcast Approval Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review prepared public warnings, enforce separation of duties, and execute 2FA digital signature authorization.
        </p>
      </div>

      {errorNotice && (
        <div className="rounded-lg bg-red-950/80 border border-red-800 p-3 text-xs text-red-200 flex items-center justify-between">
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice('')} className="text-red-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {successNotice && (
        <div className="rounded-lg bg-emerald-950/80 border border-emerald-800 p-3 text-xs text-emerald-200 flex items-center justify-between">
          <span>{successNotice}</span>
          <button onClick={() => setSuccessNotice('')} className="text-emerald-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Queue List on Left */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Pending Approval Queue ({alerts.filter((a) => a.status === 'pending_approval').length})
          </h3>

          <div className="space-y-2.5">
            {alerts.map((alt) => {
              const isSelected = selectedAlert?.id === alt.id
              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedAlert(alt)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-[#15272c] shadow-md'
                      : 'border-[#1b2e34] bg-[#111d21] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-teal-400 font-bold">{alt.id}</span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge value={alt.severity} />
                      <StatusBadge value={alt.status} />
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate">{alt.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">Area: {alt.area}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Alert Details & Digital Signature Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {selectedAlert ? (
            <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 space-y-6 shadow-sm">
              <div className="flex items-start justify-between border-b border-[#1b2e34] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-teal-400 font-bold">{selectedAlert.id}</span>
                    <StatusBadge value={selectedAlert.status} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{selectedAlert.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Target Zone: {selectedAlert.area}</p>
                </div>
                <StatusBadge value={selectedAlert.severity} />
              </div>

              {/* Submitter & Hard Rule Separation of Duties check */}
              <div className="rounded-lg bg-[#0c1417] border border-[#1b2e34] p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tier-1 Submitter:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedAlert.tier1SubmittedBy?.name || 'Administrator'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submission Timestamp:</span>
                  <span className="font-mono text-slate-300">{selectedAlert.updatedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Reach:</span>
                  <span className="font-mono text-teal-400 font-semibold">
                    ~{selectedAlert.estimatedCitizens.toLocaleString()} citizens
                  </span>
                </div>
              </div>

              {/* Hard Rule Banner if Submitter is the same user */}
              {isSubmitter && selectedAlert.status === 'pending_approval' && (
                <div className="rounded-lg bg-amber-950/60 border border-amber-800 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">HARD RULE ENFORCED: Dual-Control Mutual Exclusion</strong>
                    <span>
                      You submitted this alert at Tier-1. Security policy strictly forbids the same individual from approving their own alert.
                      Another Higher Officer must review and digitally sign.
                    </span>
                  </div>
                </div>
              )}

              {/* Multilingual Text Content */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  Broadcast Message Content
                </h4>
                <div className="rounded-lg bg-[#0c1417] border border-[#1b2e34] p-4 text-xs space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      English
                    </span>
                    <p className="text-slate-200 leading-relaxed">{selectedAlert.languages.en}</p>
                  </div>
                  <div className="pt-2 border-t border-[#1b2e34]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Amharic (አማርኛ)
                    </span>
                    <p className="text-slate-200 leading-relaxed font-sans">{selectedAlert.languages.am}</p>
                  </div>
                </div>
              </div>

              {/* Digital Signature Badge if Approved */}
              {selectedAlert.tier2ApprovedBy && (
                <div className="rounded-lg bg-teal-950/40 border border-teal-800 p-4 text-xs text-teal-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-teal-300">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>Cryptographically Signed & Approved</span>
                  </div>
                  <p className="text-[11px] text-teal-400/90 font-mono">
                    Signer: {selectedAlert.tier2ApprovedBy.name} &bull; Hash: {selectedAlert.tier2ApprovedBy.signatureHash}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#1b2e34] flex flex-wrap items-center justify-between gap-3">
                {selectedAlert.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => setShowFastTrackModal(true)}
                      disabled={selectedAlert.severity !== 'critical'}
                      className="flex items-center gap-1.5 rounded-lg border border-red-800/80 bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/40 disabled:opacity-30 transition-colors"
                      title={selectedAlert.severity !== 'critical' ? 'Only Critical alerts can be fast-tracked' : undefined}
                    >
                      <Zap className="w-4 h-4 text-red-400" />
                      <span>Emergency Fast-Track</span>
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => setShow2Fa(true)}
                        disabled={isSubmitter || busy}
                        className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40 transition-colors shadow-md"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Sign with 2FA & Approve</span>
                      </button>
                    </div>
                  </>
                )}

                {selectedAlert.status === 'approved' && (
                  <button
                    onClick={() => handleOneClickDispatch(selectedAlert.id)}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-lg ml-auto"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Execute One-Click Dispatch</span>
                  </button>
                )}

                {selectedAlert.status === 'broadcasting' && (
                  <button
                    onClick={() => navigate(`/insa/dispatch/${selectedAlert.id}`)}
                    className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow-md ml-auto"
                  >
                    <span>View Live Telemetry Monitor</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-12 text-center text-xs text-slate-500">
              Select an alert from the queue to view approval details.
            </div>
          )}
        </div>
      </div>

      {/* 2FA Modal */}
      <TwoFactorPrompt
        isOpen={show2Fa}
        title="Tier-2 Digital Signature Authorization"
        description="Enter your 6-digit authentication token to apply your digital cryptographic signature and authorize public alert broadcast."
        onVerify={handleApprove}
        onCancel={() => setShow2Fa(false)}
      />

      {/* Emergency Fast-Track Modal */}
      {showFastTrackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-red-800 bg-[#0c1417] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <Zap className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Emergency Fast-Track Authorization</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fast-track is strictly for imminently life-threatening CRITICAL events. A detailed written reason (minimum 20 characters)
              is legally required and will be prominently recorded in permanent audit logs.
            </p>
            <textarea
              rows={3}
              value={fastTrackReason}
              onChange={(e) => setFastTrackReason(e.target.value)}
              placeholder="e.g. Rapid dam breach detected by emergency radar. Evacuation window under 15 minutes. Authorized per INSA Crisis Directive 4."
              className="w-full rounded-lg bg-[#111d21] border border-[#1b2e34] p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{fastTrackReason.length}/20 chars min</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFastTrackModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleFastTrack}
                disabled={fastTrackReason.trim().length < 20 || busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Execute Fast-Track Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
