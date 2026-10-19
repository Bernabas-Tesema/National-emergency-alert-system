import {
  SEVERITIES,
  SEVERITY_LABELS,
  type DeliveryChannel,
} from '@/types/case'
import type { LanguageSetting, SeverityRule } from '@/types/settings'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

// A message that is safe to show to the user.
export class SettingsError extends Error {}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const CHANNELS: DeliveryChannel[] = ['PUSH', 'SMS', 'VOICE']

// --- Languages ----------------------------------------------------------

let languages: LanguageSetting[] = [
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', enabled: true, isDefault: true },
  { code: 'en', name: 'English', nativeName: 'English', enabled: true, isDefault: false },
  { code: 'om', name: 'Afan Oromo', nativeName: 'Afaan Oromoo', enabled: false, isDefault: false },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', enabled: false, isDefault: false },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', enabled: false, isDefault: false },
]

export async function fetchLanguages(): Promise<LanguageSetting[]> {
  await delay()
  return clone(languages)
}

// Only the "enabled" and "default" choices can change. Names are fixed.
export async function saveLanguages(
  next: LanguageSetting[],
): Promise<LanguageSetting[]> {
  await delay()
  const sameCodes =
    next.length === languages.length &&
    languages.every((old) => next.some((l) => l.code === old.code))
  if (!sameCodes) throw new SettingsError('The language list is not valid.')

  const defaults = next.filter((l) => l.isDefault)
  if (next.every((l) => !l.enabled)) {
    throw new SettingsError('Turn on at least one language.')
  }
  if (defaults.length !== 1) {
    throw new SettingsError('Choose exactly one default language.')
  }
  if (!defaults[0].enabled) {
    throw new SettingsError('The default language must be turned on.')
  }

  languages = languages.map((old) => {
    const incoming = next.find((l) => l.code === old.code)
    return incoming
      ? { ...old, enabled: incoming.enabled, isDefault: incoming.isDefault }
      : old
  })
  return clone(languages)
}

// --- Severity rules -----------------------------------------------------

let severityRules: SeverityRule[] = [
  { severity: 'LOW', channels: ['PUSH'], fastTrackAllowed: false },
  { severity: 'MEDIUM', channels: ['PUSH', 'SMS'], fastTrackAllowed: false },
  { severity: 'HIGH', channels: ['PUSH', 'SMS'], fastTrackAllowed: false },
  { severity: 'CRITICAL', channels: ['PUSH', 'SMS', 'VOICE'], fastTrackAllowed: true },
]

export async function fetchSeverityRules(): Promise<SeverityRule[]> {
  await delay()
  return clone(severityRules)
}

// Real version: the server checks these rules again when an alert is composed
// and dispatched, so the browser cannot skip them.
export async function saveSeverityRules(
  next: SeverityRule[],
): Promise<SeverityRule[]> {
  await delay()
  const everyLevelOnce =
    next.length === SEVERITIES.length &&
    SEVERITIES.every((s) => next.filter((r) => r.severity === s).length === 1)
  if (!everyLevelOnce) {
    throw new SettingsError('Every severity level needs exactly one rule.')
  }

  for (const rule of next) {
    const name = SEVERITY_LABELS[rule.severity]
    if (rule.channels.length === 0) {
      throw new SettingsError(`${name} needs at least one channel.`)
    }
    const unique = new Set(rule.channels).size === rule.channels.length
    if (!unique || !rule.channels.every((c) => CHANNELS.includes(c))) {
      throw new SettingsError(`${name} has an invalid channel list.`)
    }
    if (
      rule.fastTrackAllowed &&
      rule.severity !== 'HIGH' &&
      rule.severity !== 'CRITICAL'
    ) {
      throw new SettingsError(
        'Fast-track is only available for high and critical alerts.',
      )
    }
  }

  severityRules = SEVERITIES.flatMap((s) =>
    next.filter((r) => r.severity === s),
  ).map((r) => clone(r))
  return clone(severityRules)
}