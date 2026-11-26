import { apiFetch } from './client'
import { liveApi } from './config'

export interface AiAssistResult {
  reply: string
  role: string
  source?: string
  provider?: string | null
}

export interface AiTriageResult {
  suggestion: boolean
  source: string
  provider?: string | null
  data: {
    category: string
    severity: string
    summary: string
    reasons: string[]
    confidence: number
  }
  warnings?: string[]
}

export interface AiDraftResult {
  suggestion: boolean
  source: string
  data: {
    en: string
    am: string
    sms_en: string
    sms_am: string
    confidence: number
  }
}

export interface AiSummaryResult {
  suggestion: boolean
  source: string
  data: {
    summary: string
    key_points: string[]
    confidence: number
  }
}

const ROLE_PROMPTS: Record<string, string[]> = {
  ADMINISTRATOR: [
    'What should I check before creating a new org admin?',
    'How should I triage a critical fire case?',
    'Draft talking points for an alert about urban flooding.',
  ],
  HIGHER_OFFICER: [
    'What risks should I look for before approving an alert?',
    'Is this alert wording calm enough for the public?',
  ],
  DISPATCHER: [
    'How do I prioritize multiple SOS tickets?',
    'Checklist after an org returns an SOS to Ethio Alert.',
  ],
  AUDITOR: [
    'What audit events matter after an alert dispatch?',
    'Explain separation of duties for alert approval.',
  ],
  ORG_ADMIN: [
    'How should our officers handle SOS inbox returns?',
    'Tips for tracking case outcomes after Ethio Alert broadcast.',
  ],
  ORG_OFFICER: [
    'Help me write a clear incident description for Ethio Alert.',
    'What belongs in an SOS return note to Ethio Alert?',
  ],
}

export function quickPromptsForRole(role: string): string[] {
  const key = role.toUpperCase().replace(/-/g, '_')
  const map: Record<string, string> = {
    SYSTEM_ADMIN: 'ADMINISTRATOR',
    PROVIDER: 'ORG_OFFICER',
    ORG_ADMIN: 'ORG_ADMIN',
  }
  const canonical = map[key] || key
  return ROLE_PROMPTS[canonical] || ROLE_PROMPTS.ADMINISTRATOR
}

export async function liveAiAssist(input: {
  role: string
  message: string
  context?: string
}): Promise<AiAssistResult> {
  if (!liveApi) {
    return {
      role: input.role,
      reply:
        'AI is available when the live API is connected. Ask about triage, SOS handling, or alert wording for your role.',
      source: 'offline',
    }
  }
  const result = await apiFetch<AiAssistResult>('/api/v1/ai/assist', {
    method: 'POST',
    body: JSON.stringify({
      role: input.role,
      message: input.message,
      context: input.context || '',
    }),
  })
  return result
}

export async function liveAiTriage(casePayload: {
  case_id?: string
  category?: string
  suggested_severity?: string
  description: string
  region?: string
}): Promise<AiTriageResult> {
  return apiFetch('/api/v1/ai/triage', {
    method: 'POST',
    body: JSON.stringify(casePayload),
  })
}

export async function liveAiDraft(casePayload: {
  case_id?: string
  category?: string
  suggested_severity?: string
  description: string
  region?: string
}): Promise<AiDraftResult> {
  return apiFetch('/api/v1/ai/draft', {
    method: 'POST',
    body: JSON.stringify(casePayload),
  })
}

export async function liveAiSummary(items: {
  set_id?: string
  items: Array<{
    id: string
    category?: string
    severity?: string
    description: string
    age_minutes?: number
  }>
}): Promise<AiSummaryResult> {
  return apiFetch('/api/v1/ai/summary', {
    method: 'POST',
    body: JSON.stringify(items),
  })
}
