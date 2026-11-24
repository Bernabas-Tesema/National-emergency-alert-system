import { isAreaSelected } from '@/lib/area'
import type { CaseFormValues } from '@/types/case'

// One optional error message per field.
export type FormErrors = Partial<Record<keyof CaseFormValues, string>>

// A draft only needs a title.
export function validateDraft(v: CaseFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!v.title.trim()) errors.title = 'Enter a title to save a draft'
  return errors
}

// Submitting to INSA needs the core fields.
export function validateSubmission(v: CaseFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!v.title.trim()) errors.title = 'Title is required'
  if (!v.category) errors.category = 'Choose a category'
  if (!v.severity) errors.severity = 'Choose a suggested severity'
  if (!isAreaSelected(v.area)) {
    errors.area = 'Pick a sub-city or draw the affected area on the map'
  }
  if (!v.startTime) errors.startTime = 'Enter when the incident started'
  if (!v.description.trim()) errors.description = 'Describe what happened'
  return errors
}