import { SettingsError } from '@/api/mockSettings'

// A sensitive action waiting for the user's 2FA code.
export interface PendingStep {
  title: string
  description: string
  confirmLabel: string
  run: () => Promise<void>
}

export function messageFrom(err: unknown): string {
  return err instanceof SettingsError
    ? err.message
    : 'Something went wrong. Please try again.'
}