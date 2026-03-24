// Demo mode utilities

export async function startDemo(userId: string): Promise<void> {}

export function getDemoUsage(userId: string): any {
  return { clients: 0, debts: 0, reminders: 0 }
}

export function isDemoActive(userId: string): boolean {
  return false
}

export function isInDemoMode(): boolean {
  return false
}

export function checkDemoLimits(userId: string, type: string): { allowed: boolean } {
  return { allowed: true }
}
