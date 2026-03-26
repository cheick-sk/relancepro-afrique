export async function connectQuickBooks(): Promise<{ url: string }> {
  return { url: 'https://quickbooks.com/oauth' };
}

export async function handleCallback(params: Record<string, string>): Promise<{ success: boolean }> {
  return { success: true };
}

export async function fetchInvoices(userId: string): Promise<unknown[]> {
  return [];
}

export async function fetchClients(userId: string): Promise<unknown[]> {
  return [];
}

export async function syncInvoices(userId: string): Promise<{ synced: number }> {
  return { synced: 0 };
}

export async function syncClients(userId: string): Promise<{ synced: number }> {
  return { synced: 0 };
}
