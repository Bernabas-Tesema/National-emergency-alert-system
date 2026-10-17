import { EMPTY_AREA } from '@/lib/area'
import type { CaseFormValues, CaseRecord } from '@/types/case'

export const EMPTY_CASE_FORM: CaseFormValues = {
  title: '',
  category: '',
  severity: '',
  area: EMPTY_AREA,
  startTime: '',
  description: '',
  recommendedAction: '',
  files: [],
}

// Turns a saved case back into form values so a draft can be edited.
// Files already attached can't become File objects again, so the form
// shows them separately and only collects new files.
export function recordToFormValues(record: CaseRecord): CaseFormValues {
  return {
    title: record.title,
    category: record.categoryId,
    severity: record.severity,
    area: record.areaSelection,
    startTime: record.startTime,
    description: record.description,
    recommendedAction: record.recommendedAction,
    files: [],
  }
}