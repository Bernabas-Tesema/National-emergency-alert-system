import { Navigate, Route, Routes } from 'react-router'
import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/features/auth/useAuth'
import PlaceholderPage from '@/components/PlaceholderPage'
import AppShell from '@/layouts/AppShell'
import RealtimeProvider from '@/features/realtime/RealtimeProvider'

// Resource Portal Views
import CaseDashboardPage from '@/features/resource-portal/CaseDashboardPage'
import CaseDetailPage from '@/features/resource-portal/CaseDetailPage'
import CaseEditPage from '@/features/resource-portal/CaseEditPage'
import CaseFormPage from '@/features/resource-portal/CaseFormPage'
import OrgAdminPage from '@/features/resource-portal/OrgAdminPage'

// INSA Operations & Control Centre Views
import CommandDashboardPage from '@/features/insa-command/CommandDashboardPage'
import CaseReviewQueuePage from '@/features/insa-cases/CaseReviewQueuePage'
import AlertComposerPage from '@/features/insa-alerts/AlertComposerPage'
import ApprovalQueuePage from '@/features/insa-approvals/ApprovalQueuePage'
import DispatchMonitorPage from '@/features/insa-dispatch/DispatchMonitorPage'
import SosOperationsPage from '@/features/insa-sos/SosOperationsPage'
import ReportsAnalyticsPage from '@/features/insa-reports/ReportsAnalyticsPage'

// INSA Management Views
import OrganizationsPage from '@/features/insa-management/OrganizationsPage'
import StaffPage from '@/features/insa-management/StaffPage'
import SettingsPage from '@/features/insa-management/SettingsPage'
import AuditLogPage from '@/features/insa-management/AuditLogPage'


import ProtectedRoute from './ProtectedRoute'
import { ROLES, ROLE_HOME_PATH, hasWebAccess } from '@/types/role'

// Every role that may use the web app (everyone except citizens).
const WEB_ROLES = ROLES.filter(hasWebAccess)

// Sends "/" to the right place for whoever is logged in.
function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const target = ROLE_HOME_PATH[user.role] ?? '/login'
  return <Navigate to={target} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Outer guard: must be signed in with a staff role. */}
      <Route element={<ProtectedRoute allowedRoles={WEB_ROLES} />}>
        <Route
          element={
            <RealtimeProvider>
              <AppShell />
            </RealtimeProvider>
          }
        >
          {/* Resource Portal: provider, org_admin, ORG_OFFICER */}
          <Route element={<ProtectedRoute allowedRoles={['provider', 'org_admin', 'ORG_ADMIN', 'ORG_OFFICER']} />}>
            <Route path="/resource/dashboard" element={<CaseDashboardPage />} />
            <Route path="/resource/cases/new" element={<CaseFormPage />} />
            <Route path="/resource/cases/:caseId" element={<CaseDetailPage />} />
            <Route path="/resource/cases/:caseId/edit" element={<CaseEditPage />} />
          </Route>

          {/* Organization administration: org_admin only */}
          <Route element={<ProtectedRoute allowedRoles={['org_admin', 'ORG_ADMIN']} />}>
            <Route path="/resource/org-admin" element={<OrgAdminPage />} />
          </Route>

          {/* INSA Command Dashboard */}
          <Route element={<ProtectedRoute allowedRoles={['system_admin', 'SUPER_ADMIN', 'ADMINISTRATOR', 'HIGHER_OFFICER', 'higher_officer']} />}>
            <Route path="/insa/dashboard" element={<CommandDashboardPage />} />
          </Route>

          {/* INSA Case Triage & Review Queue */}
          <Route element={<ProtectedRoute allowedRoles={['system_admin', 'SUPER_ADMIN', 'ADMINISTRATOR']} />}>
            <Route path="/insa/cases" element={<CaseReviewQueuePage />} />
          </Route>

          {/* INSA Public Alert Composer */}
          <Route element={<ProtectedRoute allowedRoles={['system_admin', 'SUPER_ADMIN', 'ADMINISTRATOR']} />}>
            <Route path="/insa/alerts" element={<AlertComposerPage />} />
            <Route path="/insa/alerts/composer" element={<AlertComposerPage />} />
          </Route>

          {/* INSA Tier-2 Approval Queue */}
          <Route element={<ProtectedRoute allowedRoles={['higher_officer', 'HIGHER_OFFICER']} />}>
            <Route path="/insa/approvals" element={<ApprovalQueuePage />} />
          </Route>

          {/* INSA Live Broadcast Telemetry Monitor */}
          <Route element={<ProtectedRoute allowedRoles={['system_admin', 'SUPER_ADMIN', 'ADMINISTRATOR', 'HIGHER_OFFICER', 'higher_officer']} />}>
            <Route path="/insa/dispatch/:id" element={<DispatchMonitorPage />} />
          </Route>

          {/* SOS Operations Feed */}
          <Route element={<ProtectedRoute allowedRoles={['dispatcher', 'DISPATCHER', 'higher_officer', 'HIGHER_OFFICER', 'auditor', 'AUDITOR', 'system_admin', 'SUPER_ADMIN', 'ADMINISTRATOR']} />}>
            <Route path="/insa/sos" element={<SosOperationsPage />} />
          </Route>

          {/* INSA System Management & Settings */}
          <Route element={<ProtectedRoute allowedRoles={['system_admin', 'SUPER_ADMIN']} />}>
            <Route path="/insa/organizations" element={<OrganizationsPage />} />
            <Route path="/insa/settings" element={<SettingsPage />} />
            <Route path="/insa/staff" element={<StaffPage />} />
          </Route>

          {/* Analytics & Reports */}
          <Route element={<ProtectedRoute allowedRoles={['system_admin', 'SUPER_ADMIN', 'ADMINISTRATOR', 'AUDITOR', 'auditor']} />}>
            <Route path="/insa/reports" element={<ReportsAnalyticsPage />} />
          </Route>

          {/* Read-Only Audit Log */}
          <Route element={<ProtectedRoute allowedRoles={['auditor', 'AUDITOR', 'system_admin', 'SUPER_ADMIN']} />}>
            <Route path="/insa/audit" element={<AuditLogPage />} />
          </Route>


          <Route
            path="/forbidden"
            element={
              <PlaceholderPage
                title="Access denied"
                description="Your operational role does not possess authorization to access this secured zone."
              />
            }
          />
          <Route
            path="/403"
            element={
              <PlaceholderPage
                title="Access denied"
                description="Your operational role does not possess authorization to access this secured zone."
              />
            }
          />
        </Route>
      </Route>

      {/* Unknown address: redirect to user home */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}