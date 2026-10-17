import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { fetchCases } from '@/api/mockCases'
import type { Case } from '@/types/case'

const columns: Column<Case>[] = [
  { header: 'Case ID', cell: (c) => c.id },
  { header: 'Title', cell: (c) => c.title },
  { header: 'Category', cell: (c) => c.category },
  { header: 'Area', cell: (c) => c.area },
  { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
  { header: 'Updated', cell: (c) => c.updatedAt },
]

export default function CaseDashboardPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCases().then((data) => {
      if (!cancelled) {
        setCases(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Resource Organization Dashboard
        </h1>
        <Button onClick={() => navigate('/resource/cases/new')}>New case</Button>
      </div>
      {loading ? (
        <p className="text-slate-500">Loading cases...</p>
      ) : (
        <DataTable columns={columns} rows={cases} getRowId={(c) => c.id} />
      )}
    </div>
  )
}