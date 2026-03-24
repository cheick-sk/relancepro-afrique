/**
 * Notification Types Configuration for RelancePro Africa
 * Defines all notification types with templates, icons, and colors
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CreditCard,
  AlertTriangle,
  Users,
  Calendar,
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  FileText,
  Settings,
  Shield,
} from 'lucide-react';

// =====================================================
// NOTIFICATION TYPE DEFINITIONS
// =====================================================

/**
 * All supported notification types
 */
export const NOTIFICATION_TYPES = {
  // Payment related
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REMINDER: 'payment_reminder',

  // Reminder related
  REMINDER_SENT: 'reminder_sent',
  REMINDER_FAILED: 'reminder_failed',
  REMINDER_SCHEDULED: 'reminder_scheduled',

  // Debt related
  DEBT_OVERDUE: 'debt_overdue',
  DEBT_CREATED: 'debt_created',
  DEBT_UPDATED: 'debt_updated',
  DEBT_PAID: 'debt_paid',

  // Client related
  CLIENT_RESPONDED: 'client_responded',
  CLIENT_CREATED: 'client_created',
  CLIENT_UPDATED: 'client_updated',

  // System related
  WEEKLY_SUMMARY: 'weekly_summary',
  MONTHLY_REPORT: 'monthly_report',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',

  // Security related
  SECURITY_ALERT: 'security_alert',
  NEW_LOGIN: 'new_login',
  PASSWORD_CHANGED: 'password_changed',
  TWO_FACTOR_ENABLED: 'two_factor_enabled',

  // System notifications
  SYSTEM_UPDATE: 'system_update',
  SYSTEM_MAINTENANCE: 'system_maintenance',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// =====================================================
// NOTIFICATION CATEGORIES
// =====================================================

export const NOTIFICATION_CATEGORIES = {
  PAYMENTS: 'payments',
  REMINDERS: 'reminders',
  DEBTS: 'debts',
  CLIENTS: 'clients',
  REPORTS: 'reports',
  SUBSCRIPTION: 'subscription',
  SECURITY: 'security',
  SYSTEM: 'system',
} as const;

export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[keyof typeof NOTIFICATION_CATEGORIES];

// =====================================================
// NOTIFICATION TYPE CONFIGURATION
// =====================================================

export interface NotificationTypeConfig {
  id: NotificationType;
  category: NotificationCategory;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  defaultChannels: {
    push: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  template: NotificationTemplate;
  actions?: NotificationAction[];
  sound?: string;
}

export interface NotificationTemplate {
  titleFr: string;
  titleEn: string;
  bodyFr: (data: Record<string, unknown>) => string;
  bodyEn: (data: Record<string, unknown>) => string;
}

export interface NotificationAction {
  id: string;
  label: string;
  labelEn: string;
  url?: string;
}

// =====================================================
// NOTIFICATION TYPE CONFIGURATIONS
// =====================================================

export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationTypeConfig> = {
  // Payment notifications
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
    id: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    label: 'Paiement reçu',
    labelEn: 'Payment received',
    description: 'Quand un client effectue un paiement',
    descriptionEn: 'When a client makes a payment',
    icon: CreditCard,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    borderColor: 'border-green-200 dark:border-green-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Paiement reçu',
      titleEn: 'Payment received',
      bodyFr: (data) => `${data.clientName} a payé ${data.amount} ${data.currency}`,
      bodyEn: (data) => `${data.clientName} paid ${data.amount} ${data.currency}`,
    },
    actions: [
      { id: 'view', label: 'Voir détails', labelEn: 'View details', url: '/debts?id=' },
      { id: 'receipt', label: 'Reçu', labelEn: 'Receipt' },
    ],
    sound: 'payment',
  },

  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    id: NOTIFICATION_TYPES.PAYMENT_FAILED,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    label: 'Paiement échoué',
    labelEn: 'Payment failed',
    description: 'Quand un paiement échoue',
    descriptionEn: 'When a payment fails',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    borderColor: 'border-red-200 dark:border-red-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Paiement échoué',
      titleEn: 'Payment failed',
      bodyFr: (data) => `Le paiement de ${data.amount} ${data.currency} a échoué. Raison: ${data.reason}`,
      bodyEn: (data) => `Payment of ${data.amount} ${data.currency} failed. Reason: ${data.reason}`,
    },
    sound: 'error',
  },

  [NOTIFICATION_TYPES.PAYMENT_REMINDER]: {
    id: NOTIFICATION_TYPES.PAYMENT_REMINDER,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    label: 'Rappel de paiement',
    labelEn: 'Payment reminder',
    description: 'Rappel avant échéance de paiement',
    descriptionEn: 'Reminder before payment due date',
    icon: Clock,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/50',
    borderColor: 'border-orange-200 dark:border-orange-800',
    priority: 'normal',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Rappel de paiement',
      titleEn: 'Payment reminder',
      bodyFr: (data) => `Créance de ${data.clientName} (${data.amount} ${data.currency}) à échéance ${data.dueDate}`,
      bodyEn: (data) => `Debt from ${data.clientName} (${data.amount} ${data.currency}) due on ${data.dueDate}`,
    },
  },

  // Reminder notifications
  [NOTIFICATION_TYPES.REMINDER_SENT]: {
    id: NOTIFICATION_TYPES.REMINDER_SENT,
    category: NOTIFICATION_CATEGORIES.REMINDERS,
    label: 'Relance envoyée',
    labelEn: 'Reminder sent',
    description: 'Confirmation d\'envoi d\'une relance',
    descriptionEn: 'Confirmation of a reminder sent',
    icon: Bell,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'normal',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Relance envoyée',
      titleEn: 'Reminder sent',
      bodyFr: (data) => `Relance ${data.channel === 'email' ? 'email' : 'WhatsApp'} envoyée à ${data.clientName}`,
      bodyEn: (data) => `${data.channel === 'email' ? 'Email' : 'WhatsApp'} reminder sent to ${data.clientName}`,
    },
    actions: [
      { id: 'view', label: 'Voir', labelEn: 'View', url: '/reminders' },
    ],
  },

  [NOTIFICATION_TYPES.REMINDER_FAILED]: {
    id: NOTIFICATION_TYPES.REMINDER_FAILED,
    category: NOTIFICATION_CATEGORIES.REMINDERS,
    label: 'Relance échouée',
    labelEn: 'Reminder failed',
    description: 'Échec d\'envoi d\'une relance',
    descriptionEn: 'Failed to send a reminder',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    borderColor: 'border-red-200 dark:border-red-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Relance échouée',
      titleEn: 'Reminder failed',
      bodyFr: (data) => `Échec d'envoi de relance à ${data.clientName}. Erreur: ${data.error}`,
      bodyEn: (data) => `Failed to send reminder to ${data.clientName}. Error: ${data.error}`,
    },
    sound: 'error',
  },

  [NOTIFICATION_TYPES.REMINDER_SCHEDULED]: {
    id: NOTIFICATION_TYPES.REMINDER_SCHEDULED,
    category: NOTIFICATION_CATEGORIES.REMINDERS,
    label: 'Relance planifiée',
    labelEn: 'Reminder scheduled',
    description: 'Relance planifiée automatiquement',
    descriptionEn: 'Automatically scheduled reminder',
    icon: Clock,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
    priority: 'low',
    defaultChannels: { push: false, email: false, whatsapp: false },
    template: {
      titleFr: 'Relance planifiée',
      titleEn: 'Reminder scheduled',
      bodyFr: (data) => `Relance planifiée pour ${data.clientName} le ${data.scheduledDate}`,
      bodyEn: (data) => `Reminder scheduled for ${data.clientName} on ${data.scheduledDate}`,
    },
  },

  // Debt notifications
  [NOTIFICATION_TYPES.DEBT_OVERDUE]: {
    id: NOTIFICATION_TYPES.DEBT_OVERDUE,
    category: NOTIFICATION_CATEGORIES.DEBTS,
    label: 'Créance en retard',
    labelEn: 'Overdue debt',
    description: 'Alerte quand une créance dépasse l\'échéance',
    descriptionEn: 'Alert when a debt is overdue',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    borderColor: 'border-red-200 dark:border-red-800',
    priority: 'urgent',
    defaultChannels: { push: true, email: true, whatsapp: true },
    template: {
      titleFr: 'Créance en retard',
      titleEn: 'Overdue debt',
      bodyFr: (data) => `La créance de ${data.clientName} (${data.amount} ${data.currency}) est en retard de ${data.daysOverdue} jours`,
      bodyEn: (data) => `Debt from ${data.clientName} (${data.amount} ${data.currency}) is ${data.daysOverdue} days overdue`,
    },
    actions: [
      { id: 'view', label: 'Voir', labelEn: 'View', url: '/debts?id=' },
      { id: 'remind', label: 'Relancer', labelEn: 'Send reminder' },
    ],
    sound: 'alert',
  },

  [NOTIFICATION_TYPES.DEBT_CREATED]: {
    id: NOTIFICATION_TYPES.DEBT_CREATED,
    category: NOTIFICATION_CATEGORIES.DEBTS,
    label: 'Créance créée',
    labelEn: 'Debt created',
    description: 'Nouvelle créance ajoutée',
    descriptionEn: 'New debt added',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'low',
    defaultChannels: { push: false, email: false, whatsapp: false },
    template: {
      titleFr: 'Nouvelle créance',
      titleEn: 'New debt',
      bodyFr: (data) => `Créance de ${data.amount} ${data.currency} créée pour ${data.clientName}`,
      bodyEn: (data) => `Debt of ${data.amount} ${data.currency} created for ${data.clientName}`,
    },
  },

  [NOTIFICATION_TYPES.DEBT_UPDATED]: {
    id: NOTIFICATION_TYPES.DEBT_UPDATED,
    category: NOTIFICATION_CATEGORIES.DEBTS,
    label: 'Créance mise à jour',
    labelEn: 'Debt updated',
    description: 'Créance modifiée',
    descriptionEn: 'Debt modified',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'low',
    defaultChannels: { push: false, email: false, whatsapp: false },
    template: {
      titleFr: 'Créance mise à jour',
      titleEn: 'Debt updated',
      bodyFr: (data) => `Créance de ${data.clientName} mise à jour`,
      bodyEn: (data) => `Debt for ${data.clientName} updated`,
    },
  },

  [NOTIFICATION_TYPES.DEBT_PAID]: {
    id: NOTIFICATION_TYPES.DEBT_PAID,
    category: NOTIFICATION_CATEGORIES.DEBTS,
    label: 'Créance payée',
    labelEn: 'Debt paid',
    description: 'Créance entièrement payée',
    descriptionEn: 'Debt fully paid',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    borderColor: 'border-green-200 dark:border-green-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Créance payée',
      titleEn: 'Debt paid',
      bodyFr: (data) => `La créance de ${data.clientName} (${data.amount} ${data.currency}) a été entièrement payée`,
      bodyEn: (data) => `Debt from ${data.clientName} (${data.amount} ${data.currency}) has been fully paid`,
    },
    sound: 'success',
  },

  // Client notifications
  [NOTIFICATION_TYPES.CLIENT_RESPONDED]: {
    id: NOTIFICATION_TYPES.CLIENT_RESPONDED,
    category: NOTIFICATION_CATEGORIES.CLIENTS,
    label: 'Client a répondu',
    labelEn: 'Client responded',
    description: 'Quand un client répond à une relance',
    descriptionEn: 'When a client responds to a reminder',
    icon: MessageSquare,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/50',
    borderColor: 'border-teal-200 dark:border-teal-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Client a répondu',
      titleEn: 'Client responded',
      bodyFr: (data) => `${data.clientName} a répondu: "${data.message}"`,
      bodyEn: (data) => `${data.clientName} responded: "${data.message}"`,
    },
    actions: [
      { id: 'view', label: 'Voir', labelEn: 'View', url: '/clients?id=' },
      { id: 'reply', label: 'Répondre', labelEn: 'Reply' },
    ],
  },

  [NOTIFICATION_TYPES.CLIENT_CREATED]: {
    id: NOTIFICATION_TYPES.CLIENT_CREATED,
    category: NOTIFICATION_CATEGORIES.CLIENTS,
    label: 'Client créé',
    labelEn: 'Client created',
    description: 'Nouveau client ajouté',
    descriptionEn: 'New client added',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'low',
    defaultChannels: { push: false, email: false, whatsapp: false },
    template: {
      titleFr: 'Nouveau client',
      titleEn: 'New client',
      bodyFr: (data) => `Client ${data.clientName} ajouté avec succès`,
      bodyEn: (data) => `Client ${data.clientName} added successfully`,
    },
  },

  [NOTIFICATION_TYPES.CLIENT_UPDATED]: {
    id: NOTIFICATION_TYPES.CLIENT_UPDATED,
    category: NOTIFICATION_CATEGORIES.CLIENTS,
    label: 'Client mis à jour',
    labelEn: 'Client updated',
    description: 'Informations client modifiées',
    descriptionEn: 'Client information modified',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'low',
    defaultChannels: { push: false, email: false, whatsapp: false },
    template: {
      titleFr: 'Client mis à jour',
      titleEn: 'Client updated',
      bodyFr: (data) => `Informations de ${data.clientName} mises à jour`,
      bodyEn: (data) => `${data.clientName}'s information updated`,
    },
  },

  // Report notifications
  [NOTIFICATION_TYPES.WEEKLY_SUMMARY]: {
    id: NOTIFICATION_TYPES.WEEKLY_SUMMARY,
    category: NOTIFICATION_CATEGORIES.REPORTS,
    label: 'Résumé hebdomadaire',
    labelEn: 'Weekly summary',
    description: 'Bilan de vos activités chaque semaine',
    descriptionEn: 'Weekly activity summary',
    icon: Calendar,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    priority: 'low',
    defaultChannels: { push: false, email: true, whatsapp: false },
    template: {
      titleFr: 'Résumé hebdomadaire',
      titleEn: 'Weekly summary',
      bodyFr: (data) => `${data.remindersSent} relances envoyées, ${data.paymentsReceived} paiements reçus cette semaine`,
      bodyEn: (data) => `${data.remindersSent} reminders sent, ${data.paymentsReceived} payments received this week`,
    },
    actions: [
      { id: 'view', label: 'Voir le rapport', labelEn: 'View report', url: '/reports' },
    ],
  },

  [NOTIFICATION_TYPES.MONTHLY_REPORT]: {
    id: NOTIFICATION_TYPES.MONTHLY_REPORT,
    category: NOTIFICATION_CATEGORIES.REPORTS,
    label: 'Rapport mensuel',
    labelEn: 'Monthly report',
    description: 'Rapport mensuel d\'activité',
    descriptionEn: 'Monthly activity report',
    icon: TrendingUp,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    priority: 'low',
    defaultChannels: { push: false, email: true, whatsapp: false },
    template: {
      titleFr: 'Rapport mensuel',
      titleEn: 'Monthly report',
      bodyFr: (data) => `Rapport de ${data.month} disponible: ${data.totalCollected} collectés`,
      bodyEn: (data) => `${data.month} report available: ${data.totalCollected} collected`,
    },
    actions: [
      { id: 'view', label: 'Voir le rapport', labelEn: 'View report', url: '/reports' },
    ],
  },

  // Subscription notifications
  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: {
    id: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
    category: NOTIFICATION_CATEGORIES.SUBSCRIPTION,
    label: 'Abonnement expire bientôt',
    labelEn: 'Subscription expiring',
    description: 'Rappel avant expiration de l\'abonnement',
    descriptionEn: 'Reminder before subscription expires',
    icon: Crown,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Abonnement expire bientôt',
      titleEn: 'Subscription expiring',
      bodyFr: (data) => `Votre abonnement ${data.planName} expire dans ${data.daysRemaining} jours`,
      bodyEn: (data) => `Your ${data.planName} subscription expires in ${data.daysRemaining} days`,
    },
    actions: [
      { id: 'renew', label: 'Renouveler', labelEn: 'Renew', url: '/subscription' },
    ],
  },

  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED]: {
    id: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED,
    category: NOTIFICATION_CATEGORIES.SUBSCRIPTION,
    label: 'Abonnement expiré',
    labelEn: 'Subscription expired',
    description: 'Abonnement arrivé à expiration',
    descriptionEn: 'Subscription has expired',
    icon: Crown,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    borderColor: 'border-red-200 dark:border-red-800',
    priority: 'urgent',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Abonnement expiré',
      titleEn: 'Subscription expired',
      bodyFr: (data) => `Votre abonnement ${data.planName} a expiré. Renouvelez pour continuer à utiliser toutes les fonctionnalités.`,
      bodyEn: (data) => `Your ${data.planName} subscription has expired. Renew to continue using all features.`,
    },
    actions: [
      { id: 'renew', label: 'Renouveler', labelEn: 'Renew', url: '/subscription' },
    ],
    sound: 'alert',
  },

  [NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED]: {
    id: NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED,
    category: NOTIFICATION_CATEGORIES.SUBSCRIPTION,
    label: 'Abonnement renouvelé',
    labelEn: 'Subscription renewed',
    description: 'Abonnement renouvelé avec succès',
    descriptionEn: 'Subscription renewed successfully',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    borderColor: 'border-green-200 dark:border-green-800',
    priority: 'normal',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Abonnement renouvelé',
      titleEn: 'Subscription renewed',
      bodyFr: (data) => `Votre abonnement ${data.planName} a été renouvelé jusqu'au ${data.expiryDate}`,
      bodyEn: (data) => `Your ${data.planName} subscription has been renewed until ${data.expiryDate}`,
    },
    sound: 'success',
  },

  // Security notifications
  [NOTIFICATION_TYPES.SECURITY_ALERT]: {
    id: NOTIFICATION_TYPES.SECURITY_ALERT,
    category: NOTIFICATION_CATEGORIES.SECURITY,
    label: 'Alerte de sécurité',
    labelEn: 'Security alert',
    description: 'Alerte de sécurité importante',
    descriptionEn: 'Important security alert',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    borderColor: 'border-red-200 dark:border-red-800',
    priority: 'urgent',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Alerte de sécurité',
      titleEn: 'Security alert',
      bodyFr: (data) => `${data.message}`,
      bodyEn: (data) => `${data.message}`,
    },
    actions: [
      { id: 'review', label: 'Examiner', labelEn: 'Review', url: '/settings/security' },
    ],
    sound: 'alert',
  },

  [NOTIFICATION_TYPES.NEW_LOGIN]: {
    id: NOTIFICATION_TYPES.NEW_LOGIN,
    category: NOTIFICATION_CATEGORIES.SECURITY,
    label: 'Nouvelle connexion',
    labelEn: 'New login',
    description: 'Connexion depuis un nouvel appareil',
    descriptionEn: 'Login from a new device',
    icon: Shield,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Nouvelle connexion',
      titleEn: 'New login',
      bodyFr: (data) => `Connexion détectée depuis ${data.device} à ${data.location}`,
      bodyEn: (data) => `Login detected from ${data.device} at ${data.location}`,
    },
    actions: [
      { id: 'sessions', label: 'Gérer les sessions', labelEn: 'Manage sessions', url: '/settings/security' },
      { id: 'revoke', label: 'Ce n\'est pas moi', labelEn: 'Not me' },
    ],
  },

  [NOTIFICATION_TYPES.PASSWORD_CHANGED]: {
    id: NOTIFICATION_TYPES.PASSWORD_CHANGED,
    category: NOTIFICATION_CATEGORIES.SECURITY,
    label: 'Mot de passe modifié',
    labelEn: 'Password changed',
    description: 'Mot de passe changé avec succès',
    descriptionEn: 'Password changed successfully',
    icon: Shield,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    borderColor: 'border-green-200 dark:border-green-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Mot de passe modifié',
      titleEn: 'Password changed',
      bodyFr: () => 'Votre mot de passe a été modifié avec succès',
      bodyEn: () => 'Your password has been changed successfully',
    },
  },

  [NOTIFICATION_TYPES.TWO_FACTOR_ENABLED]: {
    id: NOTIFICATION_TYPES.TWO_FACTOR_ENABLED,
    category: NOTIFICATION_CATEGORIES.SECURITY,
    label: '2FA activé',
    labelEn: '2FA enabled',
    description: 'Authentification à deux facteurs activée',
    descriptionEn: 'Two-factor authentication enabled',
    icon: Shield,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    borderColor: 'border-green-200 dark:border-green-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: '2FA activé',
      titleEn: '2FA enabled',
      bodyFr: () => 'L\'authentification à deux facteurs a été activée sur votre compte',
      bodyEn: () => 'Two-factor authentication has been enabled on your account',
    },
  },

  // System notifications
  [NOTIFICATION_TYPES.SYSTEM_UPDATE]: {
    id: NOTIFICATION_TYPES.SYSTEM_UPDATE,
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    label: 'Mise à jour système',
    labelEn: 'System update',
    description: 'Mise à jour du système',
    descriptionEn: 'System update',
    icon: Settings,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/50',
    borderColor: 'border-gray-200 dark:border-gray-800',
    priority: 'normal',
    defaultChannels: { push: false, email: false, whatsapp: false },
    template: {
      titleFr: 'Mise à jour système',
      titleEn: 'System update',
      bodyFr: (data) => `${data.message}`,
      bodyEn: (data) => `${data.message}`,
    },
  },

  [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE]: {
    id: NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    label: 'Maintenance système',
    labelEn: 'System maintenance',
    description: 'Maintenance programmée',
    descriptionEn: 'Scheduled maintenance',
    icon: Settings,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
    priority: 'high',
    defaultChannels: { push: true, email: true, whatsapp: false },
    template: {
      titleFr: 'Maintenance système',
      titleEn: 'System maintenance',
      bodyFr: (data) => `Maintenance programmée le ${data.date} de ${data.startTime} à ${data.endTime}`,
      bodyEn: (data) => `Scheduled maintenance on ${data.date} from ${data.startTime} to ${data.endTime}`,
    },
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get notification config by type
 */
export function getNotificationConfig(type: NotificationType): NotificationTypeConfig | undefined {
  return NOTIFICATION_CONFIGS[type];
}

/**
 * Get all notification types by category
 */
export function getNotificationsByCategory(category: NotificationCategory): NotificationTypeConfig[] {
  return Object.values(NOTIFICATION_CONFIGS).filter(config => config.category === category);
}

/**
 * Get all notification types sorted by priority
 */
export function getNotificationsSortedByPriority(): NotificationTypeConfig[] {
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  return Object.values(NOTIFICATION_CONFIGS).sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

/**
 * Generate notification title based on language
 */
export function getNotificationTitle(type: NotificationType, lang: 'fr' | 'en' = 'fr'): string {
  const config = NOTIFICATION_CONFIGS[type];
  if (!config) return '';
  return lang === 'fr' ? config.template.titleFr : config.template.titleEn;
}

/**
 * Generate notification body based on language and data
 */
export function getNotificationBody(
  type: NotificationType,
  data: Record<string, unknown>,
  lang: 'fr' | 'en' = 'fr'
): string {
  const config = NOTIFICATION_CONFIGS[type];
  if (!config) return '';
  return lang === 'fr'
    ? config.template.bodyFr(data)
    : config.template.bodyEn(data);
}

/**
 * Get notification icon component
 */
export function getNotificationIcon(type: NotificationType): LucideIcon {
  const config = NOTIFICATION_CONFIGS[type];
  return config?.icon || Bell;
}

/**
 * Get notification color classes
 */
export function getNotificationColors(type: NotificationType): {
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const config = NOTIFICATION_CONFIGS[type];
  return {
    color: config?.color || 'text-gray-600 dark:text-gray-400',
    bgColor: config?.bgColor || 'bg-gray-100 dark:bg-gray-900/50',
    borderColor: config?.borderColor || 'border-gray-200 dark:border-gray-800',
  };
}

/**
 * Get default notification preferences
 */
export function getDefaultNotificationPreferences(): Record<NotificationType, {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
}> {
  const defaults: Record<string, { push: boolean; email: boolean; whatsapp: boolean }> = {};
  
  for (const [type, config] of Object.entries(NOTIFICATION_CONFIGS)) {
    defaults[type] = config.defaultChannels;
  }
  
  return defaults as Record<NotificationType, { push: boolean; email: boolean; whatsapp: boolean }>;
}

/**
 * Check if notification type is urgent
 */
export function isUrgentNotification(type: NotificationType): boolean {
  const config = NOTIFICATION_CONFIGS[type];
  return config?.priority === 'urgent';
}

/**
 * Get notification sound
 */
export function getNotificationSound(type: NotificationType): string | undefined {
  const config = NOTIFICATION_CONFIGS[type];
  return config?.sound;
}

// =====================================================
// NOTIFICATION TYPE LISTS
// =====================================================

/**
 * All notification types as an array
 */
export const ALL_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPES);

/**
 * User-configurable notification types (excludes system alerts)
 */
export const USER_CONFIGURABLE_TYPES: NotificationType[] = [
  NOTIFICATION_TYPES.PAYMENT_RECEIVED,
  NOTIFICATION_TYPES.REMINDER_SENT,
  NOTIFICATION_TYPES.DEBT_OVERDUE,
  NOTIFICATION_TYPES.CLIENT_RESPONDED,
  NOTIFICATION_TYPES.WEEKLY_SUMMARY,
  NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
];

/**
 * High priority notification types
 */
export const HIGH_PRIORITY_TYPES: NotificationType[] = Object.values(NOTIFICATION_CONFIGS)
  .filter(config => config.priority === 'high' || config.priority === 'urgent')
  .map(config => config.id);
