export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export type NotificationType = 
  | 'payment_received'
  | 'reminder_sent'
  | 'client_created'
  | 'debt_overdue'
  | 'invoice_generated'
  | 'system';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface NotificationTypeConfig {
  id: NotificationType;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  { id: 'payment_received', label: 'Paiement reçu', description: 'Quand un client paie une facture', defaultEnabled: true },
  { id: 'reminder_sent', label: 'Relance envoyée', description: 'Quand une relance est envoyée', defaultEnabled: true },
  { id: 'client_created', label: 'Nouveau client', description: 'Quand un nouveau client est ajouté', defaultEnabled: true },
  { id: 'debt_overdue', label: 'Créance en retard', description: 'Quand une créance dépasse sa date d\'échéance', defaultEnabled: true },
  { id: 'invoice_generated', label: 'Facture générée', description: 'Quand une facture est générée', defaultEnabled: false },
  { id: 'system', label: 'Notifications système', description: 'Mises à jour et alertes système', defaultEnabled: true },
];

// Stub implementations
export async function subscribeUser(userId: string, subscription: PushSubscription): Promise<void> {
  console.log('Subscribing user:', userId);
}

export async function unsubscribeUser(userId: string, endpoint?: string): Promise<void> {
  console.log('Unsubscribing user:', userId);
}

export async function getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
  return [];
}

export async function getUserPreferences(userId: string): Promise<NotificationPreferences> {
  return { email: true, push: true, sms: true, whatsapp: true };
}

export async function updateUserPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<void> {
  console.log('Updating preferences:', userId, prefs);
}

export async function sendPushNotification(userId: string, payload: PushPayload): Promise<boolean> {
  console.log('Sending push notification:', userId, payload.title);
  return true;
}

export async function broadcastNotification(userIds: string[], payload: PushPayload): Promise<void> {
  console.log('Broadcasting notification to', userIds.length, 'users');
}

export function notifyNewDebt(userId: string, debt: { id: string; amount: number }): void {
  console.log('Notifying new debt:', userId, debt);
}

export function notifyReminderSent(userId: string, reminder: { id: string; type: string }): void {
  console.log('Notifying reminder sent:', userId, reminder);
}
