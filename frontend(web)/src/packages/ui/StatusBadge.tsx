import React from 'react'
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  Radio,
  XCircle,
  HelpCircle,
  FileText,
  Send,
  UserCheck,
  ShieldAlert,
} from 'lucide-react'

export type StatusCategory = 'case' | 'alert' | 'delivery' | 'sos' | 'severity'

export interface StatusBadgeProps {
  value: string
  category?: StatusCategory
  className?: string
  size?: 'sm' | 'md'
}

interface StatusConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Severity
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    className: 'bg-[#3b1418] text-red-300 border-red-800/80',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    className: 'bg-[#3d2614] text-orange-300 border-orange-800/80',
  },
  medium: {
    label: 'Medium',
    icon: AlertCircle,
    className: 'bg-[#3b3014] text-amber-300 border-amber-800/80',
  },
  low: {
    label: 'Low',
    icon: Info,
    className: 'bg-[#133832] text-emerald-300 border-emerald-800/80',
  },

  // Case Statuses
  draft: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-slate-900/80 text-slate-300 border-slate-700',
  },
  submitted: {
    label: 'Submitted',
    icon: Send,
    className: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
  },
  under_review: {
    label: 'Under Review',
    icon: Clock,
    className: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
  },
  needs_clarification: {
    label: 'Needs Clarification',
    icon: HelpCircle,
    className: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
  },
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    className: 'bg-teal-950/80 text-teal-300 border-teal-800/80',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    className: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
  },
  broadcast: {
    label: 'Broadcast',
    icon: Radio,
    className: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-950/80 text-red-300 border-red-800/80',
  },

  // Alert Statuses
  pending_approval: {
    label: 'Pending Approval',
    icon: Clock,
    className: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
  },
  broadcasting: {
    label: 'Broadcasting',
    icon: Radio,
    className: 'bg-blue-950/80 text-blue-300 border-blue-800/80 animate-pulse',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    className: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-slate-900/80 text-slate-400 border-slate-700',
  },

  // SOS Statuses
  new: {
    label: 'New SOS',
    icon: ShieldAlert,
    className: 'bg-red-950/80 text-red-300 border-red-800/80 animate-pulse',
  },
  assigned: {
    label: 'Assigned',
    icon: UserCheck,
    className: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    className: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
  },

  // Delivery status
  queued: {
    label: 'Queued',
    icon: Clock,
    className: 'bg-slate-900/80 text-slate-300 border-slate-700',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    className: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-950/80 text-red-300 border-red-800/80',
  },
}

export function StatusBadge({ value, className = '', size = 'md' }: StatusBadgeProps) {
  const normKey = (value ?? '').trim().toLowerCase().replace(/[\s-]/g, '_')
  const config = STATUS_MAP[normKey] || {
    label: value || 'Unknown',
    icon: Info,
    className: 'bg-slate-800 text-slate-300 border-slate-700',
  }

  const Icon = config.icon
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-sm ${config.className} ${sizeClasses} ${className}`}
      role="status"
    >
      <Icon className={`${iconSize} shrink-0`} />
      <span>{config.label}</span>
    </span>
  )
}

export default StatusBadge
