import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  UserCheck,
  Eye,
  Lock,
  Radio,
  MapPin,
  Volume2,
} from 'lucide-react'

import {
  fetchSosTickets,
  assignSosTicket,
  updateSosStatus,
  promoteMissingPersonToAlert,
  revealCitizenIdentity,
  type SosTicket,
  type SosTicketStatus,
} from '@/api/mockSos'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'

export default function SosOperationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<SosTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SosTicket | null>(null)
  const [noteInput, setNoteInput] = useState('')

  // Identity unmasking security state
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false)
  const [justification, setJustification] = useState('')
  const [unmaskedCitizen, setUnmaskedCitizen] = useState<{ fullName: string; phone: string } | null>(null)
  const [unmaskError, setUnmaskError] = useState('')

  useEffect(() => {
    fetchSosTickets().then((data) => {
      setTickets(data)
      setSelectedTicket(data[0] || null)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading SOS distress telemetry...</div>
  }

  if (!user) return null

  async function handleAssign(ticketId: string) {
    const updated = await assignSosTicket(ticketId, user!.fullName)
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTicket(updated)
  }

  async function handleStatusChange(ticketId: string, nextStatus: SosTicketStatus) {
    const updated = await updateSosStatus(ticketId, nextStatus)
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTicket(updated)
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTicket || !noteInput.trim()) return
    const note = `[${user?.fullName}] ${noteInput.trim()}`
    const updated = await updateSosStatus(selectedTicket.id, selectedTicket.status, note)
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTicket(updated)
    setNoteInput('')
  }

  async function handlePromoteToAlert(ticketId: string) {
    const newAlertId = await promoteMissingPersonToAlert(ticketId, user!)
    alert(`Ticket promoted to National Alert queue with ID: ${newAlertId}`)
    navigate('/insa/approvals')
  }

  async function handleExecuteUnmask(code: string) {
    if (!selectedTicket) return false
    setUnmaskError('')
    try {
      const result = await revealCitizenIdentity(selectedTicket.id, user!, justification, code)
      setUnmaskedCitizen(result)
      setShowIdentityPrompt(false)
      // refresh ticket to show audit entry
      const list = await fetchSosTickets()
      setTickets(list)
      setSelectedTicket(list.find((t) => t.id === selectedTicket.id) || null)
      return true
    } catch (err: any) {
      setUnmaskError(err.message || 'Identity reveal failed.')
      return false
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Eyebrow & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <p className="text-[11px] font-bold text-teal-400 tracking-widest uppercase">
            Citizen Emergency Response
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            SOS Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time citizen SOS distress tickets, rapid dispatch assignment, and privacy-protected identity access.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111d21] border border-[#1b2e34] text-xs text-teal-300">
          <Volume2 className="w-4 h-4 text-teal-400" />
          <span>Audio Alert Chime Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SOS Feed */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Live SOS Feed ({tickets.filter((t) => t.status !== 'resolved').length} Active)
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {tickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id
              const isNew = ticket.status === 'new'

              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket)
                    setUnmaskedCitizen(null)
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-[#15272c] shadow-md'
                      : isNew
                      ? 'border-red-800/80 bg-[#1e1315] hover:border-red-600'
                      : 'border-[#1b2e34] bg-[#111d21] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-400">{ticket.id}</span>
                      <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {ticket.type}
                      </span>
                    </div>
                    <StatusBadge value={ticket.status} />
                  </div>

                  <p className="text-xs font-semibold text-slate-200 truncate">{ticket.region}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>Citizen ID: {ticket.citizenHash}</span>
                    <span>{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Ticket Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {selectedTicket ? (
            <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 space-y-6 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#1b2e34] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-teal-400 font-bold">{selectedTicket.id}</span>
                    <StatusBadge value={selectedTicket.status} />
                  </div>
                  <h3 className="text-lg font-bold text-white capitalize">{selectedTicket.type} Emergency Distress</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>{selectedTicket.region} &bull; Coordinates: {selectedTicket.coordinates.join(', ')}</span>
                  </p>
                </div>

                {selectedTicket.assignedDispatcher ? (
                  <span className="text-xs px-2.5 py-1 rounded bg-[#133e42] text-teal-300 border border-teal-500/30">
                    Assigned: {selectedTicket.assignedDispatcher}
                  </span>
                ) : (
                  <button
                    onClick={() => handleAssign(selectedTicket.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Take Assignment</span>
                  </button>
                )}
              </div>

              {/* Identity Protection UI */}
              <div className="rounded-xl border border-[#1b2e34] bg-[#0c1417] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Lock className="w-4 h-4 text-teal-400" />
                    <span>Citizen Identity Protection (Anonymized by Default)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Article 26 Compliance</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Citizen Reference:</span>
                    <span className="font-mono text-slate-300 font-semibold">{selectedTicket.citizenHash}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Contact Record:</span>
                    <span className="font-mono text-slate-300">
                      {unmaskedCitizen ? (
                        <span className="text-teal-300 font-bold">{unmaskedCitizen.fullName} ({unmaskedCitizen.phone})</span>
                      ) : (
                        <span>{selectedTicket.citizenNameMasked} ({selectedTicket.citizenPhoneMasked})</span>
                      )}
                    </span>
                  </div>
                </div>

                {!unmaskedCitizen ? (
                  <div className="pt-2 flex items-center justify-between border-t border-[#1b2e34]">
                    <span className="text-[11px] text-slate-400">
                      Reveal raw citizen name & phone (requires 2FA + min 20-char written justification).
                    </span>
                    <button
                      onClick={() => setShowIdentityPrompt(true)}
                      className="flex items-center gap-1.5 rounded bg-[#162327] border border-[#1b2e34] px-2.5 py-1 text-xs text-teal-300 hover:text-white hover:bg-[#1a2e33]"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-400" />
                      <span>Reveal Identity</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 text-[11px] text-amber-400 border-t border-[#1b2e34]">
                    &bull; Identity revealed. This access has been recorded permanently in the compliance audit log.
                  </div>
                )}
              </div>

              {/* Attached Photo */}
              {selectedTicket.photoUrl && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-2">
                    Citizen Handset Upload Photo
                  </h4>
                  <div className="rounded-lg overflow-hidden border border-[#1b2e34] max-h-48 w-full bg-black">
                    <img
                      src={selectedTicket.photoUrl}
                      alt="SOS scene"
                      className="w-full h-48 object-cover opacity-90 hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              )}

              {/* Status Controls */}
              <div className="pt-2 border-t border-[#1b2e34] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Update Status:</span>
                  {(['assigned', 'in_progress', 'resolved'] as SosTicketStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedTicket.id, st)}
                      className={`px-3 py-1 rounded text-xs font-medium capitalize border transition-colors ${
                        selectedTicket.status === st
                          ? 'bg-[#133e42] text-teal-300 border-teal-500/40'
                          : 'border-[#1b2e34] text-slate-400 hover:text-white'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {selectedTicket.type === 'missing_person' && (
                  <button
                    onClick={() => handlePromoteToAlert(selectedTicket.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 shadow-sm"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Promote to Broadcast Queue</span>
                  </button>
                )}
              </div>

              {/* Dispatcher Notes Log */}
              <div className="space-y-3 pt-3 border-t border-[#1b2e34]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  Dispatcher Incident Log & Notes
                </h4>
                <div className="rounded-lg bg-[#0c1417] border border-[#1b2e34] p-3 space-y-2 max-h-40 overflow-y-auto text-xs">
                  {selectedTicket.notes.map((note, i) => (
                    <div key={i} className="text-slate-300 leading-relaxed">
                      &bull; {note}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add operational notes or update dispatch status..."
                    className="flex-1 rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={!noteInput.trim()}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 disabled:opacity-40"
                  >
                    Add Log
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-12 text-center text-xs text-slate-500">
              Select an SOS ticket from the feed.
            </div>
          )}
        </div>
      </div>

      {/* Identity Reveal Modal with 2FA + Written Justification */}
      {showIdentityPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-teal-800 bg-[#0c1417] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-teal-400">
              <Lock className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Authorized Identity Unmasking</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unmasking raw citizen names and phone numbers requires a minimum 20-character operational justification
              plus a 2FA authentication token. This access will be permanently logged.
            </p>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Written Justification (min 20 chars) *
              </label>
              <textarea
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="e.g. Field dispatch ambulance contact required to coordinate helicopter landing zone."
                className="w-full rounded-lg bg-[#111d21] border border-[#1b2e34] p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500">{justification.length}/20 chars min</span>
            </div>

            {unmaskError && <p className="text-xs text-red-400">{unmaskError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowIdentityPrompt(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (justification.trim().length >= 20) {
                    // launch 2FA prompt
                    const code = prompt('Enter 6-digit Authenticator Token (Mock: 123456):')
                    if (code) handleExecuteUnmask(code)
                  }
                }}
                disabled={justification.trim().length < 20}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                Proceed with 2FA Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
