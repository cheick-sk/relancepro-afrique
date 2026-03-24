// QuickBooks integration

export function connectQuickBooks(userId: string): string {
  return ""
}

export function handleCallback(code: string, state: string): Promise<any> {
  return Promise.resolve({})
}

export async function fetchInvoices(userId: string): Promise<any[]> {
  return []
}

export async function fetchClients(userId: string): Promise<any[]> {
  return []
}

export async function syncInvoices(userId: string): Promise<void> {}

export async function syncClients(userId: string): Promise<void> {}
