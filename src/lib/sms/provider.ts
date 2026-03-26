import type { SMSResult } from './config';
import { validateAfricanPhone, estimateSMSCost, selectBestProvider } from './service';

export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{ success: number; failed: number; results: SMSResult[] }> {
  const results: SMSResult[] = [];
  let success = 0;
  let failed = 0;

  for (const recipient of recipients) {
    if (!validateAfricanPhone(recipient)) {
      results.push({ success: false, error: 'Invalid phone number' });
      failed++;
      continue;
    }

    // Simulate sending
    results.push({ success: true, messageId: `msg_${Date.now()}_${recipient}` });
    success++;
  }

  return { success, failed, results };
}

export { validateAfricanPhone, estimateSMSCost, selectBestProvider };
