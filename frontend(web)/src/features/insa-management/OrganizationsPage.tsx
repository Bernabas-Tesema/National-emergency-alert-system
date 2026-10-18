import { useEffect, useState } from 'react'
import {
  AdminError,
  createOrganization,
  fetchOrganizations,
  setOrganizationStatus,
} from '@/api/mockAdmin'
import AccountStatusBadge from '@/components/AccountStatusBadge'
import DataTable, { type Column } from '@/components/DataTable'
import StepUpDialog from '@/components/StepUpDialog'
import { Button } from '@/components/ui/button'
import {
  ORGANIZATION_KIND_LABELS,
  type AccountStatus,
  type NewOrganizationInput,
  type Organization,
} from '@/types/admin'
import OrganizationForm from './OrganizationForm'

interface PendingStep {
  title: string
  description: string
  confirmLabel: string
  run: () => Promise<void>
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [pending, setPending] = useState<PendingStep | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOrganizations().then((data) => {
      if (!cancelled) {
        setOrganizations(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(input: NewOrganizationInput) {
    // Errors are left to the form, which shows its own message.
    const created = await createOrganization(input)
    setOrganizations((prev) => [...prev, created])
    setShowForm(false)
    setActionError('')
    setNotice(`${created.name} was registered.`)
  }

  function requestStatusChange(org: Organization) {
    const next: AccountStatus = org.status === 'active' ? 'suspended' : 'active'
    const verb = next === 'suspended' ? 'Suspend' : 'Reactivate'
    setNotice('')
    setActionError('')
    setPending({
      title: `${verb} ${org.name}`,
      description:
        next === 'suspended'
          ? 'Its staff will no longer be able to sign in. Enter your verification code to confirm.'
          : 'Its staff will be able to sign in again. Enter your verification code to confirm.',
      confirmLabel: verb,
      run: async () => {
        try {
          await setOrganizationStatus(org.id, next)
          setOrganizations((prev) =>
            prev.map((o) => (o.id === org.id ? { ...o, status: next } : o)),
          )
          setNotice(
            `${org.name} was ${next === 'suspended' ? 'suspended' : 'reactivated'}.`,
          )
        } catch (err) {
          setActionError(
            err instanceof AdminError
              ? err.message
              : 'Could not change the status. Please try again.',
          )
        }
      },
    })
  }

  const columns: Column<Organization>[] = [
    { header: 'Name', cell: (o) => o.name },
    { header: 'Type', cell: (o) => ORGANIZATION_KIND_LABELS[o.kind] },
    { header: 'Status', cell: (o) => <AccountStatusBadge status={o.status} /> },
    { header: 'Registered', cell: (o) => o.createdAt },
    {
      header: 'Actions',
      cell: (o) =>
        o.kind === 'insa' ? (
          <span className="text-sm text-slate-500">Built in</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestStatusChange(o)}
          >
            {o.status === 'active' ? 'Suspend' : 'Reactivate'}
          </Button>
        ),
    },
  ]

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
        {!showForm && (
          <Button
            onClick={() => {
              setNotice('')
              setShowForm(true)
            }}
          >
            Register organization
          </Button>
        )}
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

      {showForm && (
        <OrganizationForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      <DataTable
        columns={columns}
        rows={organizations}
        getRowId={(o) => o.id}
        emptyMessage="No organizations yet."
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