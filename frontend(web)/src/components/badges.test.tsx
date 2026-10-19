import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SeverityBadge from '@/components/SeverityBadge'
import StatusBadge from '@/components/StatusBadge'
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
} from '@/types/case'

describe('StatusBadge', () => {
  it.each(CASE_STATUSES)('shows a readable label for %s', (status) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(CASE_STATUS_LABELS[status])).toBeInTheDocument()
  })
})

describe('SeverityBadge', () => {
  it.each(SEVERITIES)('shows a readable label for %s', (severity) => {
    render(<SeverityBadge severity={severity} />)
    expect(screen.getByText(SEVERITY_LABELS[severity])).toBeInTheDocument()
  })
})