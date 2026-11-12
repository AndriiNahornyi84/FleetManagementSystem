/**
 * Data export utilities: CSV with UTF-8 BOM and print/PDF reporting
 */

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  // Semicolon separator is standard for Slovak/European regional Excel settings
  const delimiter = ';';
  const csvContent = [
    headers.map(escapeCsvValue).join(delimiter),
    ...rows.map(row => row.map(escapeCsvValue).join(delimiter))
  ].join('\r\n');

  // UTF-8 Byte Order Mark (BOM) prevents Excel from corrupting Slovak characters (ľ, š, č, ť, ž, á, é, í, ú)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function printReport() {
  window.print();
}
