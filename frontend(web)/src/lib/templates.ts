export const PLACEHOLDERS = ['area', 'time', 'action'] as const
export type Placeholder = (typeof PLACEHOLDERS)[number]

export const PLACEHOLDER_HELP: Record<Placeholder, string> = {
  area: 'The affected area',
  time: 'When the alert was issued',
  action: 'What people should do',
}

// Example values used only for the preview.
export const SAMPLE_VALUES: Record<Placeholder, string> = {
  area: 'Bole',
  time: '14:30',
  action: 'Move to higher ground',
}

function isPlaceholder(name: string): name is Placeholder {
  return (PLACEHOLDERS as readonly string[]).includes(name)
}

// Returns a message for every problem found, or an empty list.
export function findTemplateProblems(text: string): string[] {
  const unknown = new Set<string>()
  const withoutPlaceholders = text.replace(
    /\{([^{}]*)\}/g,
    (_match, name: string) => {
      if (!isPlaceholder(name)) unknown.add(name)
      return ''
    },
  )

  const problems = [...unknown].map(
    (name) =>
      `Unknown placeholder {${name}}. Use only ${PLACEHOLDERS.map((p) => `{${p}}`).join(', ')}.`,
  )
  if (/[{}]/.test(withoutPlaceholders)) {
    problems.push('Every { needs a matching }. Remove stray curly brackets.')
  }
  return problems
}

// Fills the placeholders with the example values.
export function renderPreview(text: string): string {
  return text.replace(/\{([^{}]*)\}/g, (match, name: string) =>
    isPlaceholder(name) ? SAMPLE_VALUES[name] : match,
  )
}

export interface SmsEstimate {
  length: number
  unicode: boolean
  parts: number
}

// A rough estimate. Plain English text fits 160 characters in one SMS, but any
// other script (such as Amharic) switches the SMS to Unicode, which fits only 70.
// When a message is split, each part carries a small header, so parts hold 153
// or 67 characters.
export function estimateSms(text: string): SmsEstimate {
  const chars = [...text]
  const unicode = chars.some((ch) => (ch.codePointAt(0) ?? 0) > 127)
  const single = unicode ? 70 : 160
  const perPart = unicode ? 67 : 153
  const parts = chars.length <= single ? 1 : Math.ceil(chars.length / perPart)
  return { length: chars.length, unicode, parts }
}