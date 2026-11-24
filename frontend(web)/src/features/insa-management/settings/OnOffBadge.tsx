import { Badge } from '@/components/ui/badge'

export default function OnOffBadge({ on }: { on: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        on
          ? 'border-green-300 bg-green-50 text-green-800'
          : 'border-slate-300 bg-slate-100 text-slate-600'
      }
    >
      {on ? 'On' : 'Off'}
    </Badge>
  )
}