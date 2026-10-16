import { NavLink, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { NAV_ITEMS } from '@/routes/navigation'
import { ROLE_LABELS } from '@/types/role'

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // The route guard makes sure a user exists before this renders.
  if (!user) return null

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-100">
        <div className="border-b border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            National Emergency
          </p>
          <p className="text-lg font-semibold">Alert System</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-slate-700 font-medium text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-white px-6 py-3">
          <p className="text-sm text-slate-600">{user.organization}</p>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}