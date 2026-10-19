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

const selectClass =
  'h-9 w-full rounded-md border border-[#1b2e34] bg-[#0c1417] px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500'

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
      className="max-w-xl space-y-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm"
    >
      <h3 className="text-base font-bold text-white">
        Add staff account
      </h3>
      <div className="space-y-2">
        <Label htmlFor="staff-name" className="text-xs text-slate-300">Full name</Label>
        <Input
          id="staff-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-username" className="text-xs text-slate-300">Username</Label>
        <Input
          id="staff-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100 font-mono text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-phone" className="text-xs text-slate-300">Mobile phone</Label>
        <Input
          id="staff-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="+251911000001"
          className="border-[#1b2e34] bg-[#0c1417] text-slate-100 font-mono text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-role" className="text-xs text-slate-300">Role</Label>
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
        <Label htmlFor="staff-org" className="text-xs text-slate-300">Organization</Label>
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
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      <p className="text-xs text-slate-400">
        The person receives an invitation by SMS to set their own password.
      </p>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-500 text-white text-xs">
          {busy ? 'Adding...' : 'Add account'}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="text-xs border-[#1b2e34] text-slate-300 hover:text-white">
          Cancel
        </Button>
      </div>
    </form>
  )
}