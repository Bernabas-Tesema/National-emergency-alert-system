
import { Navigate, Route, Routes } from 'react-router'

import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/features/auth/useAuth'
import PlaceholderPage from '@/components/PlaceholderPage'
import AppShell from '@/layouts/AppShell'
import ProtectedRoute from './ProtectedRoute'
import { ROLES, ROLE_HOME_PATH, hasWebAccess } from '@/types/role'
import CaseDashboardPage from '@/features/resource-portal/CaseDashboardPage'

// Every role that may use the web app (everyone except citizens).
const WEB_ROLES = ROLES.filter(hasWebAccess)

// Sends "/" to the right place for whoever is logged in.
function HomeRedirect() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return <Navigate to={ROLE_HOME_PATH[user.role] ?? '/login'} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Outer guard: must be signed in with a staff role.
          AppShell draws the sidebar and header for everything inside. */}
      <Route element={<ProtectedRoute allowedRoles={WEB_ROLES} />}>
        <Route element={<AppShell />}>
          {/* Inner guards: only the listed roles see each group. */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['provider', 'org_admin']} />
            }
          >
            <Route
              path="/resource/dashboard"
              element={<CaseDashboardPage />}
            />
          </Route>

          <Route
            element={<ProtectedRoute allowedRoles={['system_admin']} />}
          >
            <Route
              path="/insa/dashboard"
              element={<PlaceholderPage title="INSA Command Dashboard" />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['dispatcher', 'system_admin']}
              />
            }
          >
            <Route
              path="/insa/sos"
              element={<PlaceholderPage title="SOS Operations" />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['higher_officer', 'system_admin']}
              />
            }
          >
            <Route
              path="/insa/approvals"
              element={<PlaceholderPage title="Tier 2 Approval Queue" />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['auditor', 'system_admin']}
              />
            }
          >
            <Route
              path="/insa/audit"
              element={<PlaceholderPage title="Audit Log" />}
            />
          </Route>

          <Route
            path="/forbidden"
            element={
              <PlaceholderPage
                title="Access denied"
                description="Your role does not have access to this page."
              />
            }
          />
        </Route>
      </Route>

      {/* Unknown address: go to the user's own home page. */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
