import { useState } from 'react'
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
} from 'lucide-react'

import ConnectionIndicator from '@/components/ConnectionIndicator'
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
  // Dashboard
  {
    label: 'Dashboard',
    path: '/insa/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'HIGHER_OFFICER'],
  },
  {
    label: 'Dashboard',
    path: '/resource/dashboard',
    icon: LayoutDashboard,
    roles: ['ORG_ADMIN', 'ORG_OFFICER'],
  },

  // Alerts & Approvals
  {
    label: 'Alerts',
    path: '/insa/alerts',
    icon: Radio,
    roles: ['SUPER_ADMIN', 'ADMINISTRATOR'],
  },
  {
    label: 'Approvals',
    path: '/insa/approvals',
    icon: FileCheck,
    roles: ['HIGHER_OFFICER'],
  },

  // Cases / Reports
  {
    label: 'Incident Cases',
    path: '/insa/cases',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'ADMINISTRATOR'],
  },
  {
    label: 'Submit Incident',
    path: '/resource/cases/new',
    icon: FileText,
    roles: ['ORG_ADMIN', 'ORG_OFFICER'],
  },

  // SOS Operations
  {
    label: 'SOS Operations',
    path: '/insa/sos',
    icon: Siren,
    roles: ['DISPATCHER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'HIGHER_OFFICER', 'AUDITOR'],
  },

  // Staff & Users
  {
    label: 'Staff Accounts',
    path: '/insa/staff',
    icon: Users,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Officers',
    path: '/resource/org-admin',
    icon: Users,
    roles: ['ORG_ADMIN'],
  },

  // Resources & Organizations
  {
    label: 'Organizations',
    path: '/insa/organizations',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'System Settings',
    path: '/insa/settings',
    icon: Package,
    roles: ['SUPER_ADMIN'],
  },

  // Analytics & Reports
  {
    label: 'Reports & Analytics',
    path: '/insa/reports',
    icon: BarChart2,
    roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'AUDITOR'],
  },

  // Audit Log
  {
    label: 'Audit Log',
    path: '/insa/audit',
    icon: Shield,
    roles: ['AUDITOR', 'SUPER_ADMIN'],
  },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return null

  const normRole = canonicalRole(user.role)

  // Limited Dispatcher Rule: only sees SOS Operations
  const isLimitedDispatcher = normRole === 'DISPATCHER'

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

  return (
    <div className="flex min-h-screen bg-[#0c1417] text-slate-100 font-sans antialiased selection:bg-teal-500/30">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-canvas Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#09181b] border-r border-[#13262a] shadow-2xl transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#13262a] px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
              <span className="text-base font-bold tracking-tight text-white">EthioAlert</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
              {isLimitedDispatcher ? 'Dispatcher Console' : 'Operations Console'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#112328] transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-3 overflow-y-auto flex-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-teal-400/80 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {links.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#133e42] text-[#2dd4bf] shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#112328]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-teal-400/80" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-[#13262a] p-4 text-[11px] text-slate-500">
          <p className="font-medium text-slate-400">INSA Safety Network</p>
          <p className="text-[10px] mt-0.5">v2.4 &bull; National Operations</p>
        </div>
      </aside>

      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex shrink-0 flex-col bg-[#09181b] border-r border-[#13262a] transition-all duration-200 z-30 ${
          collapsed ? 'w-18' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#13262a] px-4 py-4.5">
          {!collapsed && (
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                <span className="text-base font-bold tracking-tight text-white">EthioAlert</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
                {isLimitedDispatcher ? 'Dispatcher Console' : 'Operations Console'}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#112328] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-3 overflow-y-auto flex-1">
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-teal-400/80 mb-2">
              Navigation
            </p>
          )}

          <nav className="space-y-1">
            {links.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#133e42] text-[#2dd4bf] shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#112328]'
                    } ${collapsed ? 'justify-center px-2' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${collapsed ? '' : ''}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        {!collapsed && (
          <div className="mt-auto border-t border-[#13262a] p-4 text-[11px] text-slate-500">
            <p className="font-medium text-slate-400">INSA Safety Network</p>
            <p className="text-[10px] mt-0.5">v2.4 &bull; National Operations</p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Operational Bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#13262a] bg-[#0c1417]/90 px-3 sm:px-6 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#112328] md:hidden transition-colors border border-[#1b2e34]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Mobile brand indicator */}
            <div className="flex md:hidden items-center gap-1.5 mr-0.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.6)]" />
              <span className="text-xs font-bold text-white tracking-tight">EthioAlert</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded bg-[#111d21] border border-[#1b2e34] text-xs min-w-0">
              <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="font-medium text-slate-200 truncate max-w-[90px] sm:max-w-xs">{user.organization}</span>
            </div>

            <div className="hidden xs:block">
              <ConnectionIndicator />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">{user.fullName}</p>
              <p className="text-[10px] text-teal-400/90 font-medium">
                {ROLE_LABELS[normRole || 'CITIZEN'] || user.role}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-[#1b2e34] bg-[#111d21] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/20 transition-all shadow-sm"
              title="Sign out of console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Viewport Canvas */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>

      <SessionTimeout />
    </div>
  )
}
