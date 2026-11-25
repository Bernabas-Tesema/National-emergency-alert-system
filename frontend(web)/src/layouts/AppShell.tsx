import { useMemo, useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  Radio,
  FileText,
  Users,
  Package,
  Siren,
  BarChart2,
  FileCheck,
  LogOut,
  Building2,
  PanelLeftClose,
  PanelLeft,
  Shield,
  Menu,
  X,
  Search,
  Bell,
  CalendarDays,
} from 'lucide-react'

import ConnectionIndicator from '@/components/ConnectionIndicator'
import GlobalSearchDialog from '@/components/GlobalSearchDialog'
import EthioAlertAiAssistant from '@/features/ai/EthioAlertAiAssistant'
import ThemeToggle from '@/features/theme/ThemeToggle'
import SessionTimeout from '@/features/auth/SessionTimeout'
import { useAuth } from '@/features/auth/useAuth'
import { ROLE_LABELS, canonicalRole } from '@/packages/core/permissions/matrix'

interface NavigationLink {
  label: string
  path: string
  icon: any
  roles: string[]
}

const ALL_NAV_LINKS: NavigationLink[] = [
  {
    label: 'Dashboard',
    path: '/insa/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMINISTRATOR', 'HIGHER_OFFICER', 'higher_officer'],
  },
  {
    label: 'Dashboard',
    path: '/resource/dashboard',
    icon: LayoutDashboard,
    roles: ['ORG_ADMIN', 'ORG_OFFICER', 'org_admin', 'provider'],
  },
  {
    label: 'Alerts',
    path: '/insa/alerts',
    icon: Radio,
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'Approvals',
    path: '/insa/approvals',
    icon: FileCheck,
    roles: ['HIGHER_OFFICER', 'higher_officer'],
  },
  {
    label: 'Incident Cases',
    path: '/insa/cases',
    icon: FileText,
    roles: [
      'ADMINISTRATOR',
      'ADMINISTRATOR',
      'HIGHER_OFFICER',
      'higher_officer',
      'AUDITOR',
      'auditor',
    ],
  },
  {
    label: 'Submit Incident',
    path: '/resource/cases/new',
    icon: FileText,
    roles: ['ORG_ADMIN', 'ORG_OFFICER', 'org_admin', 'provider'],
  },
  {
    label: 'Case Outcomes',
    path: '/resource/outcomes',
    icon: FileCheck,
    roles: ['ORG_ADMIN', 'ORG_OFFICER', 'org_admin', 'provider'],
  },
  {
    label: 'SOS Inbox',
    path: '/resource/sos',
    icon: Siren,
    roles: ['ORG_ADMIN', 'ORG_OFFICER', 'org_admin', 'provider'],
  },
  {
    label: 'SOS Operations',
    path: '/insa/sos',
    icon: Siren,
    roles: [
      'DISPATCHER',
      'ADMINISTRATOR',
      'HIGHER_OFFICER',
      'AUDITOR',
      'dispatcher',
      'ADMINISTRATOR',
      'higher_officer',
      'auditor',
    ],
  },
  {
    label: 'Staff Accounts',
    path: '/insa/staff',
    icon: Users,
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'Officers',
    path: '/resource/org-admin',
    icon: Users,
    roles: ['ORG_ADMIN', 'org_admin'],
  },
  {
    label: 'Organizations',
    path: '/insa/organizations',
    icon: Building2,
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'System Settings',
    path: '/insa/settings',
    icon: Package,
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'Reports & Analytics',
    path: '/insa/reports',
    icon: BarChart2,
    roles: [
      'ADMINISTRATOR',
      'AUDITOR',
      'HIGHER_OFFICER',
      'ADMINISTRATOR',
      'auditor',
      'higher_officer',
    ],
  },
  {
    label: 'Audit Log',
    path: '/insa/audit',
    icon: Shield,
    roles: ['AUDITOR', 'HIGHER_OFFICER', 'auditor', 'higher_officer'],
  },
]

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Global Ctrl+K / Cmd+K shortcut listener to toggle search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    [],
  )

  if (!user) return null

  const normRole = canonicalRole(user.role)
  const isLimitedDispatcher = normRole === 'DISPATCHER'
  const roleLabel = (normRole ? ROLE_LABELS[normRole] : null) || user.role

  /** Role-aware destination for the Live alert monitor CTA. */
  const liveConsolePath =
    normRole === 'DISPATCHER'
      ? '/insa/sos'
      : normRole === 'HIGHER_OFFICER'
        ? '/insa/approvals'
        : normRole === 'AUDITOR'
          ? '/insa/audit'
          : normRole === 'ORG_ADMIN' || normRole === 'ORG_OFFICER'
            ? '/resource/sos'
            : '/insa/sos'

  const links = ALL_NAV_LINKS.filter((item) => {
    if (isLimitedDispatcher) {
      return item.path === '/insa/sos'
    }
    return item.roles.some((r) => r === normRole || r === user.role)
  })

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function openLiveConsole() {
    setMobileOpen(false)
    navigate(liveConsolePath)
  }

  function NavItems({
    onNavigate,
    compact = false,
  }: {
    onNavigate?: () => void
    compact?: boolean
  }) {
    return (
      <nav className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/75 hover:bg-white/10 hover:text-white'
                } ${compact ? 'justify-center px-2' : ''}`
              }
              title={compact ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!compact && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#0e1619] text-slate-100 font-sans antialiased">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0b292e] text-white shadow-2xl transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/ethioalert-brand.jpg"
              alt="EthioAlert logo"
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-teal-500/40"
            />
            <div>
              <span className="text-base font-bold tracking-tight">
                <span className="text-white">Ethio</span><span className="text-[#2dd4bf]">Alert</span>
              </span>
              <p className="text-[11px] text-teal-100">
                {isLimitedDispatcher ? 'Dispatcher Console' : 'Operations Console'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-teal-100 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-teal-100/80">
            Navigation
          </p>
          <NavItems onNavigate={() => setMobileOpen(false)} compact={false} />
        </div>

        <div className="border-t border-white/15 p-4">
          <div className="rounded-2xl bg-[#0a3a40] p-4 text-white">
            <p className="text-sm font-semibold">Live alert monitor</p>
            <p className="mt-1 text-xs text-teal-100">
              Track broadcasts, SOS tickets, and approval queues in real time.
            </p>
            <button
              type="button"
              onClick={openLiveConsole}
              className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#0d9488]"
            >
              Open console
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col bg-[#0b292e] text-white transition-all duration-200 md:flex ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-4">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img
                src="/ethioalert-brand.jpg"
                alt="EthioAlert logo"
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-teal-500/40 shrink-0"
              />
              <div>
                <span className="text-base font-bold tracking-tight">
                  <span className="text-white">Ethio</span><span className="text-[#2dd4bf]">Alert</span>
                </span>
                <p className="text-[11px] text-teal-100">
                  {isLimitedDispatcher ? 'Dispatcher Console' : 'Delivering safety alerts'}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 text-teal-100 hover:bg-white/10 hover:text-white"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-teal-100/80">
              Navigation
            </p>
          )}
          <NavItems compact={collapsed} />
        </div>

        {!collapsed && (
          <div className="border-t border-white/15 p-4">
            <div className="rounded-2xl bg-[#0a3a40] p-4 text-white">
              <p className="text-sm font-semibold">Live alert monitor</p>
              <p className="mt-1 text-xs text-teal-100">
                Track broadcasts, SOS tickets, and approval queues in real time.
              </p>
              <button
                type="button"
                onClick={openLiveConsole}
                className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#0d9488]"
              >
                Open console
              </button>
            </div>
            <p className="mt-3 text-[10px] text-teal-100/80">INSA Safety Network · v2.4</p>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[#1e3137] bg-[#121c20] px-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[#1e3137] p-1.5 text-slate-400 hover:bg-white/10 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Mobile search trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-lg border border-[#1e3137] p-1.5 text-slate-400 hover:bg-white/10 md:hidden"
              aria-label="Search"
              title="Search cases, alerts, staff"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Desktop Clickable Search Bar & Ctrl+K Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group relative hidden min-w-0 max-w-md flex-1 items-center justify-between rounded-xl border border-[#1e3137] bg-[#0e1619] px-3.5 py-2 text-left text-sm text-slate-400 hover:border-[#2dd4bf]/50 hover:bg-[#121f24] hover:text-slate-200 transition-colors md:flex shadow-xs"
              aria-label="Search cases, alerts, staff"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#2dd4bf] transition-colors" />
                <span className="truncate text-slate-500 group-hover:text-slate-300">
                  Search cases, alerts, staff, SOS...
                </span>
              </div>
              <span className="shrink-0 rounded-md border border-[#1e3137] bg-[#0b292e] px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 group-hover:text-[#2dd4bf] group-hover:border-teal-800">
                Ctrl + K
              </span>
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-[#1e3137] bg-[#0b292e] px-2.5 py-1.5 text-xs text-slate-300 lg:flex">
              <Building2 className="h-3.5 w-3.5 text-[#2dd4bf]" />
              <span className="max-w-[160px] truncate font-medium">{user.organization}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 xl:flex">
              <CalendarDays className="h-3.5 w-3.5 text-[#2dd4bf]" />
              {todayLabel}
            </div>

            <div className="hidden sm:block">
              <ConnectionIndicator />
            </div>

            {/* Citizen SOS portal quick-link */}
            <a
              href="/sos"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 rounded-xl border border-red-800/50 bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors"
              title="Open citizen SOS portal"
            >
              <Siren className="h-3.5 w-3.5" />
              SOS Portal
            </a>

            <ThemeToggle />

            <button
              type="button"
              className="relative rounded-xl border border-[#1e3137] bg-[#121c20] p-2 text-slate-400 hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-[#1e3137] bg-[#121c20] py-1 pl-1 pr-2 sm:pr-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#0d9488] text-xs font-bold text-white">
                {initials(user.fullName)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#121c20] bg-emerald-400" />
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-[140px] truncate text-xs font-semibold text-slate-100">
                  {user.fullName}
                </p>
                <p className="text-[10px] font-medium text-[#2dd4bf]">{roleLabel}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-[#1e3137] bg-[#121c20] px-2.5 py-2 text-xs font-medium text-slate-300 hover:border-red-700 hover:bg-red-900/30 hover:text-red-400"
              title="Sign out of console"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6">
          <Outlet />
        </main>
      </div>

      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <EthioAlertAiAssistant />
      <SessionTimeout />
    </div>
  )
}
