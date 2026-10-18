import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Plus,
  Radio,
  FileText,
  Clock,
  FolderOpen,
} from 'lucide-react'

import { DataTable } from '@/packages/ui/DataTable'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { fetchCases } from '@/api/mockCases'
import { useRealtimeEvents } from '@/features/realtime/useRealtime'
import type { Case } from '@/types/case'

export default function CaseDashboardPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    fetchCases().then((data) => {
      if (!cancelled) {
        setCases(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Live WebSocket update
  useRealtimeEvents((event) => {
    if (event.type === 'case_changed') {
      void fetchCases().then(setCases)
    }
  })

  // Metric Computations
  const activeAlertsCount = cases.filter((c) => c.status === 'broadcast').length
  const pendingReviewCount = cases.filter(
    (c) => c.status === 'under_review' || c.status === 'needs_clarification' || c.status === 'submitted',
  ).length
  const openCasesCount = cases.filter((c) => c.status !== 'rejected').length
  const draftsCount = cases.filter((c) => c.status === 'draft').length

  const STATUS_TABS = [
    { id: 'all', label: 'All Cases', count: cases.length },
    { id: 'draft', label: 'Drafts', count: draftsCount },
    { id: 'submitted', label: 'Submitted', count: cases.filter((c) => c.status === 'submitted').length },
    { id: 'under_review', label: 'Under Review', count: cases.filter((c) => c.status === 'under_review').length },
    { id: 'needs_clarification', label: 'Needs Clarification', count: cases.filter((c) => c.status === 'needs_clarification').length },
    { id: 'verified', label: 'Verified', count: cases.filter((c) => c.status === 'verified').length },
    { id: 'approved', label: 'Approved', count: cases.filter((c) => c.status === 'approved').length },
    { id: 'broadcast', label: 'Broadcast', count: activeAlertsCount },
    { id: 'rejected', label: 'Rejected', count: cases.filter((c) => c.status === 'rejected').length },
  ]

  const filteredCases = statusFilter === 'all'
    ? cases
    : cases.filter((c) => c.status === statusFilter)

  const columns = [
    {
      accessorKey: 'id',
      header: 'Case ID',
      cell: ({ row }: any) => (
        <Link
          to={`/resource/cases/${row.original.id}`}
          className="font-mono text-teal-400 hover:text-teal-300 font-semibold"
        >
          {row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Incident Title',
      cell: ({ row }: any) => (
        <Link
          to={`/resource/cases/${row.original.id}`}
          className="hover:text-teal-300 font-medium block truncate max-w-sm"
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => (
        <span className="text-slate-300">{row.original.category}</span>
      ),
    },
    {
      accessorKey: 'area',
      header: 'Target Area',
      cell: ({ row }: any) => (
        <span className="text-slate-400 text-xs">{row.original.area}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => <StatusBadge value={row.original.status} />,
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      cell: ({ row }: any) => (
        <span className="text-slate-400 font-mono text-[11px]">{row.original.updatedAt}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Eyebrow & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-teal-400 tracking-widest uppercase">
            Resource Organization Operations
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            Incident Command Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Submit, monitor, and coordinate emergency incident reports with the INSA control centre.
          </p>
        </div>

        <button
          onClick={() => navigate('/resource/cases/new')}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-teal-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Incident</span>
        </button>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Broadcasts */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Broadcast Alerts</span>
            <div className="rounded-lg bg-[#3b1418] border border-red-900/60 p-2 text-[#ef4444]">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{activeAlertsCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Active public warning alerts</p>
          </div>
        </div>

        {/* Pending Review */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Under Review</span>
            <div className="rounded-lg bg-[#3b3014] border border-amber-900/60 p-2 text-[#f59e0b]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{pendingReviewCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting INSA triage/verification</p>
          </div>
        </div>

        {/* Total Active Cases */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tracked Cases</span>
            <div className="rounded-lg bg-[#3d2614] border border-orange-900/60 p-2 text-[#f97316]">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{openCasesCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">All non-rejected incidents</p>
          </div>
        </div>

        {/* Drafts */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Draft Reports</span>
            <div className="rounded-lg bg-[#133832] border border-emerald-900/60 p-2 text-[#10b981]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono text-white">{draftsCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Unsubmitted drafts in progress</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Data Table */}
      <div className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1b2e34] pb-2 text-xs">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium transition-all ${
                  active
                    ? 'bg-[#133e42] text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#162327]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    active ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Incident Cases Table */}
        <DataTable
          columns={columns}
          data={filteredCases}
          loading={loading}
          searchPlaceholder="Search cases by title, ID, or area..."
          onRowClick={(c) => navigate(`/resource/cases/${c.id}`)}
        />
      </div>
    </div>
  )
}
