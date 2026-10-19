import { useEffect, useState } from 'react'
import {
  Users,
  UserPlus,
  CheckCircle2,
} from 'lucide-react'

import {
  addOfficer,
  fetchOfficers,
  resetOfficer,
  setOfficerStatus,
} from '@/api/mockOfficers'
import { DataTable } from '@/packages/ui/DataTable'
import { TwoFactorPrompt } from '@/packages/ui/TwoFactorPrompt'
import { useAuth } from '@/features/auth/useAuth'
import { maskPhone } from '@/lib/phone'
import type { NewOfficerInput, Officer, OfficerStatus } from '@/types/officer'
import OfficerForm from './OfficerForm'

type PendingAction = { kind: 'toggle' | 'reset'; officer: Officer }

export default function OrgAdminPage() {
  const { user } = useAuth()
  const organization = user?.organization ?? 'Emergency Authority'

  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOfficers(organization).then((loadedOfficers) => {
      if (!cancelled) {
        setOfficers(loadedOfficers)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [organization])

  async function handleAdd(input: NewOfficerInput) {
    const officer = await addOfficer(organization, input)
    setOfficers((prev) => [...prev, officer])
    setShowForm(false)
    setNotice(`${officer.fullName} was enrolled. Invitation SMS sent to ${maskPhone(officer.phone)}.`)
  }

  async function performToggle(officer: Officer) {
    const next: OfficerStatus = officer.status === 'active' ? 'suspended' : 'active'
    await setOfficerStatus(organization, officer.id, next)
    setOfficers((prev) =>
      prev.map((o) => (o.id === officer.id ? { ...o, status: next } : o)),
    )
    setNotice(`${officer.fullName} is now ${next}.`)
  }

  async function performReset(officer: Officer) {
    await resetOfficer(organization, officer.id)
    setNotice(`Password reset instructions sent to ${maskPhone(officer.phone)}.`)
  }

  const columns = [
    {
      accessorKey: 'fullName',
      header: 'Officer Name',
      cell: ({ row }: any) => (
        <div>
          <span className="font-semibold text-slate-200 block">{row.original.fullName}</span>
          <span className="text-[11px] text-slate-400 font-mono">@{row.original.username}</span>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone Contact',
      cell: ({ row }: any) => (
        <span className="font-mono text-slate-300 text-xs">{maskPhone(row.original.phone)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            row.original.status === 'active'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : 'bg-red-950/80 text-red-300 border-red-800'
          }`}
        >
          {row.original.status === 'active' ? 'Active' : 'Suspended'}
        </span>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last Signed In',
      cell: ({ row }: any) => (
        <span className="text-slate-400 text-xs font-mono">
          {row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Security Controls',
      cell: ({ row }: any) => {
        const off = row.original
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPending({ kind: 'toggle', officer: off })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                off.status === 'active'
                  ? 'border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/60'
                  : 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              {off.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
            <button
              onClick={() => setPending({ kind: 'reset', officer: off })}
              className="px-2.5 py-1 rounded text-xs font-medium border border-[#1b2e34] bg-[#162327] text-slate-300 hover:text-white hover:bg-[#1a2d32]"
              title="Reset password and 2FA credentials"
            >
              Reset 2FA
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <p className="text-[11px] font-semibold text-teal-400 tracking-widest uppercase">
            {organization}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            Organization administration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage field officers, operational statuses, and 2FA credentials.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-500 shadow-sm transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showForm ? 'Cancel' : 'Enroll Officer'}</span>
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg bg-teal-950/60 border border-teal-800/80 p-3 text-xs text-teal-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-teal-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Enroll Form Modal / Collapsible Section */}
      {showForm && (
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-3">
            New Officer Credentials
          </h4>
          <OfficerForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Registered Officers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Registered Field Officers ({officers.length})
            </h3>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={officers}
          loading={loading}
          searchPlaceholder="Search officers by name or username..."
        />
      </div>

      {/* 2FA Verification Step-up Prompt for Sensitive Officer Changes */}
      <TwoFactorPrompt
        isOpen={Boolean(pending)}
        title={
          pending?.kind === 'toggle'
            ? `Confirm Account ${pending.officer.status === 'active' ? 'Suspension' : 'Activation'}`
            : 'Confirm 2FA Credential Reset'
        }
        description={`Authorizing change for officer @${pending?.officer.username}. Enter your 6-digit verification code to proceed.`}
        onVerify={async (code) => {
          if (code === '123456') {
            if (pending?.kind === 'toggle') {
              await performToggle(pending.officer)
            } else if (pending?.kind === 'reset') {
              await performReset(pending.officer)
            }
            setPending(null)
            return true
          }
          return false
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}

