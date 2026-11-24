import { useState } from 'react'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { MapPicker, type GeoJsonFeature } from '@/packages/ui/MapPicker'
import { FileUploader, type UploadedFileItem } from '@/packages/ui/FileUploader'
import { MessageThread, type ThreadMessage } from '@/packages/ui/MessageThread'
import { DataTable } from '@/packages/ui/DataTable'
import { TwoFactorPrompt } from '@/packages/ui/TwoFactorPrompt'
import { SessionTimeoutModal } from '@/packages/ui/SessionTimeoutModal'
import { useChannel } from '@/packages/core/websocket/useChannel'
import { wsClient } from '@/packages/core/websocket/WebSocketClient'
import {
  Code,
  Layers,
  Radio,
  ShieldCheck,
  FileText,
  Table as TableIcon,
  MessageSquare,
  Lock,
} from 'lucide-react'

interface SampleData {
  id: string
  title: string
  category: string
  severity: string
  status: string
  updatedAt: string
}

const SAMPLE_ROWS: SampleData[] = [
  { id: 'ETH-001', title: 'Flash Flood Alert in Awash Basin', category: 'Flood', severity: 'critical', status: 'broadcast', updatedAt: '10 mins ago' },
  { id: 'ETH-002', title: 'Severe Wildfire in Bale Mountains', category: 'Wildfire', severity: 'high', status: 'verified', updatedAt: '25 mins ago' },
  { id: 'ETH-003', title: 'Industrial Hazmat Spill near Akaki', category: 'Hazmat', severity: 'critical', status: 'under_review', updatedAt: '1 hour ago' },
  { id: 'ETH-004', title: 'Dust Storm Warning in Afar Corridor', category: 'Weather', severity: 'medium', status: 'draft', updatedAt: '2 hours ago' },
  { id: 'ETH-005', title: 'Minor Landslide on Dessie Highway', category: 'Geological', severity: 'low', status: 'resolved', updatedAt: '1 day ago' },
]

export default function ComponentShowcasePage() {
  const [activeTab, setActiveTab] = useState<'status' | 'map' | 'uploader' | 'thread' | 'table' | 'security' | 'websocket'>('status')

  // Map state
  const [mapGeo, setMapGeo] = useState<GeoJsonFeature | null>(null)

  // File uploader state
  const [files, setFiles] = useState<UploadedFileItem[]>([
    { id: 'f-1', name: 'incident_satellite_aerial.jpg', size: 1024 * 1024 * 3.2, type: 'image/jpeg', progress: 100, status: 'complete' },
    { id: 'f-2', name: 'damage_assessment_initial.pdf', size: 1024 * 512, type: 'application/pdf', progress: 100, status: 'complete' },
  ])

  // Message thread state
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([
    {
      id: 'm-1',
      caseId: 'ETH-001',
      senderId: 'u-insa-1',
      senderName: 'Marta Haile',
      senderRole: 'INSA Administrator',
      content: 'Please verify the downstream coordinates for the Awash river overflow before we release the Tier-1 alert draft.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'm-2',
      caseId: 'ETH-001',
      senderId: 'u-org-1',
      senderName: 'Abebe Kebede',
      senderRole: 'Fire & Emergency Authority',
      content: 'Confirmed. Water level peaked at 4.2m near Mojo bridge. Evacuation boundary coordinates updated on the case map.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      attachments: [{ name: 'river_gauge_reading.pdf', url: '#' }],
    },
  ])

  // Security modals state
  const [is2FaOpen, setIs2FaOpen] = useState(false)
  const [isTimeoutOpen, setIsTimeoutOpen] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')

  // WebSocket telemetry
  const [wsFeed, setWsFeed] = useState<string[]>([])
  useChannel('system.heartbeat', (data: any) => {
    setWsFeed((prev) => [`[Heartbeat] Server Load: ${data.load}% @ ${new Date(data.serverTime).toLocaleTimeString()}`, ...prev.slice(0, 9)])
  })

  const tableColumns = [
    { accessorKey: 'id', header: 'Reference ID' },
    { accessorKey: 'title', header: 'Incident Title' },
    { accessorKey: 'category', header: 'Category' },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }: any) => <StatusBadge value={row.original.severity} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => <StatusBadge value={row.original.status} />,
    },
    { accessorKey: 'updatedAt', header: 'Last Updated' },
  ]

  return (
    <div className="space-y-6">
      {/* Eyebrow and Page Title */}
      <div>
        <p className="text-[11px] font-semibold text-teal-400 tracking-widest uppercase">
          EthioAlert Design System
        </p>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-1">
          <Code className="w-5 h-5 text-teal-400" />
          Interactive Component Showcase (/dev/components)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Storybook-style catalog showcasing the reusable Phase 1 & 2 UI components and security dialogs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1b2e34] pb-2 text-xs">
        {[
          { id: 'status', label: 'Status Badges', icon: Radio },
          { id: 'map', label: 'MapPicker', icon: Layers },
          { id: 'uploader', label: 'FileUploader', icon: FileText },
          { id: 'thread', label: 'MessageThread', icon: MessageSquare },
          { id: 'table', label: 'DataTable', icon: TableIcon },
          { id: 'security', label: 'Security UI', icon: Lock },
          { id: 'websocket', label: 'WebSocketClient', icon: Radio },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                active
                  ? 'bg-[#133e42] text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#162327]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Status Badges */}
      {activeTab === 'status' && (
        <div className="space-y-6 p-6 rounded-lg border border-[#1b2e34] bg-[#111d21]">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Severity Indicators (WCAG AA)</h3>
            <div className="flex flex-wrap gap-2.5">
              <StatusBadge value="critical" />
              <StatusBadge value="high" />
              <StatusBadge value="medium" />
              <StatusBadge value="low" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Case Lifecycle Statuses</h3>
            <div className="flex flex-wrap gap-2.5">
              {['draft', 'submitted', 'under_review', 'needs_clarification', 'verified', 'approved', 'broadcast', 'rejected'].map(
                (s) => (
                  <StatusBadge key={s} value={s} />
                ),
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">SOS & Telemetry Statuses</h3>
            <div className="flex flex-wrap gap-2.5">
              <StatusBadge value="new" />
              <StatusBadge value="assigned" />
              <StatusBadge value="in_progress" />
              <StatusBadge value="resolved" />
              <StatusBadge value="broadcasting" />
              <StatusBadge value="delivered" />
              <StatusBadge value="failed" />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MapPicker */}
      {activeTab === 'map' && (
        <div className="space-y-4 p-6 rounded-lg border border-[#1b2e34] bg-[#111d21]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Interactive MapPicker</h3>
              <p className="text-xs text-slate-400">
                Supports cascading Region $\rightarrow$ Zone $\rightarrow$ Sub-city selection, circle buffer, polygon, and bounding box drawing.
              </p>
            </div>
          </div>

          <MapPicker
            value={mapGeo}
            onChange={(g) => setMapGeo(g)}
            height="380px"
          />

          {mapGeo && (
            <div className="mt-3 p-3 rounded bg-[#0c1417] border border-[#1b2e34] text-[11px] font-mono text-teal-300">
              <span className="text-slate-400">// Emitted GeoJSON Target:</span>
              <pre className="overflow-x-auto mt-1">{JSON.stringify(mapGeo, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: FileUploader */}
      {activeTab === 'uploader' && (
        <div className="space-y-4 p-6 rounded-lg border border-[#1b2e34] bg-[#111d21]">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Drag-and-Drop Evidence & Document Uploader</h3>
            <p className="text-xs text-slate-400">
              Validates MIME types (PDF, PNG, JPG, MP4), restricts sizes up to 25MB, and renders simulated upload progress.
            </p>
          </div>

          <FileUploader
            value={files}
            onChange={(f) => setFiles(f)}
            maxSizeMb={25}
          />
        </div>
      )}

      {/* Tab 4: MessageThread */}
      {activeTab === 'thread' && (
        <div className="space-y-4 p-6 rounded-lg border border-[#1b2e34] bg-[#111d21]">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Clarification & Communication Thread</h3>
            <p className="text-xs text-slate-400">
              Two-way messaging between Resource Organizations and INSA control centre with attachments.
            </p>
          </div>

          <MessageThread
            caseId="ETH-001"
            messages={threadMessages}
            onSendMessage={(content) => {
              const newMsg: ThreadMessage = {
                id: `m-${Date.now()}`,
                caseId: 'ETH-001',
                senderId: 'u-org-1',
                senderName: 'Abebe Kebede',
                senderRole: 'Organization Officer',
                content,
                timestamp: new Date().toISOString(),
              }
              setThreadMessages((prev) => [...prev, newMsg])
            }}
          />
        </div>
      )}

      {/* Tab 5: DataTable */}
      {activeTab === 'table' && (
        <div className="space-y-4 p-6 rounded-lg border border-[#1b2e34] bg-[#111d21]">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">TanStack Powered Incident Table</h3>
            <p className="text-xs text-slate-400">
              Includes multi-column sorting, instant client search filter, accessible status badges, and pagination.
            </p>
          </div>

          <DataTable
            columns={tableColumns}
            data={SAMPLE_ROWS}
            searchPlaceholder="Search cases by ID or title..."
          />
        </div>
      )}

      {/* Tab 6: Security UI */}
      {activeTab === 'security' && (
        <div className="space-y-6 p-6 rounded-lg border border-[#1b2e34] bg-[#111d21]">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Critical Security Components</h3>
            <p className="text-xs text-slate-400">
              Enforces two-factor step-up re-prompts before sensitive operational actions, and session idle protection.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setPromptMessage('Tier 2 Broadcast Digital Signature Authorization')
                setIs2FaOpen(true)
              }}
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-500 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Launch 2FA Step-up Modal (Mock: 123456)</span>
            </button>

            <button
              onClick={() => setIsTimeoutOpen(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-500 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>Preview Session Inactivity Warning Modal</span>
            </button>
          </div>

          <TwoFactorPrompt
            isOpen={is2FaOpen}
            title={promptMessage}
            description="Enter the 6-digit verification code to execute this high-privilege emergency action."
            onVerify={(code) => {
              if (code === '123456') {
                alert('2FA Verified Successfully!')
                setIs2FaOpen(false)
                return true
              }
              return false
            }}
            onCancel={() => setIs2FaOpen(false)}
          />

          <SessionTimeoutModal
            isOpen={isTimeoutOpen}
            remainingSeconds={58}
            onExtend={() => {
              alert('Session extended for 15 minutes.')
              setIsTimeoutOpen(false)
            }}
            onSignOut={() => {
              alert('User signed out.')
              setIsTimeoutOpen(false)
            }}
          />
        </div>
      )}

      {/* Tab 7: WebSocketClient */}
      {activeTab === 'websocket' && (
        <div className="space-y-4 p-6 rounded-lg border border-[#1b2e34] bg-[#111d21]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">WebSocket Telemetry & Channels</h3>
              <p className="text-xs text-slate-400">
                Connected state: <span className="text-teal-400 font-mono">{wsClient.getState()}</span>
              </p>
            </div>
            <button
              onClick={() => {
                wsClient.emit('system.heartbeat', {
                  serverTime: new Date().toISOString(),
                  load: Math.floor(15 + Math.random() * 40),
                })
              }}
              className="px-3 py-1.5 rounded bg-[#162327] border border-[#1b2e34] text-xs text-slate-200 hover:text-white"
            >
              Trigger Manual Heartbeat Pulse
            </button>
          </div>

          <div className="p-3 rounded bg-[#0c1417] border border-[#1b2e34] text-xs font-mono space-y-1 max-h-56 overflow-y-auto">
            {wsFeed.length === 0 ? (
              <span className="text-slate-500">Waiting for channel telemetry pulses...</span>
            ) : (
              wsFeed.map((f, i) => (
                <div key={i} className="text-teal-300">
                  {f}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
