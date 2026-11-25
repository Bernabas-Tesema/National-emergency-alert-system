import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  UserCheck,
  Eye,
  Lock,
  Radio,
  MapPin,
  Volume2,
  VolumeX,
  Bell,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Crosshair,
  Users,
  Compass,
  PlayCircle,
  ShieldAlert,
} from 'lucide-react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import {
  fetchSosTickets,
  assignSosTicket,
  updateSosStatus,
  promoteMissingPersonToAlert,
  revealCitizenIdentity,
  simulateInboundSosTicket,
  type SosTicket,
  type SosTicketStatus,
} from '@/api/mockSos'
import { subscribeMockEvents } from '@/api/mockRealtimeBus'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'

// Web Audio API loud Ambulance Siren synthesizer
function playEmergencyChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sawtooth'
    osc2.type = 'triangle'

    // Loud Ambulance wail siren sweep: 660Hz <-> 960Hz over 2.4s
    osc1.frequency.setValueAtTime(660, now)
    osc1.frequency.linearRampToValueAtTime(960, now + 0.4)
    osc1.frequency.linearRampToValueAtTime(660, now + 0.8)
    osc1.frequency.linearRampToValueAtTime(960, now + 1.2)
    osc1.frequency.linearRampToValueAtTime(660, now + 1.6)
    osc1.frequency.linearRampToValueAtTime(960, now + 2.0)
    osc1.frequency.linearRampToValueAtTime(660, now + 2.4)

    osc2.frequency.setValueAtTime(330, now)
    osc2.frequency.linearRampToValueAtTime(480, now + 0.4)
    osc2.frequency.linearRampToValueAtTime(330, now + 0.8)
    osc2.frequency.linearRampToValueAtTime(480, now + 1.2)
    osc2.frequency.linearRampToValueAtTime(330, now + 1.6)
    osc2.frequency.linearRampToValueAtTime(480, now + 2.0)
    osc2.frequency.linearRampToValueAtTime(330, now + 2.4)

    gain.gain.setValueAtTime(0.75, now)
    gain.gain.setValueAtTime(0.75, now + 2.1)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.45)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 2.5)
    osc2.stop(now + 2.5)
  } catch (err) {
    console.warn('Emergency chime restricted by browser policy:', err)
  }
}

// Browser Speech Synthesis voice alarm
function speakVoiceAlarm(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 1.08
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(
      (v) => v.lang.startsWith('en') && !v.name.toLowerCase().includes('whisper')
    )
    if (englishVoice) {
      utterance.voice = englishVoice
    }
    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.warn('Speech synthesis error:', err)
  }
}

// Map updater to pan to exact coordinates when selecting a ticket
function MapPanController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, 15, { animate: true, duration: 0.8 })
  }, [center, map])
  return null
}

export default function SosOperationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<SosTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SosTicket | null>(null)
  const [noteInput, setNoteInput] = useState('')

  // Audio & Voice Alert state
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [voiceAlarmEnabled, setVoiceAlarmEnabled] = useState(true)
  const [incomingAlertBanner, setIncomingAlertBanner] = useState<SosTicket | null>(null)
  const [copiedCoords, setCopiedCoords] = useState(false)
  const [audioTesting, setAudioTesting] = useState(false)

  // Identity unmasking security state
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false)
  const [justification, setJustification] = useState('')
  const [unmaskedCitizen, setUnmaskedCitizen] = useState<{ fullName: string; phone: string } | null>(null)
  const [unmaskError, setUnmaskError] = useState('')

  const soundEnabledRef = useRef(soundEnabled)
  const voiceEnabledRef = useRef(voiceAlarmEnabled)
  const knownTicketIdsRef = useRef<Set<string>>(new Set())
  soundEnabledRef.current = soundEnabled
  voiceEnabledRef.current = voiceAlarmEnabled

  function triggerSosAlarm(ticket: SosTicket) {
    if (soundEnabledRef.current) {
      playEmergencyChime()
    }
    if (voiceEnabledRef.current) {
      const speech = `Emergency Alert! Direct citizen SOS distress signal received at INSA from ${ticket.region}. Emergency type: ${ticket.type}. Immediate emergency response required.`
      speakVoiceAlarm(speech)
    }
    setIncomingAlertBanner(ticket)
  }

  useEffect(() => {
    let unmounted = false

    function processIncomingTickets(list: SosTicket[], isInitial: boolean) {
      if (unmounted) return
      setTickets(list)

      // Find any newly arrived 'new' SOS ticket that hasn't triggered an alarm yet
      const newlyArrived = list.find(
        (t) => t.status === 'new' && !knownTicketIdsRef.current.has(t.id)
      )

      if (newlyArrived) {
        // Automatic voice alarm and chime as requested by the user
        setSelectedTicket(newlyArrived)
        triggerSosAlarm(newlyArrived)
      } else if (isInitial && list.length > 0) {
        const firstActive = list.find((t) => t.status === 'new') || list[0]
        setSelectedTicket(firstActive)
        if (firstActive.status === 'new') {
          setIncomingAlertBanner(firstActive)
          triggerSosAlarm(firstActive)
        }
      }

      list.forEach((t) => knownTicketIdsRef.current.add(t.id))
      setLoading(false)
    }

    // 1. Initial load
    fetchSosTickets().then((data) => {
      processIncomingTickets(data, true)
    })

    // 2. Real-time event listener (fires when citizen submits an SOS)
    const unsubscribe = subscribeMockEvents((evt) => {
      if (evt.type === 'case_changed') {
        fetchSosTickets().then((data) => processIncomingTickets(data, false))
      }
    })

    // 3. Active background polling (every 3 seconds) for mobile and external submissions
    const pollTimer = setInterval(() => {
      fetchSosTickets().then((data) => processIncomingTickets(data, false))
    }, 3000)

    return () => {
      unmounted = true
      unsubscribe()
      clearInterval(pollTimer)
    }
  }, [])

  function handleSimulateIncomingSos() {
    const newTicket = simulateInboundSosTicket()
    setTickets((prev) => [newTicket, ...prev])
    setSelectedTicket(newTicket)
    setUnmaskedCitizen(null)
    triggerSosAlarm(newTicket)
  }

  function handleTestAudioAndVoice() {
    setAudioTesting(true)
    playEmergencyChime()
    speakVoiceAlarm('This is a test of the EthioAlert Emergency Voice Alarm system. Exact sender location received. All dispatch units on standby.')
    setTimeout(() => setAudioTesting(false), 2500)
  }

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
    if (incomingAlertBanner?.id === ticketId && nextStatus !== 'new') {
      setIncomingAlertBanner(null)
    }
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
      const list = await fetchSosTickets()
      setTickets(list)
      setSelectedTicket(list.find((t) => t.id === selectedTicket.id) || null)
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Identity reveal failed.'
      setUnmaskError(msg)
      return false
    }
  }

  const copyCoordinates = () => {
    if (!selectedTicket) return
    const text = `${selectedTicket.coordinates[0].toFixed(6)}, ${selectedTicket.coordinates[1].toFixed(6)}`
    navigator.clipboard.writeText(text)
    setCopiedCoords(true)
    setTimeout(() => setCopiedCoords(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Eyebrow & Title + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <p className="text-[11px] font-bold text-teal-400 tracking-widest uppercase">
            Citizen Emergency Response
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            SOS Operations Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time citizen SOS distress tickets, exact sender telemetry, live geospatial mapping, and automated voice alarms.
          </p>
        </div>

        {/* Audio & Simulation Control Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Chime Toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Mute emergency siren chime' : 'Enable emergency siren chime'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${soundEnabled
              ? 'bg-[#133e42] border-teal-500/50 text-teal-300'
              : 'bg-[#111d21] border-[#1b2e34] text-slate-400 hover:text-white'
              }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span>Chime: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Voice Alarm Toggle */}
          <button
            onClick={() => setVoiceAlarmEnabled((v) => !v)}
            title={voiceAlarmEnabled ? 'Disable spoken voice alarm' : 'Enable spoken voice alarm'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${voiceAlarmEnabled
              ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
              : 'bg-[#111d21] border-[#1b2e34] text-slate-400 hover:text-white'
              }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Voice Alarm: {voiceAlarmEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Test Voice Alarm */}
          <button
            onClick={handleTestAudioAndVoice}
            disabled={audioTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111d21] border border-[#1b2e34] hover:border-teal-500/50 text-xs font-medium text-slate-200 hover:text-teal-300 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5 text-teal-400" />
            <span>{audioTesting ? 'Testing Audio...' : 'Test Voice Alarm'}</span>
          </button>

          {/* Simulate Inbound SOS */}
          <button
            onClick={handleSimulateIncomingSos}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-semibold text-white shadow-md transition-all active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 animate-pulse" />
            <span>Simulate Inbound SOS</span>
          </button>
        </div>
      </div>

      {/* Prominent Real-time Inbound Alert Banner */}
      {incomingAlertBanner && (
        <div className="relative overflow-hidden rounded-xl border border-red-500/80 bg-gradient-to-r from-red-950/90 via-[#260f12] to-[#1a0a0c] p-4 text-white shadow-xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-600/30 border border-red-500/50 animate-pulse text-red-300">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-600 text-[10px] font-bold tracking-wider uppercase">
                    CRITICAL SOS SIGNAL RECEIVED
                  </span>
                  <span className="font-mono text-xs font-bold text-red-200">
                    {incomingAlertBanner.id}
                  </span>
                  <span className="text-xs text-red-300/80">
                    &bull; {new Date(incomingAlertBanner.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  Citizen Distress: <span className="uppercase text-amber-300">{incomingAlertBanner.type}</span> &mdash; {incomingAlertBanner.region}
                </h4>
                <p className="text-xs text-red-200/90 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                  <span>Exact Address: <strong>{incomingAlertBanner.exactAddress || incomingAlertBanner.region}</strong> (GPS Accuracy: &plusmn;{incomingAlertBanner.accuracyMeters || 8}m)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedTicket(incomingAlertBanner)
                  setIncomingAlertBanner(null)
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow"
              >
                Focus Telemetry
              </button>
              <button
                onClick={() => setIncomingAlertBanner(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SOS Feed */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>Live SOS Feed</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800 text-teal-300 text-[11px] font-bold">
                {tickets.filter((t) => t.status !== 'resolved').length} Active
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">Sorted by time</span>
          </div>

          <div className="space-y-2.5 max-h-[740px] overflow-y-auto pr-1">
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
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                    ? 'border-teal-500 bg-[#15272c] shadow-lg ring-1 ring-teal-500/30'
                    : isNew
                      ? 'border-red-700/80 bg-[#1e1315] hover:border-red-500 shadow-sm'
                      : 'border-[#1b2e34] bg-[#111d21] hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-400">{ticket.id}</span>
                      <span className={`uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${ticket.type === 'trapped' || ticket.type === 'fire'
                        ? 'bg-red-900/60 text-red-300 border border-red-700/40'
                        : ticket.type === 'missing_person'
                          ? 'bg-amber-900/60 text-amber-300 border border-amber-700/40'
                          : 'bg-slate-800 text-slate-300'
                        }`}>
                        {ticket.type}
                      </span>
                    </div>
                    <StatusBadge value={ticket.status} />
                  </div>

                  <p className="text-xs font-semibold text-slate-200 truncate">{ticket.region}</p>

                  {ticket.exactAddress && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                      <span>{ticket.exactAddress}</span>
                    </p>
                  )}

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
                    <span className="text-[11px] text-slate-400 font-mono">
                      Received {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                    <span>{selectedTicket.type} Emergency Distress</span>
                    {selectedTicket.status === 'new' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse">
                        ACTION REQUIRED
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{selectedTicket.region}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
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
              </div>

              {/* EXACT SENDER GEOSPATIAL TELEMETRY CARD */}
              <div className="rounded-xl border border-teal-800/60 bg-[#0a1518] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#1b2e34] pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-teal-400 animate-spin-slow" />
                    <span>Exact Sender Geospatial Telemetry</span>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-950 border border-teal-800/80 text-[10px] font-semibold text-teal-300">
                    <Crosshair className="w-3 h-3 text-teal-400" />
                    <span>Accuracy: &plusmn;{selectedTicket.accuracyMeters ?? 6} meters</span>
                  </span>
                </div>

                {/* Coordinates & Physical Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 bg-[#102026] p-3 rounded-lg border border-[#1b2e34]">
                    <span className="text-slate-400 text-[11px] font-medium block">GPS Coordinates:</span>
                    <div className="flex items-center justify-between font-mono font-bold text-teal-300">
                      <span>
                        {selectedTicket.coordinates[0].toFixed(6)}&deg; N, {selectedTicket.coordinates[1].toFixed(6)}&deg; E
                      </span>
                      <button
                        onClick={copyCoordinates}
                        title="Copy GPS Coordinates"
                        className="p-1 rounded hover:bg-teal-900/40 text-teal-400"
                      >
                        {copiedCoords ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Latitude: {selectedTicket.coordinates[0]} | Longitude: {selectedTicket.coordinates[1]}
                    </span>
                  </div>

                  <div className="space-y-1 bg-[#102026] p-3 rounded-lg border border-[#1b2e34]">
                    <span className="text-slate-400 text-[11px] font-medium block">Exact Physical Landmark:</span>
                    <p className="text-slate-100 font-semibold leading-snug">
                      {selectedTicket.exactAddress || selectedTicket.region}
                    </p>
                    {selectedTicket.peopleCount && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1 pt-0.5">
                        <Users className="w-3 h-3" />
                        <span>People at risk: <strong>{selectedTicket.peopleCount}</strong></span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Leaflet Mini-Map */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">Live Satellite / Street Position:</span>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://www.google.com/maps?q=${selectedTicket.coordinates[0]},${selectedTicket.coordinates[1]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 hover:underline"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${selectedTicket.coordinates[0]}&mlon=${selectedTicket.coordinates[1]}#map=17/${selectedTicket.coordinates[0]}/${selectedTicket.coordinates[1]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 hover:underline"
                      >
                        <span>OpenStreetMap</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="h-56 w-full rounded-lg overflow-hidden border border-[#1b2e34] shadow-inner relative z-0">
                    <MapContainer
                      center={selectedTicket.coordinates}
                      zoom={15}
                      scrollWheelZoom={false}
                      className="h-full w-full z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapPanController center={selectedTicket.coordinates} />
                      <Circle
                        center={selectedTicket.coordinates}
                        radius={selectedTicket.accuracyMeters ?? 10}
                        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 1.5 }}
                      />
                      <CircleMarker
                        center={selectedTicket.coordinates}
                        radius={8}
                        pathOptions={{ color: '#ffffff', fillColor: '#dc2626', fillOpacity: 1, weight: 2 }}
                      />
                    </MapContainer>
                  </div>
                </div>
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
                      className={`px-3 py-1 rounded text-xs font-medium capitalize border transition-colors ${selectedTicket.status === st
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
