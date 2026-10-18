import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ROLE_LABELS } from '@/types/role'
import type { Message } from '@/types/message'

interface MessageThreadProps {
  messages: Message[]
  currentUserId: string
  onSend: (text: string) => void
}

export default function MessageThread({
  messages,
  currentUserId,
  onSend,
}: MessageThreadProps) {
  const [draft, setDraft] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border bg-slate-50 p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-500">No messages yet.</p>
        )}
        {messages.map((m) => {
          const mine = m.authorId === currentUserId
          return (
            <div
              key={m.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  mine
                    ? 'bg-slate-800 text-white'
                    : 'border bg-white text-slate-900'
                }`}
              >
                <p
                  className={`text-xs ${mine ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  {m.authorName} · {ROLE_LABELS[m.authorRole]}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
                <p
                  className={`mt-1 text-xs ${mine ? 'text-slate-400' : 'text-slate-400'}`}
                >
                  {new Date(m.sentAt).toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message..."
          rows={3}
        />
        <Button type="submit" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}