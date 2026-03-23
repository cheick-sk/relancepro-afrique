// Push Notification Configuration for RelancePro Africa
// VAPID keys configuration and push notification settings

import crypto from 'crypto';

// VAPID configuration
export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

// Notification types supported by the system
export type NotificationType = 
  | 'debt.created'
  | 'debt.paid'
  | 'reminder.sent'
  | 'reminder.delivered'
  | 'daily.digest'
  | 'risk.alert'
  | 'payment.overdue'
  | 'payment.received'
  | 'client.responded'
  | 'subscription.warning'
  | 'subscription.expired'
  // Legacy types for backwards compatibility
  | 'reminder_sent'
  | 'reminder_delivered'
  | 'payment_received'
  | 'new_debt'
  | 'client_responded'
  | 'subscription_warning'
  | 'subscription_expired';

// Push payload structure
export interface PushPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data: {
    url: string;
    type: NotificationType;
    id: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// Notification preferences for a user
export interface NotificationPreferences {
  paymentReminders: boolean;  // Rappels de paiement
  newDebts: boolean;          // Nouvelles créances
  remindersSent: boolean;     // Relances envoyées
  subscription: boolean;      // Abonnement
  soundEnabled: boolean;      // Sound on/off
  quietHoursStart?: string;   // Quiet hours start (e.g., "22:00")
  quietHoursEnd?: string;     // Quiet hours end (e.g., "07:00")
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  paymentReminders: true,
  newDebts: true,
  remindersSent: true,
  subscription: true,
  soundEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// VAPID keys - In production, these should be environment variables
// Generate new keys with: npx web-push generate-vapid-keys
export function getVapidConfig(): VapidConfig {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || generateVapidPublicKey(),
    privateKey: process.env.VAPID_PRIVATE_KEY || generateVapidPrivateKey(),
    subject: process.env.VAPID_SUBJECT || 'mailto:support@relancepro.africa',
  };
}

// Generate a VAPID public key (for development)
function generateVapidPublicKey(): string {
  // In development, use a consistent key
  // In production, this should be a proper VAPID key
  return 'BNb9EkLcHhZJpBGrxNHcIMkYtJmDZfEeNhZmFjBkZGFkY2RkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODk=';
}

// Generate a VAPID private key (for development)
function generateVapidPrivateKey(): string {
  // In development, use a consistent key
  return 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';
}

// Generate new VAPID keys (run once and store in env)
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  // Generate a curve for VAPID
  const curve = crypto.createECDH('prime256v1');
  curve.generateKeys();
  
  const publicKey = curve.getPublicKey().toString('base64url');
  const privateKey = curve.getPrivateKey().toString('base64url');
  
  return {
    publicKey,
    privateKey,
  };
}

// Notification type configurations
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  title: string;
  icon: string;
  defaultSound: boolean;
  category: 'debt' | 'payment' | 'reminder' | 'alert' | 'subscription';
}> = {
  // New notification types
  'debt.created': {
    title: 'Nouvelle créance',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'debt',
  },
  'debt.paid': {
    title: 'Créance payée',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'payment',
  },
  'reminder.sent': {
    title: 'Relance envoyée',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'reminder',
  },
  'reminder.delivered': {
    title: 'Relance délivrée',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'reminder',
  },
  'daily.digest': {
    title: 'Résumé quotidien',
    icon: '/icons/icon-192x192.png',
    defaultSound: false,
    category: 'alert',
  },
  'risk.alert': {
    title: 'Alerte de risque',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'alert',
  },
  'payment.overdue': {
    title: 'Paiement en retard',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'alert',
  },
  'payment.received': {
    title: 'Paiement reçu',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'payment',
  },
  'client.responded': {
    title: 'Réponse client',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'reminder',
  },
  'subscription.warning': {
    title: 'Abonnement',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'subscription',
  },
  'subscription.expired': {
    title: 'Abonnement expiré',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'subscription',
  },
  // Legacy types (backwards compatibility)
  'reminder_sent': {
    title: 'Relance envoyée',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'reminder',
  },
  'reminder_delivered': {
    title: 'Relance délivrée',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'reminder',
  },
  'payment_received': {
    title: 'Paiement reçu',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'payment',
  },
  'new_debt': {
    title: 'Nouvelle créance',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'debt',
  },
  'client_responded': {
    title: 'Réponse client',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'reminder',
  },
  'subscription_warning': {
    title: 'Abonnement',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'subscription',
  },
  'subscription_expired': {
    title: 'Abonnement expiré',
    icon: '/icons/icon-192x192.png',
    defaultSound: true,
    category: 'subscription',
  },
};

// Icon paths for notifications
export const NOTIFICATION_ICONS = {
  default: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
  success: '/icons/success-96x96.png',
  warning: '/icons/warning-96x96.png',
  error: '/icons/error-96x96.png',
} as const;

// TTL for push notifications (in seconds)
export const PUSH_TTL = {
  default: 24 * 60 * 60, // 24 hours
  urgent: 60 * 60,       // 1 hour
  low: 7 * 24 * 60 * 60, // 7 days
} as const;

// Check if we're in quiet hours
export function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHours, startMinutes] = preferences.quietHoursStart.split(':').map(Number);
  const [endHours, endMinutes] = preferences.quietHoursEnd.split(':').map(Number);
  
  const startTime = startHours * 60 + startMinutes;
  const endTime = endHours * 60 + endMinutes;
  
  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }
  
  return currentTime >= startTime && currentTime < endTime;
}

// Create a standardized push payload
export function createPushPayload(
  type: NotificationType,
  data: {
    title?: string;
    body: string;
    url?: string;
    id: string;
    actions?: PushPayload['actions'];
  }
): PushPayload {
  const config = NOTIFICATION_TYPE_CONFIG[type];
  
  return {
    title: data.title || config.title,
    body: data.body,
    icon: config.icon,
    badge: NOTIFICATION_ICONS.badge,
    tag: `${type}-${data.id}`,
    data: {
      url: data.url || '/',
      type,
      id: data.id,
    },
    actions: data.actions,
  };
}
