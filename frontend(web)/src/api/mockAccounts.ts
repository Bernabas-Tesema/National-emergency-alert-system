import type { User } from '@/types/user'

// A mock account is a User plus a password (only mock data has one).
export interface MockAccount extends User {
  password: string
}

const MOCK_PASSWORD = 'Password123!'

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: 'u-001',
    username: 'provider1',
    password: MOCK_PASSWORD,
    fullName: 'Abebe Kebede',
    role: 'provider',
    organization: 'Addis Ababa Fire & Emergency Authority',
  },
  {
    id: 'u-002',
    username: 'orgadmin1',
    password: MOCK_PASSWORD,
    fullName: 'Selam Tesfaye',
    role: 'org_admin',
    organization: 'Addis Ababa Fire & Emergency Authority',
  },
  {
    id: 'u-003',
    username: 'dispatcher1',
    password: MOCK_PASSWORD,
    fullName: 'Dawit Alemu',
    role: 'dispatcher',
    organization: 'INSA',
  },
  {
    id: 'u-004',
    username: 'officer1',
    password: MOCK_PASSWORD,
    fullName: 'Hanna Bekele',
    role: 'higher_officer',
    organization: 'INSA',
  },
  {
    id: 'u-005',
    username: 'auditor1',
    password: MOCK_PASSWORD,
    fullName: 'Yonas Girma',
    role: 'auditor',
    organization: 'INSA',
  },
  {
    id: 'u-006',
    username: 'sysadmin1',
    password: MOCK_PASSWORD,
    fullName: 'Marta Haile',
    role: 'system_admin',
    organization: 'INSA',
  },
  {
    id: 'u-007',
    username: 'citizen1',
    password: MOCK_PASSWORD,
    fullName: 'Biruk Lemma',
    role: 'citizen',
    organization: 'None',
  },
]