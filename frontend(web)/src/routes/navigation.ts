
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
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'SOS Operations',
    path: '/insa/sos',
    roles: ['dispatcher', 'higher_officer', 'auditor'],
  },
  {
    label: 'Approvals',
    path: '/insa/approvals',
    roles: ['higher_officer'],
  },
  {
    label: 'Audit Log',
    path: '/insa/audit',
    roles: ['auditor'],
  },
    {
    label: 'Organizations',
    path: '/insa/organizations',
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'Staff accounts',
    path: '/insa/staff',
    roles: ['ADMINISTRATOR'],
  },
    {
    label: 'Settings',
    path: '/insa/settings',
    roles: ['ADMINISTRATOR'],
  },
]
