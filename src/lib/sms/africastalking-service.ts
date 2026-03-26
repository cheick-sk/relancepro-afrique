import type { AfricasTalkingSMSWebhook, AfricasTalkingVoiceWebhook } from './types';

export function handleDeliveryReport(payload: AfricasTalkingSMSWebhook): void {
  console.log('Africa\'s Talking delivery report:', payload);
}

export function handleVoiceCallStatus(payload: AfricasTalkingVoiceWebhook): void {
  console.log('Africa\'s Talking voice call status:', payload);
}
