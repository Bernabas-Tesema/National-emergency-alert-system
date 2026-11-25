import { useState, type FormEvent } from 'react'
import { Mail, Phone, User, ShieldCheck } from 'lucide-react'
import { AdminError } from '@/api/mockAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ORGANIZATION_KINDS,
  ORGANIZATION_KIND_LABELS,
  type ExternalKind,
  type NewOrganizationInput,
} from '@/types/admin'

const KINDS = ORGANIZATION_KINDS.filter((k): k is ExternalKind => k !== 'insa')

interface OrganizationFormProps {
  onSubmit: (input: NewOrganizationInput) => Promise<void>
  onCancel: () => void
}

export default function OrganizationForm({
  onSubmit,
  onCancel,
}: OrganizationFormProps) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ExternalKind | ''>('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [adminFullName, setAdminFullName] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !kind) {
      setError('Enter an organization name and choose a type.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid official email address to receive initial credentials.')
      return
    }
    if (!phone.trim() || phone.length < 7) {
      setError('Enter an official contact phone number (e.g. +251 91 100 0000).')
      return
    }
    if (!adminFullName.trim()) {
      setError('Enter the full name of the organization lead administrator.')
      return
    }

    setError('')
    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        kind,
        email: email.trim(),
        phone: phone.trim(),
        adminFullName: adminFullName.trim(),
        adminUsername: adminUsername.trim() || undefined,
      })
      // On success the parent hides this form.
    } catch (err) {
      setError(
        err instanceof AdminError
          ? err.message
          : 'Could not register the organization. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 shadow-sm"
    >
      <div>
        <h3 className="text-base font-bold text-white">
          Register Partner Organization
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Enter organization information and lead administrator contact. Initial login credentials will be emailed automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="org-name" className="text-xs text-slate-300">
            Organization Name <span className="text-teal-400">*</span>
          </Label>
          <Input
            id="org-name"
            placeholder="e.g. Hawassa Fire & Rescue"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-[#1b2e34] bg-[#0c1417] text-slate-100 placeholder:text-slate-500"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-kind" className="text-xs text-slate-300">
            Organization Type <span className="text-teal-400">*</span>
          </Label>
          <select
            id="org-kind"
            className="h-9 w-full rounded-md border border-[#1b2e34] bg-[#0c1417] px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            value={kind}
            onChange={(e) => setKind(e.target.value as ExternalKind | '')}
            required
          >
            <option value="">Select a type</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {ORGANIZATION_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-teal-800/40 bg-[#0a1e22]/50 p-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Initial Administrator & Credentials Recipient</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="org-email" className="text-xs text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-400" />
              Official Email <span className="text-teal-400">*</span>
            </Label>
            <Input
              id="org-email"
              type="email"
              placeholder="e.g. contact@agency.gov.et"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-[#1b2e34] bg-[#0c1417] text-slate-100 placeholder:text-slate-500"
              required
            />
            <p className="text-[10px] text-teal-300/80">
              Initial credentials & password setup link sent here.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-phone" className="text-xs text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-400" />
              Official Phone <span className="text-teal-400">*</span>
            </Label>
            <Input
              id="org-phone"
              type="tel"
              placeholder="+251 91 100 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border-[#1b2e34] bg-[#0c1417] text-slate-100 placeholder:text-slate-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="admin-name" className="text-xs text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-400" />
              Admin Full Name <span className="text-teal-400">*</span>
            </Label>
            <Input
              id="admin-name"
              placeholder="e.g. Abebe Kebede"
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              className="border-[#1b2e34] bg-[#0c1417] text-slate-100 placeholder:text-slate-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-username" className="text-xs text-slate-300">
              Admin Username <span className="text-slate-500">(Optional)</span>
            </Label>
            <Input
              id="admin-username"
              placeholder="e.g. hawassa_admin"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="border-[#1b2e34] bg-[#0c1417] text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={busy}
          className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
        >
          {busy ? 'Registering & Sending Credentials...' : 'Register & Send Credentials'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
          className="text-xs border-[#1b2e34] text-slate-300 hover:text-white"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}