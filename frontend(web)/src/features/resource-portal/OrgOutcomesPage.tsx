import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircle2, Radio, XCircle, FileCheck } from 'lucide-react'

import { DataTable } from '@/packages/ui/DataTable'
import { StatusBadge } from '@/packages/ui/StatusBadge'
import { fetchCases } from '@/api/mockCases'
import type { Case } from '@/types/case'

const OUTCOME_STATUSES = new Set([
  'verified',
  'approved',
  'broadcast',
  'rejected',
  'needs_clarification',
  'under_review',
  'submitted',
])

export default function OrgOutcomesPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    fetchCases()
      .then((data) => {
        if (!cancelled) {
          setCases(data.filter((c) => OUTCOME_STATUSES.has(c.status) || c.status !== 'draft'))
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

  const verified = cases.filter((c) => c.status === 'verified' || c.status === 'approved').length
  const broadcast = cases.filter((c) => c.status === 'broadcast').length
  const rejected = cases.filter((c) => c.status === 'rejected').length
  const pending = cases.filter((c) =>
    ['submitted', 'under_review', 'needs_clarification'].includes(c.status),
  ).length

  const filtered =
    filter === 'all'
      ? cases.filter((c) => c.status !== 'draft')
      : cases.filter((c) => c.status === filter)

  const columns = [
    {
      accessorKey: 'id',
      header: 'Case ID',
      cell: ({ row }: any) => (
        <span className="font-mono text-sm font-semibold text-[#2563eb]">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Incident',
      cell: ({ row }: any) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'status',
      header: 'What happened',
      cell: ({ row }: any) => <StatusBadge value={row.original.status} />,
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }: any) => (
        <span className="font-mono text-[11px] text-slate-500">{row.original.updatedAt}</span>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563eb]">
          Organization officer
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Case outcomes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track what INSA did with your submitted incidents — verified, broadcast, clarification, or rejected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<FileCheck className="h-4 w-4" />} label="Awaiting INSA" value={pending} tone="amber" />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Verified / approved" value={verified} tone="green" />
        <Metric icon={<Radio className="h-4 w-4" />} label="Broadcast" value={broadcast} tone="blue" />
        <Metric icon={<XCircle className="h-4 w-4" />} label="Rejected" value={rejected} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['all', 'All'],
          ['submitted', 'Submitted'],
          ['under_review', 'Under review'],
          ['needs_clarification', 'Needs clarification'],
          ['verified', 'Verified'],
          ['broadcast', 'Broadcast'],
          ['rejected', 'Rejected'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filter === id
                ? 'bg-[#2563eb] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchPlaceholder="Search by title or case ID..."
        onRowClick={(c) => navigate(`/resource/cases/${c.id}`)}
      />
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  tone: 'amber' | 'green' | 'blue' | 'red'
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`rounded-lg border p-2 ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-bold font-mono text-slate-900">{value}</div>
    </div>
  )
}
