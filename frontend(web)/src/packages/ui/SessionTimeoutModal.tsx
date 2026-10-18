import { Clock } from 'lucide-react'

export interface SessionTimeoutModalProps {
  isOpen: boolean
  remainingSeconds: number
  onExtend: () => void
  onSignOut: () => void
}

export function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onExtend,
  onSignOut,
}: SessionTimeoutModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-amber-800/80 bg-[#0c1417] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Session Expiring Due to Inactivity
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            You will be automatically signed out for security in:
          </p>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-2">
            00:{remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onSignOut}
            className="flex-1 rounded-lg border border-[#1b2e34] bg-[#111d21] py-2 text-xs font-medium text-slate-300 hover:bg-[#162327] transition-colors"
          >
            Sign Out Now
          </button>
          <button
            type="button"
            onClick={onExtend}
            className="flex-1 rounded-lg bg-teal-600 py-2 text-xs font-medium text-white hover:bg-teal-500 transition-colors shadow-sm"
          >
            Keep Me Signed In
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionTimeoutModal
