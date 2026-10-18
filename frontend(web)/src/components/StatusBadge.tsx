import { Badge } from '@/components/ui/badge'
import { CASE_STATUS_LABELS, type CaseStatus } from '@/types/case'

// One place decides the colour of every status, so the whole app stays consistent.
// (Tailwind needs full class names written out, so we don't build them from pieces.)
const STATUS_STYLES: Record<CaseStatus, string> = {
  draft: 'border-slate-300 bg-slate-100 text-slate-700',
  submitted: 'border-blue-300 bg-blue-50 text-blue-800',
  under_review: 'border-amber-300 bg-amber-50 text-amber-800',
  needs_clarification: 'border-orange-300 bg-orange-50 text-orange-800',
  verified: 'border-teal-300 bg-teal-50 text-teal-800',
  approved: 'border-green-300 bg-green-50 text-green-800',
  broadcast: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  rejected: 'border-red-300 bg-red-50 text-red-800',
}

export default function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {CASE_STATUS_LABELS[status]}
    </Badge>
  )
}