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