// Reminder queue management

export async function processQueue(): Promise<void> {}

export async function getQueueStats(): Promise<{ pending: number; processing: number; completed: number }> {
  return { pending: 0, processing: 0, completed: 0 }
}

export async function getPendingQueueItems(): Promise<any[]> {
  return []
}

export async function getRateLimitStatus(): Promise<{ limited: boolean }> {
  return { limited: false }
}

export async function cancelQueueItem(id: string): Promise<void> {}

export async function retryFailedItems(): Promise<void> {}

export async function scheduleRemindersForOverdueDebts(): Promise<void> {}
