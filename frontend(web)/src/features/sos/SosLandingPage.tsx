import { useNavigate } from 'react-router'
import { Siren, Search, ArrowRight, AlertTriangle, Phone } from 'lucide-react'
import { SOS_EMERGENCY_TYPES, SOS_TYPE_META } from './types'

export default function SosLandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f12] via-[#0d1a1f] to-[#0a1419] flex flex-col items-center justify-center py-10 px-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="relative mx-auto flex items-center justify-center w-16 h-16 rounded-2xl bg-red-900/80 border border-red-700/50 shadow-2xl shadow-red-900/50 mb-4">
          <Siren className="w-8 h-8 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">EthioAlert SOS</h1>
        <p className="mt-1 text-sm text-slate-400">National Emergency Reporting System</p>
      </div>

      {/* Critical warning */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-800/40 bg-amber-950/40 px-4 py-3 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-bold">Life in immediate danger?</span> Call{' '}
            <a href="tel:911" className="font-black text-amber-200 underline">
              911
            </a>{' '}
            or{' '}
            <a href="tel:907" className="font-black text-amber-200 underline">
              907
            </a>{' '}
            first. Use this system to submit a formal digital report.
          </div>
        </div>
      </div>

      {/* Main CTAs */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        <button
          type="button"
          onClick={() => navigate('/sos/submit')}
          className="w-full flex items-center justify-between gap-3 rounded-2xl bg-red-700 hover:bg-red-600 shadow-xl shadow-red-900/40 px-5 py-4 text-left transition-all"
        >
          <div className="flex items-center gap-3">
            <Siren className="w-6 h-6 text-red-200 shrink-0" />
            <div>
              <p className="text-base font-bold text-white">Report an Emergency</p>
              <p className="text-xs text-red-200/80">Fire, flood, accident, missing person & more</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-red-200 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/sos/track')}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#1b2e34] bg-[#0f1e24] hover:border-teal-700/50 hover:bg-[#0d2228] px-5 py-4 text-left transition-all"
        >
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Track My Report</p>
              <p className="text-xs text-slate-500">Follow progress with your tracking code</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
        </button>
      </div>

      {/* Emergency type quick preview */}
      <div className="w-full max-w-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 text-center">
          Emergencies we handle
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SOS_EMERGENCY_TYPES.filter((t) => t !== 'other').map((type) => {
            const meta = SOS_TYPE_META[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => navigate('/sos/submit')}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-[#1b2e34] bg-[#0c1417] hover:border-slate-700 p-3 transition-colors"
              >
                <span className="text-xl">{meta.icon}</span>
                <span className="text-[10px] font-semibold text-slate-400 text-center leading-tight">
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Emergency hotlines */}
      <div className="w-full max-w-sm mt-8 rounded-2xl border border-[#1b2e34] bg-[#0c1417] divide-y divide-[#1b2e34]">
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Emergency hotlines</p>
        </div>
        {[
          { label: 'General Emergency', number: '911' },
          { label: 'Police (Federal)', number: '907' },
          { label: 'Fire & Rescue', number: '939' },
          { label: 'Medical Ambulance', number: '907' },
        ].map((h) => (
          <a
            key={h.number + h.label}
            href={`tel:${h.number}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-[#111d21] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-sm text-slate-300">{h.label}</span>
            </div>
            <span className="font-mono font-bold text-teal-400">{h.number}</span>
          </a>
        ))}
      </div>

      <p className="mt-8 text-[10px] text-slate-700 text-center">
        INSA National Emergency Alert System · EthioAlert v2.4
      </p>
    </div>
  )
}
