import {
  GATEWAY_CHANNEL_LABELS,
  type Gateway,
} from '@/types/settings'
import { SettingsError } from './mockSettings'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))
const today = () => new Date().toISOString().slice(0, 10)

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// Invented sample providers.
const gateways: Gateway[] = [
  { id: 'gw-sms-1', name: 'Primary SMS gateway', channel: 'SMS', priority: 1, enabled: true, credentialUpdatedAt: '2026-10-01' },
  { id: 'gw-sms-2', name: 'Backup SMS gateway', channel: 'SMS', priority: 2, enabled: true, credentialUpdatedAt: '2026-10-01' },
  { id: 'gw-voice-1', name: 'Primary voice gateway', channel: 'VOICE', priority: 1, enabled: true, credentialUpdatedAt: '2026-10-02' },
  { id: 'gw-voice-2', name: 'Backup voice gateway', channel: 'VOICE', priority: 2, enabled: false, credentialUpdatedAt: '2026-10-02' },
]

function ordered(list: Gateway[]): Gateway[] {
  return [...list].sort(
    (a, b) => a.channel.localeCompare(b.channel) || a.priority - b.priority,
  )
}

function find(id: string): Gateway {
  const found = gateways.find((g) => g.id === id)
  if (!found) throw new SettingsError('Gateway not found.')
  return found
}

// --- Functions the screens call. Each returns the full, updated list. ----
// The list of providers is fixed by the backend, so there is no "add" here.
// The server must check every rule again, require step-up 2FA, and write each
// change to the audit log.

export async function fetchGateways(): Promise<Gateway[]> {
  await delay()
  return clone(ordered(gateways))
}

export async function setGatewayEnabled(id: string, enabled: boolean): Promise<Gateway[]> {
  await delay(250)
  const target = find(id)
  if (!enabled) {
    const otherOn = gateways.some(
      (g) => g.id !== id && g.channel === target.channel && g.enabled,
    )
    if (!otherOn) {
      throw new SettingsError(
        `Keep at least one ${GATEWAY_CHANNEL_LABELS[target.channel]} gateway turned on.`,
      )
    }
  }
  target.enabled = enabled
  return clone(ordered(gateways))
}

// Swaps a gateway with its neighbour in the same channel (primary or backup).
export async function moveGateway(
  id: string,
  direction: 'up' | 'down',
): Promise<Gateway[]> {
  await delay(250)
  const target = find(id)
  const sameChannel = ordered(gateways.filter((g) => g.channel === target.channel))
  const index = sameChannel.findIndex((g) => g.id === id)
  const neighbour = sameChannel[direction === 'up' ? index - 1 : index + 1]
  if (!neighbour) {
    throw new SettingsError(
      direction === 'up'
        ? 'It is already the primary gateway.'
        : 'It is already the last backup.',
    )
  }
  const swap = target.priority
  target.priority = neighbour.priority
  neighbour.priority = swap
  return clone(ordered(gateways))
}

// The new key is accepted but never stored here and never sent back. The real
// server keeps it in a secret manager, and the browser can only replace it.
export async function replaceGatewayCredential(
  id: string,
  credential: string,
): Promise<Gateway[]> {
  await delay()
  const target = find(id)
  if (credential.trim().length < 8) {
    throw new SettingsError('The key must be at least 8 characters.')
  }
  target.credentialUpdatedAt = today()
  return clone(ordered(gateways))
}