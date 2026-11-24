import { useState } from 'react'
import { Send, Paperclip, CheckCheck, ShieldAlert, Building2 } from 'lucide-react'

export interface ThreadMessage {
  id: string
  caseId: string
  senderId: string
  senderName: string
  senderRole: string
  content: string
  timestamp: string
  attachments?: { name: string; url: string; size?: string }[]
  isInternal?: boolean
  unread?: boolean
}

export interface MessageThreadProps {
  caseId: string
  messages: ThreadMessage[]
  onSendMessage: (content: string, attachments?: File[]) => Promise<void> | void
  currentUserId?: string
  readOnly?: boolean
  className?: string
}

export function MessageThread({
  messages,
  onSendMessage,
  currentUserId = 'u-001',
  readOnly = false,
  className = '',
}: MessageThreadProps) {
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sending) return

    setSending(true)
    try {
      await onSendMessage(inputText.trim())
      setInputText('')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ts
    }
  }

  return (
    <div className={`flex flex-col rounded-lg border border-[#1b2e34] bg-[#111d21] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2e34] bg-[#0c1417]/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Case Clarification & Coordination Thread
          </h4>
        </div>
        <span className="text-xs text-slate-400">{messages.length} messages</span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 space-y-3.5 max-h-[380px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No messages yet. Direct questions or clarifications between INSA and the Resource Organization appear here.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId
            const isInsa = msg.senderRole.toLowerCase().includes('admin') ||
              msg.senderRole.toLowerCase().includes('officer') ||
              msg.senderRole.toLowerCase().includes('insa')

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                  {isInsa ? (
                    <span className="flex items-center gap-1 text-teal-400 font-medium">
                      <ShieldAlert className="w-3 h-3" />
                      {msg.senderName} (INSA)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sky-400 font-medium">
                      <Building2 className="w-3 h-3" />
                      {msg.senderName} ({msg.senderRole})
                    </span>
                  )}
                  <span>&bull;</span>
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.unread && (
                    <span className="px-1.5 py-0.2 bg-teal-500/20 text-teal-300 rounded text-[10px]">
                      New
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#133e42] text-slate-100 rounded-tr-none border border-teal-500/30'
                      : isInsa
                      ? 'bg-[#18282d] text-slate-200 rounded-tl-none border border-[#1e3b42]'
                      : 'bg-[#142024] text-slate-200 rounded-tl-none border border-[#1b2e34]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 space-y-1">
                      {msg.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[11px] text-teal-300 hover:underline"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{att.name}</span>
                          {att.size && <span className="text-slate-400">({att.size})</span>}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                    <CheckCheck className="w-3 h-3 text-teal-400" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input box */}
      {!readOnly && (
        <form
          onSubmit={handleSend}
          className="border-t border-[#1b2e34] bg-[#0c1417]/80 p-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message or response to INSA..."
            className="flex-1 rounded-md bg-[#162327] border border-[#1b2e34] px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="rounded-md bg-teal-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      )}
    </div>
  )
}

export default MessageThread
