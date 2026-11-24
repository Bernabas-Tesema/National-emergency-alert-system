import { findTemplateProblems } from '@/lib/templates'
import type { AlertTemplate, LanguageCode, TemplateInput } from '@/types/settings'
import { SettingsError, fetchLanguages } from './mockSettings'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// Invented sample texts. The Amharic text is only an example: a native speaker
// must review it before any real use.
const templates: AlertTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Flood warning',
    language: 'en',
    text: 'FLOOD WARNING for {area}. {action}. Issued at {time}. Follow instructions from the authorities.',
    enabled: true,
  },
  {
    id: 'tpl-2',
    name: 'Fire alert',
    language: 'en',
    text: 'FIRE ALERT in {area} at {time}. {action}.',
    enabled: true,
  },
  {
    id: 'tpl-3',
    name: 'Flood warning',
    language: 'am',
    text: 'የጎርፍ ማስጠንቀቂያ፦ {area}። {action}።',
    enabled: true,
  },
]

function sorted(list: AlertTemplate[]): AlertTemplate[] {
  return [...list].sort(
    (a, b) => a.name.localeCompare(b.name) || a.language.localeCompare(b.language),
  )
}

function find(id: string): AlertTemplate {
  const found = templates.find((t) => t.id === id)
  if (!found) throw new SettingsError('Template not found.')
  return found
}

// A template can only use a language that is turned on in the Languages tab.
async function requireEnabledLanguage(code: LanguageCode) {
  const languages = await fetchLanguages()
  const found = languages.find((l) => l.code === code)
  if (!found) throw new SettingsError('Unknown language.')
  if (!found.enabled) {
    throw new SettingsError(`${found.name} is turned off in the Languages tab.`)
  }
}

async function checkInput(input: TemplateInput, exceptId: string | null) {
  const name = input.name.trim()
  const text = input.text.trim()
  if (name.length < 3 || name.length > 60) {
    throw new SettingsError('The name must be 3 to 60 characters.')
  }
  const length = [...text].length
  if (length < 10 || length > 640) {
    throw new SettingsError('The message must be 10 to 640 characters.')
  }
  const problems = findTemplateProblems(text)
  if (problems.length > 0) throw new SettingsError(problems[0])
  await requireEnabledLanguage(input.language)
  const duplicate = templates.some(
    (t) =>
      t.id !== exceptId &&
      t.language === input.language &&
      t.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) {
    throw new SettingsError('A template with this name already exists in that language.')
  }
  return { name, text }
}

// --- Functions the screens call. Each returns the full, updated list. ----

export async function fetchTemplates(): Promise<AlertTemplate[]> {
  await delay()
  return clone(sorted(templates))
}

let nextTemplateNumber = 10

export async function createTemplate(input: TemplateInput): Promise<AlertTemplate[]> {
  await delay()
  const { name, text } = await checkInput(input, null)
  templates.push({
    id: `tpl-${nextTemplateNumber++}`,
    name,
    language: input.language,
    text,
    enabled: true,
  })
  return clone(sorted(templates))
}

export async function updateTemplate(
  id: string,
  input: TemplateInput,
): Promise<AlertTemplate[]> {
  await delay()
  const target = find(id)
  const { name, text } = await checkInput(input, id)
  target.name = name
  target.language = input.language
  target.text = text
  return clone(sorted(templates))
}

// Templates are never deleted, only turned off.
export async function setTemplateEnabled(
  id: string,
  enabled: boolean,
): Promise<AlertTemplate[]> {
  await delay(250)
  const target = find(id)
  if (enabled) await requireEnabledLanguage(target.language)
  target.enabled = enabled
  return clone(sorted(templates))
}