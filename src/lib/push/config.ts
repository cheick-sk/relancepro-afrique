import type { PushPayload } from './service';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function getVapidConfig(): VapidConfig {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: `mailto:${process.env.VAPID_EMAIL || 'support@relancepro.africa'}`,
  };
}

export function isVapidConfigured(): boolean {
  const config = getVapidConfig();
  return !!(config.publicKey && config.privateKey);
}
