
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
    label: 'Command Dashboard',
    path: '/insa/dashboard',
    roles: ['system_admin'],
  },
  {
    label: 'SOS Operations',
    path: '/insa/sos',
    roles: ['dispatcher', 'higher_officer', 'auditor', 'system_admin'],
  },
  {
    label: 'Approvals',
    path: '/insa/approvals',
    roles: ['higher_officer'],
  },
  {
    label: 'Audit Log',
    path: '/insa/audit',
    roles: ['auditor', 'system_admin'],
  },
    {
    label: 'Organizations',
    path: '/insa/organizations',
    roles: ['system_admin'],
  },
  {
    label: 'Staff accounts',
    path: '/insa/staff',
    roles: ['system_admin'],
  },
    {
    label: 'Settings',
    path: '/insa/settings',
    roles: ['system_admin'],
  },
]
