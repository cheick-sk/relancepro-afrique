export interface DemoUsage {
  clients: number;
  debts: number;
  reminders: number;
  expiresAt: Date | null;
}

export function isInDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export function isDemoActive(userId: string): boolean {
  // Check if user is in demo period
  return false;
}

export function getDemoUsage(userId: string): DemoUsage {
  return {
    clients: 0,
    debts: 0,
    reminders: 0,
    expiresAt: null,
  };
}

export async function checkDemoLimits(
  userId: string,
  type: 'clients' | 'debts' | 'reminders'
): Promise<{ allowed: boolean; message?: string }> {
  return { allowed: true };
}

export async function startDemo(userId: string): Promise<void> {
  // Start demo period for user
}
