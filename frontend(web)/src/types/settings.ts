import type { DeliveryChannel, Severity } from './case'

export type LanguageCode = 'am' | 'en' | 'om' | 'ti' | 'so'

export interface LanguageSetting {
  code: LanguageCode
  name: string // English name
  nativeName: string // how speakers write it
  enabled: boolean
  isDefault: boolean
}

export interface SeverityRule {
  severity: Severity
  channels: DeliveryChannel[] // which channels this severity may use
  fastTrackAllowed: boolean // may skip the normal queue (HIGH and CRITICAL only)
}
// --- Areas (regions, zones, sub-cities) ---------------------------------

export type AreaKind = 'region' | 'zone' | 'subcity'

export const AREA_KIND_LABELS: Record<AreaKind, string> = {
  region: 'Region',
  zone: 'Zone',
  subcity: 'Sub-city',
}

export interface Area {
  id: string
  name: string
  kind: AreaKind
  parentId: string | null // regions have no parent
  enabled: boolean
}

export interface NewAreaInput {
  name: string
  kind: AreaKind
  parentId: string | null
}

// --- Alert templates ----------------------------------------------------

export interface AlertTemplate {
  id: string
  name: string
  language: LanguageCode
  text: string // may contain {area}, {time} and {action}
  enabled: boolean
}

export interface TemplateInput {
  name: string
  language: LanguageCode
  text: string
}

// --- Telecom gateways ---------------------------------------------------

export type GatewayChannel = 'SMS' | 'VOICE'

export const GATEWAY_CHANNEL_LABELS: Record<GatewayChannel, string> = {
  SMS: 'SMS',
  VOICE: 'Voice call',
}

export interface Gateway {
  id: string
  name: string
  channel: GatewayChannel
  priority: number // 1 = primary, 2 = first backup, and so on
  enabled: boolean
  credentialUpdatedAt: string // YYYY-MM-DD. The key itself is never sent to the browser.
}