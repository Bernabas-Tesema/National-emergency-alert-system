
import { useEffect, useState } from 'react'

import { fetchCases } from '@/api/mockCases'
import {
  addOfficer,
  fetchOfficers,
  resetOfficer,
  setOfficerStatus,
} from '@/api/mockOfficers'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import StepUpDialog from '@/components/StepUpDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { maskPhone } from '@/lib/phone'
import { CASE_STATUSES, type Case, type CaseStatus } from '@/types/case'
import type {
  NewOfficerInput,
  Officer,
  OfficerStatus,
} from '@/types/officer'
import OfficerForm from './OfficerForm'

interface StatusRow {
  status: CaseStatus
  count: number
}

const statusColumns: Column<StatusRow>[] = [
  { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  { header: 'Cases', cell: (r) => r.count },
]

function StatCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

type PendingAction = { kind: 'toggle' | 'reset'; officer: Officer }

export default function OrgAdminPage() {
  const { user } = useAuth()
  const organization = user?.organization ?? ''

  const [cases, setCases] = useState<Case[]>([])
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchCases(), fetchOfficers(organization)]).then(
      ([loadedCases, loadedOfficers]) => {
        if (!cancelled) {
          setCases(loadedCases)
          setOfficers(loadedOfficers)
          setLoading(false)
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [organization])

  async function handleAdd(input: NewOfficerInput) {
    // Errors are left to the form, which shows its own message.
    const officer = await addOfficer(organization, input)

    setOfficers((prev) => [...prev, officer])
    setShowForm(false)
    setActionError('')
    setNotice(
      `${officer.fullName} was added. An invitation was sent to ${maskPhone(officer.phone)}.`,
    )
  }

  // Sensitive actions require fresh two-factor verification first.
  async function performToggle(officer: Officer) {
    const next: OfficerStatus =
      officer.status === 'active' ? 'suspended' : 'active'

    setNotice('')
    setActionError('')

    try {
      await setOfficerStatus(organization, officer.id, next)

      setOfficers((prev) =>
        prev.map((o) =>
          o.id === officer.id ? { ...o, status: next } : o,
        ),
      )

      setNotice(
        `${officer.fullName} was ${next === 'suspended' ? 'suspended' : 'reactivated'}.`,
      )
    } catch {
      setActionError(
        'Could not change the officer status. Please try again.',
      )
    }
  }

  async function performReset(officer: Officer) {
    setNotice('')
    setActionError('')

    try {
      await resetOfficer(organization, officer.id)

      setNotice(
        `Reset instructions were sent to ${maskPhone(officer.phone)}.`,
      )
    } catch {
      setActionError('Could not reset the officer. Please try again.')
    }
  }

  const officerColumns: Column<Officer>[] = [
    { header: 'Name', cell: (o) => o.fullName },
    { header: 'Username', cell: (o) => o.username },
    { header: 'Phone', cell: (o) => o.phone },
    {
      header: 'Status',
      cell: (o) => (
        <Badge
          variant="outline"
          className={
            o.status === 'active'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-red-300 bg-red-50 text-red-800'
          }
        >
          {o.status === 'active' ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      header: 'Last login',
      cell: (o) =>
        o.lastLoginAt
          ? new Date(o.lastLoginAt).toLocaleString()
          : 'Never',
    },
    {
      header: 'Actions',
      cell: (o) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPending({ kind: 'toggle', officer: o })
            }
          >
            {o.status === 'active' ? 'Suspend' : 'Reactivate'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setPending({ kind: 'reset', officer: o })
            }
          >
            Reset
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return <p className="text-slate-500">Loading...</p>
  }

  const countOf = (...statuses: CaseStatus[]) =>
    cases.filter((c) => statuses.includes(c.status)).length

  const statusRows: StatusRow[] = CASE_STATUSES.map((status) => ({
    status,
    count: countOf(status),
  }))

  const activeOfficers = officers.filter(
    (o) => o.status === 'active',
  ).length

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Organization administration
        </h1>
        <p className="mt-1 text-sm text-slate-600">{organization}</p>
      </div>

      {notice && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {actionError}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Organization activity
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total cases" value={cases.length} />

          <StatCard
            label="Waiting on INSA"
            value={countOf('submitted', 'under_review')}
          />

          <StatCard
            label="Needs your reply"
            value={countOf('needs_clarification')}
          />

          <StatCard
            label="Broadcast"
            value={countOf('broadcast')}
          />

          <StatCard
            label="Active officers"
            value={activeOfficers}
          />

          <StatCard
            label="Suspended officers"
            value={officers.length - activeOfficers}
          />
        </div>

        <div className="max-w-sm">
          <DataTable
            columns={statusColumns}
            rows={statusRows}
            getRowId={(r) => r.status}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Officers
          </h2>

          {!showForm && (
            <Button
              onClick={() => {
                setNotice('')
                setShowForm(true)
              }}
            >
              Add officer
            </Button>
          )}
        </div>

        {showForm && (
          <OfficerForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        )}

        <DataTable
          columns={officerColumns}
          rows={officers}
          getRowId={(o) => o.id}
          emptyMessage="No officers yet."
        />
      </section>

      {pending && (
        <StepUpDialog
          title={
            pending.kind === 'reset'
              ? `Reset ${pending.officer.fullName}`
              : `${pending.officer.status === 'active' ? 'Suspend' : 'Reactivate'} ${pending.officer.fullName}`
          }
          description={
            pending.kind === 'reset'
              ? 'This resets their password and two-factor setup. Enter your verification code to confirm.'
              : 'Enter your verification code to confirm this change.'
          }
          confirmLabel={
            pending.kind === 'reset'
              ? 'Reset officer'
              : pending.officer.status === 'active'
                ? 'Suspend'
                : 'Reactivate'
          }
          onCancel={() => setPending(null)}
          onVerified={async () => {
            const action = pending
            setPending(null)

            if (action.kind === 'toggle') {
              await performToggle(action.officer)
            } else {
              await performReset(action.officer)
            }
          }}
        />
      )}
    </div>
  )
}
