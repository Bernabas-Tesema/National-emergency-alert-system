import { useRealtime } from '@/features/realtime/useRealtime'
import type { ConnectionState } from '@/types/realtime'

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting...',
  live: 'Live',
  reconnecting: 'Reconnecting...',
}

const DOTS: Record<ConnectionState, string> = {
  connecting: 'bg-amber-400',
  live: 'bg-green-500',
  reconnecting: 'bg-amber-400',
}

export default function ConnectionIndicator() {
  const { state } = useRealtime()
  return (
    <span className="flex items-center gap-2 text-xs text-slate-600">
      <span className={`h-2 w-2 rounded-full ${DOTS[state]}`} />
      {LABELS[state]}
    </span>
  )
}