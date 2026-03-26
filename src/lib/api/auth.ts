export type ApiScope = 
  | 'read:clients'
  | 'write:clients'
  | 'read:debts'
  | 'write:debts'
  | 'read:reminders'
  | 'write:reminders'
  | 'read:analytics'
  | 'write:settings';

export interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  scopes: ApiScope[];
  userId: string;
  lastUsed?: Date;
  expiresAt?: Date;
}

export async function createApiKey(userId: string, name: string, scopes: ApiScope[]): Promise<ApiKeyData> {
  return {
    id: `key_${Date.now()}`,
    name,
    key: `rk_live_${Math.random().toString(36).substr(2, 32)}`,
    scopes,
    userId,
  };
}

export async function deleteApiKey(keyId: string): Promise<void> {
  console.log('Deleting API key:', keyId);
}

export async function updateApiKeyScopes(keyId: string, scopes: ApiScope[]): Promise<void> {
  console.log('Updating API key scopes:', keyId, scopes);
}

export async function requireScope(request: Request, scope: ApiScope): Promise<{ authorized: boolean; userId?: string }> {
  // Check authorization header for API key
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false };
  }
  
  return { authorized: true, userId: 'user_1' };
}

export function logApiUsage(keyId: string, endpoint: string, statusCode: number): void {
  console.log('API usage:', keyId, endpoint, statusCode);
}
