export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) return

  const header = columns.map(c => `"${c.header}"`).join(',')
  const rows = data.map(row =>
    columns.map(col => {
      let val = col.format ? col.format(row) : row[col.key]
      if (val === null || val === undefined) val = ''
      val = String(val).replace(/"/g, '""')
      return `"${val}"`
    }).join(',')
  )

  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
