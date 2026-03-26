export interface QueueItem {
  id: string;
  type: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  createdAt: Date;
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  return { processed: 0, failed: 0 };
}

export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}> {
  return { pending: 0, processing: 0, sent: 0, failed: 0 };
}

export async function getPendingQueueItems(): Promise<QueueItem[]> {
  return [];
}

export async function getRateLimitStatus(): Promise<{ limited: boolean; remaining: number }> {
  return { limited: false, remaining: 100 };
}

export async function cancelQueueItem(itemId: string): Promise<void> {
  console.log('Canceling queue item:', itemId);
}

export async function retryFailedItems(): Promise<{ retried: number }> {
  return { retried: 0 };
}

export async function scheduleRemindersForOverdueDebts(): Promise<{ scheduled: number }> {
  return { scheduled: 0 };
}
