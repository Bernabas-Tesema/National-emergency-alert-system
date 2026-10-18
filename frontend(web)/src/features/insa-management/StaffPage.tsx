import { useEffect, useState } from 'react'
import {
  AdminError,
  changeStaffRole,
  createStaff,
  fetchOrganizations,
  fetchStaff,
  resetStaff,
  setStaffStatus,
} from '@/api/mockAdmin'
import AccountStatusBadge from '@/components/AccountStatusBadge'
import DataTable, { type Column } from '@/components/DataTable'
import StepUpDialog from '@/components/StepUpDialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { maskPhone } from '@/lib/phone'
import { ASSIGNABLE_ROLES, organizationFitsRole } from '@/lib/roleRules'
import type {
  AccountStatus,
  NewStaffInput,
  Organization,
  StaffAccount,
} from '@/types/admin'
import { ROLE_LABELS, type Role } from '@/types/role'
import StaffForm from './StaffForm'

interface PendingStep {
  title: string
  description: string
  confirmLabel: string
  run: () => Promise<void>
}

function messageFrom(err: unknown): string {
  return err instanceof AdminError
    ? err.message
    : 'Something went wrong. Please try again.'
}

export default function StaffPage() {
  const { user } = useAuth()
  const myId = user?.id ?? ''
  const [staff, setStaff] = useState<StaffAccount[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [pending, setPending] = useState<PendingStep | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchStaff(), fetchOrganizations()]).then(([s, o]) => {
      if (!cancelled) {
        setStaff(s)
        setOrganizations(o)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const orgById = new Map(organizations.map((o) => [o.id, o]))

  function askStepUp(step: PendingStep) {
    setNotice('')
    setActionError('')
    setPending(step)
  }

  async function handleCreate(input: NewStaffInput) {
    // Errors are left to the form, which shows its own message.
    const account = await createStaff(input)
    setStaff((prev) => [...prev, account])
    setShowForm(false)
    setActionError('')
    setNotice(
      `${account.fullName} was added. An invitation was sent to ${maskPhone(account.phone)}.`,
    )
  }

  function requestStatusChange(account: StaffAccount) {
    const next: AccountStatus =
      account.status === 'active' ? 'suspended' : 'active'
    const verb = next === 'suspended' ? 'Suspend' : 'Reactivate'
    askStepUp({
      title: `${verb} ${account.fullName}`,
      description:
        next === 'suspended'
          ? 'They will be blocked from signing in. Enter your verification code to confirm.'
          : 'They will be able to sign in again. Enter your verification code to confirm.',
      confirmLabel: verb,
      run: async () => {
        try {
          await setStaffStatus(myId, account.id, next)
          setStaff((prev) =>
            prev.map((s) => (s.id === account.id ? { ...s, status: next } : s)),
          )
          setNotice(
            `${account.fullName} was ${next === 'suspended' ? 'suspended' : 'reactivated'}.`,
          )
        } catch (err) {
          setActionError(messageFrom(err))
        }
      },
    })
  }

  function requestReset(account: StaffAccount) {
    askStepUp({
      title: `Reset ${account.fullName}`,
      description:
        'This resets their password and two-factor setup. Enter your verification code to confirm.',
      confirmLabel: 'Reset account',
      run: async () => {
        try {
          await resetStaff(myId, account.id)
          setNotice(`Reset instructions were sent to ${maskPhone(account.phone)}.`)
        } catch (err) {
          setActionError(messageFrom(err))
        }
      },
    })
  }

  function requestRoleChange(account: StaffAccount, role: Role) {
    if (role === account.role) return
    askStepUp({
      title: `Change role for ${account.fullName}`,
      description: `Change from ${ROLE_LABELS[account.role]} to ${ROLE_LABELS[role]}. Enter your verification code to confirm.`,
      confirmLabel: 'Change role',
      run: async () => {
        try {
          await changeStaffRole(myId, account.id, role)
          setStaff((prev) =>
            prev.map((s) => (s.id === account.id ? { ...s, role } : s)),
          )
          setNotice(`${account.fullName} is now ${ROLE_LABELS[role]}.`)
        } catch (err) {
          setActionError(messageFrom(err))
        }
      },
    })
  }

  const columns: Column<StaffAccount>[] = [
    { header: 'Name', cell: (s) => s.fullName },
    { header: 'Username', cell: (s) => s.username },
    {
      header: 'Role',
      cell: (s) => {
        const org = orgById.get(s.organizationId)
        const options = ASSIGNABLE_ROLES.filter(
          (r) => org && organizationFitsRole(org.kind, r),
        )
        return (
          <select
            aria-label={`Role for ${s.fullName}`}
            className="h-8 rounded-md border border-[#1b2e34] bg-[#0c1417] px-2 text-xs text-slate-200 disabled:opacity-50 focus:outline-none focus:border-teal-500"
            value={s.role}
            disabled={s.id === myId}
            onChange={(e) => requestRoleChange(s, e.target.value as Role)}
          >
            {options.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        )
      },
    },
    {
      header: 'Organization',
      cell: (s) => orgById.get(s.organizationId)?.name ?? 'Unknown',
    },
    { header: 'Status', cell: (s) => <AccountStatusBadge status={s.status} /> },
    {
      header: 'Last login',
      cell: (s) =>
        s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : 'Never',
    },
    {
      header: 'Actions',
      cell: (s) =>
        s.id === myId ? (
          <span className="text-sm text-slate-500">This is you</span>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestStatusChange(s)}
            >
              {s.status === 'active' ? 'Suspend' : 'Reactivate'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => requestReset(s)}>
              Reset
            </Button>
          </div>
        ),
    },
  ]

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2e34] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Staff accounts</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage INSA control centre operators and partner organization emergency officers.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => {
              setNotice('')
              setShowForm(true)
            }}
            className="bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-sm text-xs"
          >
            Add staff account
          </Button>
        )}
      </div>

      {notice && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-4 py-3 text-xs text-emerald-300 font-medium">
          {notice}
        </p>
      )}
      {actionError && (
        <p className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-xs text-red-300 font-medium">
          {actionError}
        </p>
      )}

      {showForm && (
        <StaffForm
          organizations={organizations}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      <DataTable
        columns={columns}
        rows={staff}
        getRowId={(s) => s.id}
        emptyMessage="No staff accounts yet."
      />

      {pending && (
        <StepUpDialog
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          onCancel={() => setPending(null)}
          onVerified={async () => {
            const step = pending
            setPending(null)
            await step.run()
          }}
        />
      )}
    </div>
  )
}