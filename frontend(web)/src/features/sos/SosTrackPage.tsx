import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router'
import {
  Siren,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  AlertTriangle,
  MapPin,
  RefreshCw,
  ChevronRight,
  Info,
} from 'lucide-react'

import { SOS_TYPE_META, SOS_STATUS_STEPS, type SosReport } from './types'
import { trackSosReport } from './sosApi'

export default function SosTrackPage() {
  const navigate = useNavigate()
  const params = useParams<{ code?: string }>()
  const location = useLocation()
  const justSubmitted = (location.state as any)?.justSubmitted === true

  const [trackingCode, setTrackingCode] = useState(params.code ?? '')
  const [report, setReport] = useState<SosReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-load if code in URL
  useEffect(() => {
    if (params.code) {
      void doTrack(params.code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code])

  // Auto-refresh every 30s while open and unresolved
  useEffect(() => {
    if (report && report.status !== 'resolved') {
      intervalRef.current = setInterval(() => {
        void doTrack(report.trackingCode, true)
      }, 30000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [report?.trackingCode, report?.status])

  async function doTrack(code: string, silent = false) {
    if (!code.trim()) return
    if (!silent) setLoading(true)
    setError('')
    try {
      const result = await trackSosReport(code.trim().toUpperCase())
      if (!result) {
        setError('No report found with that tracking code. Please check and try again.')
        setReport(null)
      } else {
        setReport(result)
        setLastRefreshed(new Date())
      }
    } catch {
      setError('Could not connect to the tracking service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (trackingCode.trim()) {
      navigate(`/sos/track/${trackingCode.trim().toUpperCase()}`, { replace: true })
      void doTrack(trackingCode.trim())
    }
  }

  const statusIdx = report
    ? SOS_STATUS_STEPS.findIndex((s) => s.key === report.status)
    : -1

  const typeMeta = report ? SOS_TYPE_META[report.emergencyType] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f12] via-[#0d1a1f] to-[#0a1419] flex flex-col items-center justify-start py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-6">
        <button
          type="button"
          onClick={() => navigate('/sos')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to SOS
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-900/60 border border-teal-800/50">
            <Search className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Track Your Report</h1>
            <p className="text-xs text-slate-400">Follow the status of your SOS submission</p>
          </div>
        </div>

        {/* Success banner (just submitted) */}
        {justSubmitted && report && (
          <div className="rounded-xl border border-teal-700/50 bg-teal-900/30 px-4 py-3 mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              SOS report submitted successfully!
            </div>
            <p className="mt-1 text-xs text-teal-400/80">
              Your tracking code is{' '}
              <span className="font-mono font-bold text-teal-300 bg-teal-900/60 px-1.5 py-0.5 rounded">
                {report.trackingCode}
              </span>
              . Save this code to check your report status at any time.
            </p>
          </div>
        )}
      </div>

      {/* Search box */}
      <div className="w-full max-w-lg mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
            placeholder="Enter tracking code (e.g. SOS-AB3XY7)"
            className="flex-1 rounded-xl border border-[#1b2e34] bg-[#0f1e24] px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
          />
          <button
            type="submit"
            disabled={loading || !trackingCode.trim()}
            className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Track
          </button>
        </form>

        {error && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-800/40 bg-red-950/40 px-3 py-2.5 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            {error}
          </div>
        )}
      </div>

      {/* Report Card */}
      {report && (
        <div className="w-full max-w-lg space-y-4">
          {/* Report summary header */}
          <div className="rounded-2xl border border-[#1b2e34] bg-[#0f1e24] overflow-hidden shadow-xl">
            <div className="border-b border-[#1b2e34] px-5 py-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {typeMeta && (
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl border ${typeMeta.bg} text-xl`}
                  >
                    {typeMeta.icon}
                  </div>
                )}
                <div>
                  <p className="text-xs font-mono text-teal-400 font-bold">{report.trackingCode}</p>
                  <h2 className="text-base font-bold text-white mt-0.5">
                    {typeMeta?.label ?? report.emergencyType} Emergency
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {report.region}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void doTrack(report.trackingCode, true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#1b2e34] bg-[#0c1417] px-2.5 py-1.5 text-xs text-slate-400 hover:text-teal-400 transition-colors"
                title="Refresh status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {/* Status stepper */}
            <div className="px-5 py-5 space-y-1">
              {SOS_STATUS_STEPS.map((step, i) => {
                const done = i < statusIdx
                const active = i === statusIdx
                const upcoming = i > statusIdx

                return (
                  <div key={step.key} className="flex items-start gap-3">
                    {/* Dot + connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                          done
                            ? 'bg-teal-600 border-teal-500 text-white'
                            : active
                              ? 'bg-[#0d2a30] border-teal-500 text-teal-400 shadow-lg shadow-teal-900/40'
                              : 'bg-[#0c1417] border-[#1b2e34] text-slate-700'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : active ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      {i < SOS_STATUS_STEPS.length - 1 && (
                        <div
                          className={`w-0.5 h-6 mt-1 rounded-full transition-colors ${
                            done ? 'bg-teal-600' : 'bg-[#1b2e34]'
                          }`}
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className={`pb-4 ${i < SOS_STATUS_STEPS.length - 1 ? '' : ''}`}>
                      <p
                        className={`text-sm font-semibold ${
                          active ? 'text-teal-300' : done ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {step.label}
                        {active && (
                          <span className="ml-2 inline-flex items-center gap-0.5 rounded-full border border-teal-700/50 bg-teal-900/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-400">
                            Current
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          upcoming ? 'text-slate-700' : 'text-slate-500'
                        }`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Responder note */}
            {report.responderNote && (
              <div className="border-t border-[#1b2e34] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Responder update
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{report.responderNote}</p>
              </div>
            )}

            {/* Footer timestamps */}
            <div className="border-t border-[#1b2e34] px-5 py-3 flex items-center justify-between text-[10px] text-slate-600">
              <span>Submitted: {new Date(report.submittedAt).toLocaleString()}</span>
              {lastRefreshed && (
                <span>Refreshed: {lastRefreshed.toLocaleTimeString()}</span>
              )}
            </div>
          </div>

          {/* Auto-refresh notice */}
          {report.status !== 'resolved' && (
            <div className="flex items-start gap-2 rounded-xl border border-[#1b2e34] bg-[#0c1417] px-3 py-2.5 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-600" />
              <span>Status is automatically refreshed every 30 seconds. Keep this page open to get live updates.</span>
            </div>
          )}

          {/* Resolved CTA */}
          {report.status === 'resolved' && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-emerald-300">Your emergency has been resolved ✓</p>
              <p className="mt-0.5 text-xs text-emerald-400/70">
                Thank you for using EthioAlert. Stay safe.
              </p>
            </div>
          )}

          {/* Submit another */}
          <button
            type="button"
            onClick={() => navigate('/sos')}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#1b2e34] bg-[#0f1e24] py-3 text-sm text-slate-400 hover:text-teal-400 transition-colors"
          >
            Submit another SOS report
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Empty state: no report yet */}
      {!report && !loading && !error && !params.code && (
        <div className="w-full max-w-lg text-center py-12">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl border border-[#1b2e34] bg-[#0c1417] mx-auto mb-4">
            <Siren className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-sm text-slate-500">Enter your tracking code above to view your report status.</p>
          <button
            type="button"
            onClick={() => navigate('/sos')}
            className="mt-6 flex items-center gap-1.5 mx-auto text-xs text-teal-500 hover:text-teal-300"
          >
            Submit a new SOS report
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
