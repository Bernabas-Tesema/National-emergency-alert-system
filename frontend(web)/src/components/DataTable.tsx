import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  emptyMessage?: string
}

export default function DataTable<T>({
  columns,
  rows,
  getRowId,
  emptyMessage = 'No records to show.',
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-[#0c1417] border-b border-[#1b2e34]">
          <TableRow className="border-[#1b2e34] hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.header} className="text-[11px] font-bold text-teal-400 uppercase tracking-wider py-3.5 px-4">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="border-[#1b2e34]">
              <TableCell
                colSpan={columns.length}
                className="h-28 text-center text-xs text-slate-400"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={getRowId(row)} className="border-[#1b2e34] hover:bg-[#152327] transition-colors">
                {columns.map((col) => (
                  <TableCell key={col.header} className="text-xs text-slate-200 py-3.5 px-4 font-medium">
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}