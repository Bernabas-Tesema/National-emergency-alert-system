import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  Radio,
  RotateCcw,
  Clock,
  ArrowLeft,
  Smartphone,
  MessageSquare,
  PhoneCall,
} from 'lucide-react'

import {
  fetchAlert,
  retryFailedRecipients,
  type Alert,
  type AlertChannel,
} from '@/api/mockAlerts'
import { useChannel } from '@/packages/core/websocket/useChannel'
import { StatusBadge } from '@/packages/ui/StatusBadge'

export default function DispatchMonitorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    if (id) {
      fetchAlert(id).then((data) => {
        setAlert(data)
        setLoading(false)
      })
    }
  }, [id])

  // Live WebSocket broadcast progress update
  useChannel('alerts.progress', (data: any) => {
    if (data && data.alertId === id) {
      setAlert((prev) => {
        if (!prev) return null
        return {
          ...prev,
          deliveryProgress: {
            ...prev.deliveryProgress,
            [data.channel]: data.metrics,
          },
        }
      })
    }
  })

  async function handleRetryFailed() {
    if (!id) return
    setRetrying(true)
    try {
      await retryFailedRecipients(id)
      const refreshed = await fetchAlert(id)
      setAlert(refreshed)
    } finally {
      setRetrying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Clock className="w-5 h-5 animate-spin mr-2 text-teal-400" />
        <span>Loading live telemetry...</span>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/insa/dashboard')} className="text-xs text-slate-400 hover:text-white">
          &larr; Back to Dashboard
        </button>
        <p className="text-slate-300">Alert dispatch record not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/insa/dashboard')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Operations Overview</span>
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-teal-400 font-bold">{alert.id}</span>
            <StatusBadge value={alert.status} />
            <StatusBadge value={alert.severity} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{alert.title}</h1>
          <p className="text-xs text-slate-400 mt-1">Area: {alert.area}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCancelModal(true)}
            className="rounded-lg border border-red-800 bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/40"
          >
            Cancel Broadcast
          </button>
        </div>
      </div>

      {/* Real-time Broadcast Channels Telemetry */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-2">
          <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
          <span>Live Multi-Channel Delivery Telemetry</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['sms', 'push', 'voice'] as AlertChannel[]).map((channel) => {
            const metrics = alert.deliveryProgress[channel] || { queued: 0, sent: 0, delivered: 0, failed: 0 }
            const total = metrics.queued + metrics.sent + metrics.delivered + metrics.failed || 1
            const deliveredPercent = Math.min(100, Math.round((metrics.delivered / total) * 100))
            const Icon = channel === 'sms' ? MessageSquare : channel === 'push' ? Smartphone : PhoneCall

            return (
              <div key={channel} className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      {channel === 'sms' ? 'Cell Broadcast (SMS)' : channel === 'push' ? 'App Push Alerts' : 'Voice Robocall'}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-teal-300">{deliveredPercent}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#0c1417] rounded-full h-2.5 overflow-hidden border border-[#1b2e34]">
                  <div
                    className="bg-teal-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${deliveredPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Delivered:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{metrics.delivered.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>In-Flight:</span>
                    <span className="font-mono text-sky-400 font-semibold">{metrics.sent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Queued:</span>
                    <span className="font-mono text-amber-400 font-semibold">{metrics.queued.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Failed:</span>
                    <span className="font-mono text-red-400 font-semibold">{metrics.failed.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Failed Recipient Gateway Re-Try List */}
      <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#1b2e34] pb-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Delivery Failures ({alert.failedRecipients.length})
            </h4>
            <p className="text-[11px] text-slate-400">
              Numbers masked for citizen identity privacy. You can trigger an automatic retry via alternate telecom towers.
            </p>
          </div>

          {alert.failedRecipients.length > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={retrying}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>Retry All Failed</span>
            </button>
          )}
        </div>

        {alert.failedRecipients.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No failed deliveries detected across regional telecom gateways.
          </div>
        ) : (
          <div className="divide-y divide-[#1b2e34]">
            {alert.failedRecipients.map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-200">{rec.phoneMasked}</span>
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {rec.channel}
                  </span>
                </div>
                <span className="text-red-400 text-[11px]">{rec.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-800 bg-[#0c1417] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Cancel Active Public Broadcast</h3>
            <p className="text-xs text-slate-400">
              Cancelling will halt all in-progress queue buffers and transmit a retraction / all-clear advisory to towers.
            </p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Danger subsided, situation stabilized by local emergency services."
              className="w-full rounded-lg bg-[#111d21] border border-[#1b2e34] p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCancelModal(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                Back
              </button>
              <button
                onClick={() => {
                  window.alert('Broadcast cancelled. Retraction sent.')
                  setCancelModal(false)
                  navigate('/insa/dashboard')
                }}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              >
                Halt Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
