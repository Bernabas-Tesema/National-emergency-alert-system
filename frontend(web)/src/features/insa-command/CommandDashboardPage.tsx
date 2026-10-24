import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Bell,
  FileWarning,
  Siren,
  Users,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react'

import { fetchAlerts, type Alert } from '@/api/mockAlerts'
import { fetchCases } from '@/api/mockCases'
import { fetchSosTickets, type SosTicket } from '@/api/mockSos'
import { MapPicker, type MapLayer } from '@/packages/ui/MapPicker'
import type { Case } from '@/types/case'

export default function CommandDashboardPage() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [sosTickets, setSosTickets] = useState<SosTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchAlerts(), fetchCases(), fetchSosTickets()])
      .then(([loadedAlerts, loadedCases, loadedSos]) => {
        if (!cancelled) {
          setAlerts(loadedAlerts)
          setCases(loadedCases)
          setSosTickets(loadedSos)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading operations console telemetry...</div>
  }

  const activeAlertsCount = alerts.filter((a) => a.status === 'broadcasting').length
  const pendingReportsCount = cases.filter(
    (c) => c.status === 'under_review' || c.status === 'needs_clarification' || c.status === 'submitted',
  ).length
  const openSosCount = sosTickets.filter((t) => t.status !== 'resolved').length
  const registeredUsersCount = 8 // Total staff & officers

  // Multi-layer mapping of active emergencies
  const mapLayers: MapLayer[] = [
    {
      id: 'l-1',
      name: 'Awash Flood Zone',
      color: '#ef4444',
      feature: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [8.55, 39.28] },
        properties: {
          shape: 'circle',
          regionRef: { region: 'Oromia', zone: 'East Shewa' },
          radiusMeters: 4500,
          severity: 'critical',
        },
      },
    },
    {
      id: 'l-2',
      name: 'Bale Mountain Wildfire Buffer',
      color: '#f97316',
      feature: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [9.02, 38.76] },
        properties: {
          shape: 'circle',
          regionRef: { region: 'Addis Ababa', zone: 'Addis Ababa Metro' },
          radiusMeters: 2500,
          severity: 'high',
        },
      },
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Eyebrow and Page Heading - Exactly matching reference screenshot */}
      <div>
        <p className="text-[11px] font-bold text-teal-400 tracking-widest uppercase">
          ETHIOALERT OPERATIONS
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          Command overview
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Live operational indicators across EthioAlert.
        </p>
      </div>

      {/* 4 Metric Cards - Matching reference screenshot colors and layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active alerts */}
        <div
          onClick={() => navigate('/insa/alerts')}
          className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm cursor-pointer hover:border-red-900/50 hover:bg-[#152327] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Active alerts</span>
            <div className="rounded-lg bg-[#3b1418] border border-red-900/60 p-2.5 text-[#ef4444] group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{activeAlertsCount || 1}</div>
            <p className="text-[11px] text-slate-400 mt-1">Published alerts requiring monitoring</p>
          </div>
        </div>

        {/* Pending reports */}
        <div
          onClick={() => navigate('/insa/cases')}
          className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm cursor-pointer hover:border-amber-900/50 hover:bg-[#152327] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Pending reports</span>
            <div className="rounded-lg bg-[#3b3014] border border-amber-900/60 p-2.5 text-[#f59e0b] group-hover:scale-105 transition-transform">
              <FileWarning className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{pendingReportsCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Reports awaiting moderation</p>
          </div>
        </div>

        {/* Open SOS */}
        <div
          onClick={() => navigate('/insa/sos')}
          className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm cursor-pointer hover:border-orange-900/50 hover:bg-[#152327] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Open SOS</span>
            <div className="rounded-lg bg-[#3d2614] border border-orange-900/60 p-2.5 text-[#f97316] group-hover:scale-105 transition-transform">
              <Siren className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{openSosCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Incidents currently active</p>
          </div>
        </div>

        {/* Registered users */}
        <div
          onClick={() => navigate('/insa/staff')}
          className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm cursor-pointer hover:border-emerald-900/50 hover:bg-[#152327] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Registered users</span>
            <div className="rounded-lg bg-[#133832] border border-emerald-900/60 p-2.5 text-[#10b981] group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{registeredUsersCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">All platform accounts</p>
          </div>
        </div>
      </div>

      {/* Quick Actions - Matching reference screenshot */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          Quick actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/insa/alerts/composer')}
            className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 cursor-pointer hover:border-teal-500/50 hover:bg-[#152327] transition-all group"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors">
                Create & publish alerts
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Draft, verify, and release public notices.
            </p>
          </div>

          <div
            onClick={() => navigate('/insa/cases')}
            className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 cursor-pointer hover:border-teal-500/50 hover:bg-[#152327] transition-all group"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors">
                Moderate reports
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Accept, escalate, or dismiss community reports.
            </p>
          </div>

          <div
            onClick={() => navigate('/insa/sos')}
            className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 cursor-pointer hover:border-teal-500/50 hover:bg-[#152327] transition-all group"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors">
                Handle SOS
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Resolve active emergency requests.
            </p>
          </div>
        </div>
      </div>

      {/* AI Threat Assessment & Live Operational Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Executive Summary Panel */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 space-y-4 lg:col-span-1 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#1b2e34] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                AI Executive Summary
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800">
              AI-generated
            </span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <p>
              <strong className="text-white">Threat Level: ELEVATED (Awash Basin & Bale Ridge).</strong>
              Hydrological sensors detect continued cresting at Mojo bridge (+4.2m). Downstream flash flood risk remains Critical for next 6 hours.
            </p>
            <p>
              Secondary hazard: Bale wildfire smoke plume drifting towards Goba township. 84,000 citizens in targeted evacuation zones.
            </p>
          </div>

          <div className="pt-3 border-t border-[#1b2e34] space-y-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              AI Threat Ranking
            </span>
            {[
              { label: 'Awash River Overflow', rank: 98, level: 'Critical', color: 'bg-red-500' },
              { label: 'Bale Ridge Wildfire', rank: 82, level: 'High', color: 'bg-orange-500' },
              { label: 'Akaki Industrial Plume', rank: 76, level: 'High', color: 'bg-amber-500' },
            ].map((threat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-200">{threat.label}</span>
                  <span className="font-mono text-teal-400 font-semibold">{threat.rank}/100</span>
                </div>
                <div className="w-full bg-[#162327] rounded-full h-1.5 overflow-hidden">
                  <div className={`${threat.color} h-full rounded-full`} style={{ width: `${threat.rank}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Crisis Operations Map */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 lg:col-span-2 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Live Situational Crisis Map
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Critical Alert
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> High Alert
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400" /> SOS Ticket
              </span>
            </div>
          </div>

          <MapPicker
            readOnly
            layers={mapLayers}
            height="340px"
          />
        </div>
      </div>
    </div>
  )
}
