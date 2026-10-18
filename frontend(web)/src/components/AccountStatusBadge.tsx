import type { AccountStatus } from '@/types/admin'

export default function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        status === 'active'
          ? 'border-emerald-800 bg-emerald-950/80 text-emerald-300'
          : 'border-red-800 bg-red-950/80 text-red-300'
      }`}
    >
      {status === 'active' ? 'Active' : 'Suspended'}
    </span>
  )
}