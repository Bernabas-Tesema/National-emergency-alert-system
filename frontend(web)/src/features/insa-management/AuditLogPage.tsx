import { useEffect, useState } from 'react'
import { fetchAuditLog } from '@/api/mockAudit'
import DataTable, { type Column } from '@/components/DataTable'
import StepUpDialog from '@/components/StepUpDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { downloadCsv, toCsv } from '@/lib/csv'
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  type AuditEntry,
  type AuditPage,
  type AuditQuery,
} from '@/types/audit'
import { ROLE_LABELS } from '@/types/role'

const PAGE_SIZE = 10
const EXPORT_LIMIT = 10000

const EMPTY_FILTERS: AuditQuery = {
  action: '',
  search: '',
  from: '',
  to: '',
  page: 1,
  pageSize: PAGE_SIZE,
}

const columns: Column<AuditEntry>[] = [
  { header: 'Time', cell: (e) => new Date(e.timestamp).toLocaleString() },
  { header: 'User', cell: (e) => e.actorName },
  { header: 'Role', cell: (e) => (e.actorRole ? ROLE_LABELS[e.actorRole] : '—') },
  { header: 'Action', cell: (e) => AUDIT_ACTION_LABELS[e.action] },
  { header: 'Target', cell: (e) => e.target },
  {
    header: 'Result',
    cell: (e) => (
      <Badge
        variant="outline"
        className={
          e.outcome === 'success'
            ? 'border-green-300 bg-green-50 text-green-800'
            : 'border-red-300 bg-red-50 text-red-800'
        }
      >
        {e.outcome === 'success' ? 'Success' : 'Failed'}
      </Badge>
    ),
  },
  { header: 'IP address', cell: (e) => e.ipAddress },
]

export default function AuditLogPage() {
  const [query, setQuery] = useState<AuditQuery>(EMPTY_FILTERS)
  // The answer is stored together with the question it belongs to, so we can
  // tell when it is out of date without setting state inside the effect.
  const [result, setResult] = useState<{ key: string; page: AuditPage } | null>(null)
  const [confirmingExport, setConfirmingExport] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAuditLog(query).then((page) => {
      if (!cancelled) setResult({ key: JSON.stringify(query), page })
    })
    return () => {
      cancelled = true
    }
  }, [query])

  const loading = !result || result.key !== JSON.stringify(query)
  const total = result?.page.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(
    query.action || query.search || query.from || query.to,
  )

  // Any filter change goes back to page 1. A patch that names a page keeps it.
  function changeFilters(patch: Partial<AuditQuery>) {
    setQuery((prev) => ({ ...prev, page: 1, ...patch }))
  }

  async function exportCsv() {
    setNotice('')
    setError('')
    try {
      const everything = await fetchAuditLog({
        ...query,
        page: 1,
        pageSize: EXPORT_LIMIT,
      })
      const rows = [
        ['Time', 'User', 'Role', 'Action', 'Target', 'Result', 'IP address'],
        ...everything.entries.map((e) => [
          e.timestamp,
          e.actorName,
          e.actorRole ? ROLE_LABELS[e.actorRole] : '',
          AUDIT_ACTION_LABELS[e.action],
          e.target,
          e.outcome === 'success' ? 'Success' : 'Failed',
          e.ipAddress,
        ]),
      ]
      downloadCsv(
        `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(rows),
      )
      setNotice(`Exported ${everything.entries.length} entries.`)
    } catch {
      setError('Could not export the audit log. Please try again.')
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Audit log</h1>
          <p className="mt-1 text-xs text-slate-400">
            A read-only record of administrative actions. Entries cannot be
            changed or deleted here.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading || total === 0}
          onClick={() => setConfirmingExport(true)}
          className="border-[#1b2e34] text-slate-200 hover:text-white text-xs"
        >
          Export CSV
        </Button>
      </div>

      {notice && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-4 py-3 text-xs text-emerald-300 font-medium">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-xs text-red-300 font-medium">
          {error}
        </p>
      )}

      <div className="grid gap-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="audit-action" className="text-xs text-slate-300">Action</Label>
          <select
            id="audit-action"
            className="h-9 w-full rounded-md border border-[#1b2e34] bg-[#0c1417] px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            value={query.action}
            onChange={(e) =>
              changeFilters({ action: e.target.value as AuditQuery['action'] })
            }
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-search" className="text-xs text-slate-300">User or target</Label>
          <Input
            id="audit-search"
            value={query.search}
            onChange={(e) => changeFilters({ search: e.target.value })}
            placeholder="Search..."
            className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-from" className="text-xs text-slate-300">From</Label>
          <Input
            id="audit-from"
            type="date"
            value={query.from}
            onChange={(e) => changeFilters({ from: e.target.value })}
            className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-to" className="text-xs text-slate-300">To</Label>
          <Input
            id="audit-to"
            type="date"
            value={query.to}
            onChange={(e) => changeFilters({ to: e.target.value })}
            className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>{loading ? 'Loading...' : `${total} entries`}</p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setQuery(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        )}
      </div>

      {result && (
        <div className={loading ? 'opacity-60' : ''}>
          <DataTable
            columns={columns}
            rows={result.page.entries}
            getRowId={(e) => e.id}
            emptyMessage="No entries match these filters."
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || query.page <= 1}
          onClick={() => changeFilters({ page: query.page - 1 })}
        >
          Previous
        </Button>
        <p className="text-sm text-slate-600">
          Page {query.page} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || query.page >= totalPages}
          onClick={() => changeFilters({ page: query.page + 1 })}
        >
          Next
        </Button>
      </div>

      {confirmingExport && (
        <StepUpDialog
          title="Export audit log"
          description="This downloads every entry that matches your current filters. Enter your verification code to confirm."
          confirmLabel="Export"
          onCancel={() => setConfirmingExport(false)}
          onVerified={async () => {
            setConfirmingExport(false)
            await exportCsv()
          }}
        />
      )}
    </div>
  )
}