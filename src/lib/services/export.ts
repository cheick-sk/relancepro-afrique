export type ExportType = 'clients' | 'debts' | 'payments' | 'reminders' | 'all';

export interface ExportOptions {
  type: ExportType;
  format: 'xlsx' | 'csv' | 'pdf';
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
}

export async function exportToExcel(
  data: unknown[],
  filename: string,
  options?: ExportOptions
): Promise<Buffer> {
  // Return empty buffer - would need xlsx library
  return Buffer.from('');
}

export async function exportAllToExcel(options: ExportOptions): Promise<Buffer> {
  return Buffer.from('');
}

export async function exportToPDF(
  data: unknown[],
  filename: string,
  options?: ExportOptions
): Promise<Buffer> {
  return Buffer.from('');
}

export function getExportFilename(type: ExportType, format: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `relancepro_${type}_${date}.${format}`;
}

export function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    pdf: 'application/pdf',
  };
  return mimeTypes[format] || 'application/octet-stream';
}
