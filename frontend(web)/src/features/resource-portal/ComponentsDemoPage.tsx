
import { useState } from 'react'

import FileUploader from '@/components/FileUploader'
import MapAreaPicker from '@/components/MapAreaPicker'
import MessageThread from '@/components/MessageThread'
import { useAuth } from '@/features/auth/useAuth'
import { EMPTY_AREA } from '@/lib/area'
import type { AreaSelection } from '@/types/area'
import type { Message } from '@/types/message'

// TEMPORARY page for trying shared components.
// Delete it once the real case form and case detail pages use them.
export default function ComponentsDemoPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<File[]>([])
  const [area, setArea] = useState<AreaSelection>(EMPTY_AREA)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      authorId: 'u-003',
      authorName: 'Dawit Alemu',
      authorRole: 'dispatcher',
      text: 'Can you confirm the exact area affected?',
      sentAt: '2026-10-16T09:30:00Z',
    },
  ])

  if (!user) return null

  function handleSend(text: string) {
    if (!user) return

    const message: Message = {
      id: crypto.randomUUID(),
      authorId: user.id,
      authorName: user.fullName,
      authorRole: user.role,
      text,
      sentAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, message])
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Component demo
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">File uploader</h2>
        <FileUploader files={files} onChange={setFiles} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Message thread</h2>
        <MessageThread
          messages={messages}
          currentUserId={user.id}
          onSend={handleSend}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Map area picker</h2>
        <MapAreaPicker value={area} onChange={setArea} />

        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(area, null, 2)}
        </pre>
      </section>
    </div>
  )
}
