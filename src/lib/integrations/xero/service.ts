export async function connectXero(): Promise<{ url: string }> {
  return { url: 'https://xero.com/oauth' };
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
