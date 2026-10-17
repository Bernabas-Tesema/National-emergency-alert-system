
import type { Role } from '@/types/role'

export interface NavItem {
  label: string
  path: string
  roles: Role[]
}

// One list drives the whole sidebar. Each person sees only the items
// that include their role.
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/resource/dashboard',
    roles: ['provider', 'org_admin'],
  },
  {
    label: 'Organization',
    path: '/resource/org-admin',
    roles: ['org_admin'],
  },
  {
    label: 'Component demo (temporary)',
    path: '/resource/components-demo',
    roles: ['provider', 'org_admin'],
  },
  {
    label: 'Command Dashboard',
    path: '/insa/dashboard',
    roles: ['system_admin'],
  },
  {
    label: 'SOS Operations',
    path: '/insa/sos',
    roles: ['dispatcher', 'system_admin'],
  },
  {
    label: 'Approvals',
    path: '/insa/approvals',
    roles: ['higher_officer', 'system_admin'],
  },
  {
    label: 'Audit Log',
    path: '/insa/audit',
    roles: ['auditor', 'system_admin'],
  },
]
