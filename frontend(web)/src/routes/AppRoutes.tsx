
import { Navigate, Route, Routes } from 'react-router'

import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/features/auth/useAuth'
import PlaceholderPage from '@/components/PlaceholderPage'
import AppShell from '@/layouts/AppShell'
import ProtectedRoute from './ProtectedRoute'
import { ROLES, ROLE_HOME_PATH, hasWebAccess } from '@/types/role'

import CaseDashboardPage from '@/features/resource-portal/CaseDashboardPage'
import ComponentsDemoPage from '@/features/resource-portal/ComponentsDemoPage'
import CaseFormPage from '@/features/resource-portal/CaseFormPage'
import CaseDetailPage from '@/features/resource-portal/CaseDetailPage'
import CaseEditPage from '@/features/resource-portal/CaseEditPage'
import OrgAdminPage from '@/features/resource-portal/OrgAdminPage'

import RealtimeProvider from '@/features/realtime/RealtimeProvider'

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
          RealtimeProvider supplies live-update functionality.
          AppShell draws the sidebar and header for everything inside. */}
      <Route element={<ProtectedRoute allowedRoles={WEB_ROLES} />}>
        <Route
          element={
            <RealtimeProvider>
              <AppShell />
            </RealtimeProvider>
          }
        >
          {/* Resource portal: providers and organization admins. */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['provider', 'org_admin']} />
            }
          >
            <Route
              path="/resource/dashboard"
              element={<CaseDashboardPage />}
            />

            <Route
              path="/resource/components-demo"
              element={<ComponentsDemoPage />}
            />

            <Route
              path="/resource/cases/new"
              element={<CaseFormPage />}
            />

            <Route
              path="/resource/cases/:caseId"
              element={<CaseDetailPage />}
            />

            <Route
              path="/resource/cases/:caseId/edit"
              element={<CaseEditPage />}
            />
          </Route>

          {/* Organization management: org_admin only. */}
          <Route element={<ProtectedRoute allowedRoles={['org_admin']} />}>
            <Route
              path="/resource/org-admin"
              element={<OrgAdminPage />}
            />
          </Route>

          {/* INSA command dashboard: system administrators only. */}
          <Route
            element={<ProtectedRoute allowedRoles={['system_admin']} />}
          >
            <Route
              path="/insa/dashboard"
              element={<PlaceholderPage title="INSA Command Dashboard" />}
            />
          </Route>

          {/* SOS operations: dispatchers and system administrators. */}
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

          {/* Approvals: higher officers and system administrators. */}
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

          {/* Audit log: auditors and system administrators. */}
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
