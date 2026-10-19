// Turns rows of text into CSV. A cell that starts with = + - or @ can run as a
// formula when the file is opened in Excel, so a quote is put in front to make
// it plain text. Names and targets come from users, so this matters.
function cell(value: string): string {
  let text = value
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n')
}

// Starts a download in the browser. The byte-order mark at the start lets
// Excel read non-English text (such as Amharic names) correctly.
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}