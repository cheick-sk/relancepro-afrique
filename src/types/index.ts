// Types TypeScript pour RelancePro Africa

// =====================================================
// ENUMS
// =====================================================

export type SubscriptionStatus = 'free' | 'active' | 'expired';
export type SubscriptionPlan = 'starter' | 'business' | 'enterprise';
export type ClientStatus = 'active' | 'inactive' | 'blacklisted';
export type DebtStatus = 'pending' | 'paid' | 'partial' | 'disputed' | 'cancelled';
export type ReminderType = 'email' | 'whatsapp';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'opened';
export type PaymentStatus = 'pending' | 'success' | 'failed';

// =====================================================
// PROFILE - Utilisateur
// =====================================================

export interface Profile {
  id: string;
  email: string;
  password?: string | null;
  name: string | null;
  companyName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  whatsappApiKey: string | null;
  resendApiKey: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionEnd: Date | null;
  paystackCustomerId: string | null;
  paystackSubId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileCreate {
  email: string;
  name?: string;
  companyName?: string;
  password?: string;
}

export interface ProfileUpdate {
  name?: string;
  companyName?: string;
  phone?: string;
  avatarUrl?: string;
  whatsappApiKey?: string;
  resendApiKey?: string;
}

// =====================================================
// CLIENT - Débiteur
// =====================================================

export interface Client {
  id: string;
  profileId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
  debts?: Debt[];
  reminders?: Reminder[];
  debtCount?: number;
  totalDebt?: number;
  totalPaid?: number;
  balance?: number;
}

export interface ClientCreate {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
}

export interface ClientUpdate {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  status?: ClientStatus;
}

// =====================================================
// DEBT - Créance
// =====================================================

export interface Debt {
  id: string;
  clientId: string;
  profileId: string;
  reference: string | null;
  description: string | null;
  amount: number;
  currency: string;
  dueDate: Date;
  status: DebtStatus;
  paidAmount: number;
  paidDate: Date | null;
  reminderCount: number;
  lastReminderAt: Date | null;
  nextReminderAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client?: Client | { id: string; name: string; email?: string | null; phone?: string | null; company?: string | null };
  reminders?: Reminder[];
}

export interface DebtCreate {
  clientId: string;
  reference?: string;
  description?: string;
  amount: number;
  currency?: string;
  dueDate: Date;
}

export interface DebtUpdate {
  reference?: string;
  description?: string;
  amount?: number;
  currency?: string;
  dueDate?: Date;
  status?: DebtStatus;
  paidAmount?: number;
  paidDate?: Date;
}

// =====================================================
// REMINDER - Relance
// =====================================================

export interface Reminder {
  id: string;
  debtId: string;
  clientId: string;
  profileId: string;
  type: ReminderType;
  subject: string | null;
  message: string;
  status: ReminderStatus;
  error: string | null;
  responseReceived: boolean;
  responseMessage: string | null;
  respondedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  createdAt: Date;
  debt?: Debt;
  client?: Client;
}

export interface ReminderCreate {
  debtId: string;
  clientId: string;
  type: ReminderType;
  subject?: string;
  message: string;
}

// =====================================================
// SETTINGS - Configuration
// =====================================================

export interface Settings {
  id: string;
  profileId: string;
  emailSignature: string | null;
  emailSenderName: string | null;
  emailReplyTo: string | null;
  whatsappBusinessName: string | null;
  whatsappGreeting: string | null;
  emailTemplateReminder1: string | null;
  emailTemplateReminder2: string | null;
  emailTemplateReminder3: string | null;
  whatsappTemplateReminder1: string | null;
  whatsappTemplateReminder2: string | null;
  whatsappTemplateReminder3: string | null;
  autoRemindEnabled: boolean;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
  skipWeekends: boolean;
  reminderStartTime: string;
  reminderEndTime: string;
  maxReminders: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsUpdate {
  emailSignature?: string;
  emailSenderName?: string;
  emailReplyTo?: string;
  whatsappBusinessName?: string;
  whatsappGreeting?: string;
  emailTemplateReminder1?: string;
  emailTemplateReminder2?: string;
  emailTemplateReminder3?: string;
  whatsappTemplateReminder1?: string;
  whatsappTemplateReminder2?: string;
  whatsappTemplateReminder3?: string;
  autoRemindEnabled?: boolean;
  reminderDay1?: number;
  reminderDay2?: number;
  reminderDay3?: number;
  skipWeekends?: boolean;
  reminderStartTime?: string;
  reminderEndTime?: string;
  maxReminders?: number;
}

// =====================================================
// PAYMENT - Paiement
// =====================================================

export interface Payment {
  id: string;
  profileId: string;
  paystackRef: string;
  paystackTransId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  plan: SubscriptionPlan | null;
  metadata: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

// =====================================================
// DASHBOARD - Stats
// =====================================================

export interface DashboardStats {
  totalDebts: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  clientCount: number;
  reminderCount: number;
  recoveryRate: number;
}

export interface DebtWithClient extends Debt {
  client: Client;
}

// =====================================================
// API TYPES
// =====================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =====================================================
// NOTIFICATION
// =====================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionLabel?: string;
}

// =====================================================
// WEBHOOK
// =====================================================

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: Date;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}
