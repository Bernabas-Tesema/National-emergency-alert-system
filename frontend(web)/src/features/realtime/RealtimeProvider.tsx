import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { connectRealtime } from '@/lib/realtime'
import type { ConnectionState } from '@/types/realtime'
import { RealtimeContext, type RealtimeHandler } from './realtime-context'

interface Notice {
  id: string
  caseId: string
  text: string
}

export default function RealtimeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState<ConnectionState>('connecting')
  const [notices, setNotices] = useState<Notice[]>([])
  const listeners = useRef(new Set<RealtimeHandler>())
  const me = useRef({ id: '', wantsCaseNotices: false })

  // TEMPORARY: the simulator tells everyone everything. The real server will
  // send each person only the events meant for them, and this check goes away.
  useEffect(() => {
    me.current = {
      id: user?.id ?? '',
      wantsCaseNotices: user?.role === 'provider' || user?.role === 'org_admin',
    }
  }, [user])

  useEffect(() => {
    const connection = connectRealtime({
      onStateChange: setState,
      onEvent: (event) => {
        listeners.current.forEach((listener) => listener(event))

        const fromSomeoneElse = event.type === 'case_message' && event.authorId !== me.current.id
        if (event.type === 'case_message' && fromSomeoneElse && me.current.wantsCaseNotices) {
          setNotices((prev) => [
            ...prev.slice(-2),
            {
              id: crypto.randomUUID(),
              caseId: event.caseId,
              text: `${event.authorName} sent a message on ${event.caseId}`,
            },
          ])
        }
      },
    })
    return () => connection.close()
  }, [])

  const subscribe = useCallback((handler: RealtimeHandler) => {
    listeners.current.add(handler)
    return () => {
      listeners.current.delete(handler)
    }
  }, [])

  const value = useMemo(() => ({ state, subscribe }), [state, subscribe])

  function dismiss(id: string) {
    setNotices((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      {/* z-[2000] keeps notices above the map, whose controls sit at z-index 1000. */}
      <div className="fixed bottom-4 right-4 z-[2000] w-80 space-y-2">
        {notices.map((n) => (
          <div key={n.id} className="rounded-xl border border-teal-800 bg-[#111d21] p-4 shadow-xl">
            <p className="text-xs text-slate-100 font-medium">{n.text}</p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  dismiss(n.id)
                  navigate(`/resource/cases/${n.caseId}`)
                }}
              >
                View case
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dismiss(n.id)}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </RealtimeContext.Provider>
  )
}