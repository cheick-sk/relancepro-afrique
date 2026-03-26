import type { SMSResult, AfricasTalkingSMSWebhook, AfricasTalkingVoiceWebhook } from './types';

export function handleWebhook(payload: AfricasTalkingSMSWebhook): void {
  console.log('Africa\'s Talking webhook:', payload);
}

export function handleVoiceWebhook(payload: AfricasTalkingVoiceWebhook): void {
  console.log('Africa\'s Talking voice webhook:', payload);
}

export function handleDeliveryReport(payload: AfricasTalkingSMSWebhook): void {
  console.log('Africa\'s Talking delivery report:', payload);
}

export function handleVoiceCallStatus(payload: AfricasTalkingVoiceWebhook): void {
  console.log('Africa\'s Talking voice call status:', payload);
}

export async function sendSMSViaAT(to: string, message: string): Promise<SMSResult> {
  return { success: true, messageId: `at_${Date.now()}` };
}
