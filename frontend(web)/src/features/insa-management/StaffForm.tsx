import { useState, type FormEvent } from 'react'
import { AdminError } from '@/api/mockAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ASSIGNABLE_ROLES, organizationFitsRole } from '@/lib/roleRules'
import type { NewStaffInput, Organization } from '@/types/admin'
import { ROLE_LABELS, type Role } from '@/types/role'

interface StaffFormProps {
  organizations: Organization[]
  onSubmit: (input: NewStaffInput) => Promise<void>
  onCancel: () => void
}

const selectClass = 'h-9 w-full rounded-md border bg-white px-3 text-sm'

export default function StaffForm({
  organizations,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [organizationId, setOrganizationId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Only offer organizations that can hold the chosen role.
  const organizationOptions = organizations.filter(
    (o) => role !== '' && o.status === 'active' && organizationFitsRole(o.kind, role),
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (
      !fullName.trim() ||
      !username.trim() ||
      !phone.trim() ||
      !role ||
      !organizationId
    ) {
      setError('Fill in every field.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        fullName: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        role,
        organizationId,
      })
      // On success the parent hides this form.
    } catch (err) {
      setError(
        err instanceof AdminError
          ? err.message
          : 'Could not add the account. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow"
    >
      <h3 className="text-base font-semibold text-slate-900">
        Add staff account
      </h3>
      <div className="space-y-2">
        <Label htmlFor="staff-name">Full name</Label>
        <Input
          id="staff-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-username">Username</Label>
        <Input
          id="staff-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-phone">Mobile phone</Label>
        <Input
          id="staff-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="+251911000001"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-role">Role</Label>
        <select
          id="staff-role"
          className={selectClass}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | '')
            setOrganizationId('') // the old choice may not fit the new role
          }}
        >
          <option value="">Select a role</option>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-org">Organization</Label>
        <select
          id="staff-org"
          className={selectClass}
          value={organizationId}
          disabled={!role}
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          <option value="">
            {role ? 'Select an organization' : 'Choose a role first'}
          </option>
          {organizationOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">
        The person receives an invitation by SMS to set their own password.
      </p>
      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Adding...' : 'Add account'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}