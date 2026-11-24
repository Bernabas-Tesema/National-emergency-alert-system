import CaseForm from './CaseForm'
import { EMPTY_CASE_FORM } from '@/lib/caseForm'

export default function CaseFormPage() {
  return <CaseForm initialValues={EMPTY_CASE_FORM} />
}