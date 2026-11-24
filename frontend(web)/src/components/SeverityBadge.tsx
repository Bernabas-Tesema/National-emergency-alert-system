import { Badge } from '@/components/ui/badge'
import { SEVERITY_LABELS, type Severity } from '@/types/case'

// Severity uses SOLID colours, while case statuses use light fills with a
// border (see StatusBadge). That way "High" never looks like "Needs
// clarification" even though both use orange. Always keep the text label:
// colour alone is not enough for colour-blind users.
const SEVERITY_STYLES: Record<Severity, string> = {
  LOW: 'border-transparent bg-sky-600 text-white',
  MEDIUM: 'border-transparent bg-yellow-400 text-slate-900',
  HIGH: 'border-transparent bg-orange-600 text-white',
  CRITICAL: 'border-transparent bg-red-700 text-white',
}

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge className={SEVERITY_STYLES[severity]}>{SEVERITY_LABELS[severity]}</Badge>
}