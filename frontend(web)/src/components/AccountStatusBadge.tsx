import { Badge } from '@/components/ui/badge'
import type { AccountStatus } from '@/types/admin'

export default function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge
      variant="outline"
      className={
        status === 'active'
          ? 'border-green-300 bg-green-50 text-green-800'
          : 'border-red-300 bg-red-50 text-red-800'
      }
    >
      {status === 'active' ? 'Active' : 'Suspended'}
    </Badge>
  )
}