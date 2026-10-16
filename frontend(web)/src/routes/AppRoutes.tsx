import { Navigate, Route, Routes } from 'react-router'
import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/features/auth/useAuth'
import PlaceholderPage from '@/components/PlaceholderPage'
import ProtectedRoute from './ProtectedRoute'
import { ROLE_HOME_PATH } from '@/types/role'

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

      <Route element={<ProtectedRoute allowedRoles={['provider', 'org_admin']} />}>
        <Route
          path="/resource/dashboard"
          element={<PlaceholderPage title="Resource Organization Dashboard" />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['system_admin']} />}>
        <Route
          path="/insa/dashboard"
          element={<PlaceholderPage title="INSA Command Dashboard" />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['dispatcher', 'system_admin']} />}>
        <Route
          path="/insa/sos"
          element={<PlaceholderPage title="SOS Operations" />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['higher_officer', 'system_admin']} />}>
        <Route
          path="/insa/approvals"
          element={<PlaceholderPage title="Tier 2 Approval Queue" />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['auditor', 'system_admin']} />}>
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
      <Route
        path="*"
        element={<PlaceholderPage title="Page not found" />}
      />
    </Routes>
  )
}