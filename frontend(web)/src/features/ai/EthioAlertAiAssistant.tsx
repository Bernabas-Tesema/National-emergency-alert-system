import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Bot, Send, Sparkles, X } from 'lucide-react'

import { liveAiAssist, quickPromptsForRole } from '@/api/liveAi'
import { useAuth } from '@/features/auth/useAuth'
import { canonicalRole, hasWebAccess } from '@/packages/core/permissions/matrix'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export default function EthioAlertAiAssistant() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  const role = canonicalRole(user?.role) || 'ADMINISTRATOR'
  const staffOnly = Boolean(user?.role && hasWebAccess(user.role) && role !== 'CITIZEN')
  const prompts = useMemo(() => quickPromptsForRole(role), [role])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (!open || messages.length > 0) return
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `EthioAlert AI ready for ${role.replace(/_/g, ' ').toLowerCase()}. Ask for triage help, wording, SOS priorities, or process guidance — suggestions only.`,
      },
    ])
  }, [open, messages.length, role])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setError('')
    setBusy(true)
    setInput('')
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: trimmed }])
    try {
      const result = await liveAiAssist({
        role,
        message: trimmed,
        context: `User: ${user?.fullName || 'staff'}; org: ${user?.organization || 'INSA'}; page: EthioAlert web console.`,
      })
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: result.reply },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  if (!user || !staffOnly) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#1d4ed8]"
        aria-label="Open EthioAlert AI"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[min(720px,82vh)] w-[min(560px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">EthioAlert AI</p>
              <p className="truncate text-[11px] text-blue-100">{role.replace(/_/g, ' ')} assistant</p>
            </div>
          </header>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={busy}
                onClick={() => void send(prompt)}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600 hover:border-[#2563eb]/40 hover:text-[#2563eb]"
              >
                {prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] px-3 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'ml-auto bg-[#2563eb] text-white'
                    : 'mr-auto border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <p className="text-xs font-medium text-slate-400">Thinking…</p>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask EthioAlert AI…"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
