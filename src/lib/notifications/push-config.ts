/**
 * Push Notifications Configuration for RelancePro Africa
 * VAPID (Voluntary Application Server Identification) keys configuration
 * for Web Push API authentication
 */

// VAPID configuration from environment variables
export const vapidConfig = {
  subject: process.env.VAPID_SUBJECT || 'mailto:contact@relancepro.africa',
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

/**
 * Check if VAPID keys are configured
 */
export function isVapidConfigured(): boolean {
  return !!(vapidConfig.publicKey && vapidConfig.privateKey);
}

/**
 * Get the public VAPID key (safe to expose to client)
 */
export function getVapidPublicKey(): string {
  return vapidConfig.publicKey;
}

/**
 * Validate VAPID keys format
 * VAPID public keys should be 65 bytes (130 hex chars or 87 base64 chars)
 */
export function validateVapidKeys(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!vapidConfig.publicKey) {
    errors.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
  } else if (vapidConfig.publicKey.length < 80) {
    errors.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY appears to be invalid (too short)');
  }
  
  if (!vapidConfig.privateKey) {
    errors.push('VAPID_PRIVATE_KEY is not set');
  } else if (vapidConfig.privateKey.length < 80) {
    errors.push('VAPID_PRIVATE_KEY appears to be invalid (too short)');
  }
  
  if (!vapidConfig.subject) {
    errors.push('VAPID_SUBJECT is not set');
  } else if (!vapidConfig.subject.startsWith('mailto:') && !vapidConfig.subject.startsWith('https://')) {
    errors.push('VAPID_SUBJECT should start with mailto: or https://');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate new VAPID keys (for initial setup)
 * Run this once to generate keys, then store them in environment variables
 * 
 * Usage in Node.js:
 * ```
 * const { generateVapidKeys } = require('./push-config');
 * const keys = generateVapidKeys();
 * console.log('Public Key:', keys.publicKey);
 * console.log('Private Key:', keys.privateKey);
 * ```
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } | null {
  // This is a placeholder - in production, use web-push library to generate keys
  // npx web-push generate-vapid-keys
  console.log('To generate VAPID keys, run: npx web-push generate-vapid-keys');
  return null;
}

/**
 * Subscription data structure
 */
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Notification types supported by RelancePro Africa
 */
export const NOTIFICATION_TYPES = {
  PAYMENT_RECEIVED: 'payment_received',
  REMINDER_SENT: 'reminder_sent',
  DEBT_OVERDUE: 'debt_overdue',
  CLIENT_RESPONDED: 'client_responded',
  WEEKLY_SUMMARY: 'weekly_summary',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

/**
 * Notification type labels (French)
 */
export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'Paiement reçu',
  [NOTIFICATION_TYPES.REMINDER_SENT]: 'Relance envoyée',
  [NOTIFICATION_TYPES.DEBT_OVERDUE]: 'Créance en retard',
  [NOTIFICATION_TYPES.CLIENT_RESPONDED]: 'Client a répondu',
  [NOTIFICATION_TYPES.WEEKLY_SUMMARY]: 'Résumé hebdomadaire',
  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: 'Abonnement expire bientôt',
};

/**
 * Default notification preferences by type
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationType, {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
}> = {
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: { push: true, email: true, whatsapp: false },
  [NOTIFICATION_TYPES.REMINDER_SENT]: { push: true, email: true, whatsapp: false },
  [NOTIFICATION_TYPES.DEBT_OVERDUE]: { push: true, email: true, whatsapp: true },
  [NOTIFICATION_TYPES.CLIENT_RESPONDED]: { push: true, email: true, whatsapp: false },
  [NOTIFICATION_TYPES.WEEKLY_SUMMARY]: { push: false, email: true, whatsapp: false },
  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: { push: true, email: true, whatsapp: false },
};

/**
 * Push notification payload structure
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type: NotificationType;
    url?: string;
    [key: string]: unknown;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 * Required for the PushManager.subscribe() method
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = Buffer.from(base64, 'base64');
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData[i];
  }

  return outputArray;
}

/**
 * Check if current time is within quiet hours
 */
export function isInQuietHours(
  startTime: string | null,
  endTime: string | null
): boolean {
  if (!startTime || !endTime) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);

  const startMinutes = startHours * 60 + startMins;
  const endMinutes = endHours * 60 + endMins;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Same day quiet hours (e.g., 13:00 - 14:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
