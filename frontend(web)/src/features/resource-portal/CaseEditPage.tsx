import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { fetchCase } from '@/api/mockCases'
import { Button } from '@/components/ui/button'
import { recordToFormValues } from '@/lib/caseForm'
import type { CaseRecord } from '@/types/case'
import CaseForm from './CaseForm'

function EditDraft({ caseId }: { caseId: string }) {
  const navigate = useNavigate()
  const [record, setRecord] = useState<CaseRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCase(caseId).then((data) => {
      if (!cancelled) {
        setRecord(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [caseId])

  if (loading) return <p className="text-slate-500">Loading draft...</p>

  if (!record || record.status !== 'draft') {
    return (
      <div className="space-y-4">
        <p className="text-slate-700">
          {record ? 'Only drafts can be edited.' : 'Case not found.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/resource/dashboard')}>
          Back to cases
        </Button>
      </div>
    )
  }

  return (
    <CaseForm
      initialValues={recordToFormValues(record)}
      caseId={record.id}
      existingAttachments={record.attachmentNames}
    />
  )
}

// Same pattern as the detail page: the key restarts the editor if the id changes.
export default function CaseEditPage() {
  const { caseId = '' } = useParams()
  return <EditDraft key={caseId} caseId={caseId} />
}