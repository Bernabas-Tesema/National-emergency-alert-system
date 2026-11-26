import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  Search,
  FileText,
  Radio,
  Siren,
  Users,
  Shield,
  LayoutDashboard,
  FileCheck,
  Building2,
  Package,
  BarChart2,
  ArrowRight,
  ExternalLink,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { canonicalRole } from '@/packages/core/permissions/matrix'

interface SearchItem {
  id: string
  title: string
  category: 'Pages' | 'Actions' | 'SOS & Incidents'
  description?: string
  path?: string
  action?: () => void
  icon: any
  roles?: string[]
}

export interface GlobalSearchDialogProps {
  open: boolean
  onClose: () => void
}

export default function GlobalSearchDialog({ open, onClose }: GlobalSearchDialogProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const normRole = user ? canonicalRole(user.role) : ''

  const allItems: SearchItem[] = useMemo(() => {
    return [
      // Navigation Pages
      {
        id: 'nav-insa-dash',
        title: 'Command Dashboard',
        category: 'Pages',
        description: 'National threat telemetry and command center overview',
        path: '/insa/dashboard',
        icon: LayoutDashboard,
        roles: ['ADMINISTRATOR', 'HIGHER_OFFICER'],
      },
      {
        id: 'nav-res-dash',
        title: 'Organization Dashboard',
        category: 'Pages',
        description: 'Partner organization incident metrics and active reports',
        path: '/resource/dashboard',
        icon: LayoutDashboard,
        roles: ['ORG_ADMIN', 'ORG_OFFICER'],
      },
      {
        id: 'nav-cases',
        title: 'Incident Cases Queue',
        category: 'Pages',
        description: 'Review submitted disaster cases and verified incident reports',
        path: '/insa/cases',
        icon: FileText,
        roles: ['ADMINISTRATOR', 'HIGHER_OFFICER', 'AUDITOR'],
      },
      {
        id: 'nav-new-case',
        title: 'Submit New Incident',
        category: 'Pages',
        description: 'Report a new disaster or hazard area to Ethio Alert',
        path: '/resource/cases/new',
        icon: FileText,
        roles: ['ORG_ADMIN', 'ORG_OFFICER'],
      },
      {
        id: 'nav-alerts',
        title: 'Alert Composer',
        category: 'Pages',
        description: 'Draft bilingual emergency broadcast alerts for public delivery',
        path: '/insa/alerts',
        icon: Radio,
        roles: ['ADMINISTRATOR'],
      },
      {
        id: 'nav-approvals',
        title: 'Tier-2 Approvals Queue',
        category: 'Pages',
        description: 'Authorize or reject pending national public alert broadcasts',
        path: '/insa/approvals',
        icon: FileCheck,
        roles: ['HIGHER_OFFICER'],
      },
      {
        id: 'nav-sos-ops',
        title: 'SOS Operations Console',
        category: 'Pages',
        description: 'Live citizen distress tickets, dispatch assignment & unmasking',
        path: '/insa/sos',
        icon: Siren,
        roles: ['DISPATCHER', 'ADMINISTRATOR', 'HIGHER_OFFICER', 'AUDITOR'],
      },
      {
        id: 'nav-org-sos',
        title: 'Organization SOS Inbox',
        category: 'Pages',
        description: 'Triage citizen SOS distress cases assigned to your agency',
        path: '/resource/sos',
        icon: Siren,
        roles: ['ORG_ADMIN', 'ORG_OFFICER'],
      },
      {
        id: 'nav-staff',
        title: 'Staff Accounts',
        category: 'Pages',
        description: 'Manage staff credentials, operational roles, and access status',
        path: '/insa/staff',
        icon: Users,
        roles: ['ADMINISTRATOR'],
      },
      {
        id: 'nav-orgs',
        title: 'Partner Organizations',
        category: 'Pages',
        description: 'Registered emergency response agencies and authority contacts',
        path: '/insa/organizations',
        icon: Building2,
        roles: ['ADMINISTRATOR'],
      },
      {
        id: 'nav-audit',
        title: 'Security Audit Log',
        category: 'Pages',
        description: 'Immutable ledger of system logins, dispatches, and role actions',
        path: '/insa/audit',
        icon: Shield,
        roles: ['AUDITOR', 'HIGHER_OFFICER', 'ADMINISTRATOR'],
      },
      {
        id: 'nav-reports',
        title: 'Reports & Analytics',
        category: 'Pages',
        description: 'Incident severity breakdowns, delivery ratios, and statistics',
        path: '/insa/reports',
        icon: BarChart2,
        roles: ['ADMINISTRATOR', 'AUDITOR', 'HIGHER_OFFICER'],
      },
      {
        id: 'nav-settings',
        title: 'System Settings',
        category: 'Pages',
        description: 'Broadcast gateways, simulation controls, and API parameters',
        path: '/insa/settings',
        icon: Package,
        roles: ['ADMINISTRATOR'],
      },

      // SOS & Incident Queries
      {
        id: 'item-sos-901',
        title: 'SOS-901: Trapped on 2nd Floor (Kirkos)',
        category: 'SOS & Incidents',
        description: 'Flash flood distress report · Addis Ababa',
        path: normRole === 'ORG_OFFICER' || normRole === 'ORG_ADMIN' ? '/resource/sos' : '/insa/sos',
        icon: Siren,
      },
      {
        id: 'item-sos-fire',
        title: 'Fire & Rescue Distress Incidents',
        category: 'SOS & Incidents',
        description: 'Active structure fire and gas explosion reports',
        path: normRole === 'ORG_OFFICER' || normRole === 'ORG_ADMIN' ? '/resource/sos' : '/insa/sos',
        icon: Siren,
      },
      {
        id: 'item-sos-flood',
        title: 'Flood & Flash Surge Alerts',
        category: 'SOS & Incidents',
        description: 'Water surge and drainage blockage reports',
        path: normRole === 'ORG_OFFICER' || normRole === 'ORG_ADMIN' ? '/resource/sos' : '/insa/sos',
        icon: Siren,
      },

      // Quick Actions
      {
        id: 'act-public-portal',
        title: 'Open Citizen SOS Portal',
        category: 'Actions',
        description: 'Open public emergency distress submission page in new tab',
        action: () => window.open('/sos', '_blank'),
        icon: ExternalLink,
      },
      {
        id: 'act-track-sos',
        title: 'Track Citizen SOS Report',
        category: 'Actions',
        description: 'Check status of an emergency report by tracking code',
        action: () => window.open('/sos/track', '_blank'),
        icon: ExternalLink,
      },
      {
        id: 'act-logout',
        title: 'Sign Out',
        category: 'Actions',
        description: 'Securely sign out of current operations session',
        action: () => {
          logout()
          navigate('/login', { replace: true })
        },
        icon: Shield,
      },
    ]
  }, [normRole, logout, navigate])

  // Filter items by role and query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allItems.filter((item) => {
      // Check role eligibility if specified
      if (item.roles && normRole && !item.roles.includes(normRole)) {
        return false
      }
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      )
    })
  }, [allItems, normRole, query])

  // Auto focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function handleSelect(item: SearchItem) {
    onClose()
    if (item.action) {
      item.action()
    } else if (item.path) {
      navigate(item.path)
    }
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#1b2e34] bg-[#0c1417] shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-[#1b2e34] px-4 py-3.5 bg-[#0e191d]">
          <Search className="h-5 w-5 text-teal-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cases, alerts, staff, pages, or SOS..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="rounded-md border border-[#1b2e34] bg-[#162327] px-2 py-0.5 text-[10px] font-mono text-slate-400">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No results found for &ldquo;<span className="text-slate-300">{query}</span>&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon
              const isSelected = index === selectedIndex

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-[#153439] text-white'
                      : 'text-slate-300 hover:bg-[#111e22]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-[#162529] text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-slate-100">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-md bg-[#162529] border border-[#1b2e34] px-2 py-0.5 text-[10px] font-medium text-teal-300 uppercase tracking-wide">
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform ${
                        isSelected ? 'text-teal-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="border-t border-[#1b2e34] bg-[#091013] px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#1b2e34] bg-[#121c20] px-1 py-0.5 font-mono text-[9px] text-slate-400">
                ↑
              </kbd>
              <kbd className="rounded border border-[#1b2e34] bg-[#121c20] px-1 py-0.5 font-mono text-[9px] text-slate-400">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#1b2e34] bg-[#121c20] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                ↵
              </kbd>{' '}
              Select
            </span>
          </div>
          <span>Ethio Alert National Safety Operations</span>
        </div>
      </div>
    </div>
  )
}
