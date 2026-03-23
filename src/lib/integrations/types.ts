// Integration Types for RelancePro Africa
// Supports QuickBooks, Xero, Sage, and Wave accounting software

// =====================================================
// Integration Types
// =====================================================

export type IntegrationType = 'quickbooks' | 'xero' | 'sage' | 'wave';

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error' | 'pending';

export type SyncDirection = 'import' | 'export' | 'both';

export type SyncFrequency = 'hourly' | 'daily' | 'weekly' | 'manual';

export type SyncStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial';

// =====================================================
// Integration Configuration
// =====================================================

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  description: string;
  logo: string;
  region: string[];
  features: IntegrationFeature[];
  oauthConfig: OAuthConfig;
  apiBaseUrl: string;
}

export interface IntegrationFeature {
  name: string;
  description: string;
  supported: boolean;
}

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}

// =====================================================
// OAuth Types
// =====================================================

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: Date;
  tokenType: string;
}

export interface OAuthState {
  profileId: string;
  integrationType: IntegrationType;
  redirectUrl: string;
  timestamp: number;
}

// =====================================================
// Sync Settings
// =====================================================

export interface SyncSettings {
  syncDirection: SyncDirection;
  autoSync: boolean;
  syncFrequency: SyncFrequency;
  fieldMapping: FieldMapping;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

export interface FieldMapping {
  // Client field mapping
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  clientAddress?: string;
  
  // Invoice/Debt field mapping
  invoiceReference?: string;
  invoiceDescription?: string;
  invoiceAmount?: string;
  invoiceCurrency?: string;
  invoiceIssueDate?: string;
  invoiceDueDate?: string;
  invoiceStatus?: string;
  
  // Payment field mapping
  paymentAmount?: string;
  paymentDate?: string;
  paymentReference?: string;
}

// =====================================================
// External Data Types
// =====================================================

export interface ExternalInvoice {
  id: string;
  reference: string;
  description?: string;
  amount: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  client: ExternalClient;
  payments?: ExternalPayment[];
  totalPaid?: number;
  balance?: number;
}

export interface ExternalClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
}

export interface ExternalPayment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  date: Date;
  reference?: string;
  method?: string;
}

// =====================================================
// Sync Result Types
// =====================================================

export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  invoicesImported: number;
  invoicesExported: number;
  clientsImported: number;
  clientsExported: number;
  paymentsImported: number;
  paymentsExported: number;
  errors: SyncError[];
  startedAt: Date;
  completedAt?: Date;
}

export interface SyncError {
  type: 'invoice' | 'client' | 'payment' | 'connection' | 'auth' | 'unknown';
  externalId?: string;
  message: string;
  details?: string;
}

// =====================================================
// Integration Service Interface
// =====================================================

export interface IIntegrationService {
  // Authentication
  getAuthUrl(profileId: string, redirectUrl: string): Promise<string>;
  handleCallback(code: string, state: string): Promise<OAuthTokens>;
  refreshTokens(integration: IntegrationData): Promise<OAuthTokens>;
  disconnect(integration: IntegrationData): Promise<void>;
  
  // Data Fetching
  fetchInvoices(integration: IntegrationData, options?: FetchOptions): Promise<ExternalInvoice[]>;
  fetchClients(integration: IntegrationData, options?: FetchOptions): Promise<ExternalClient[]>;
  fetchPayments(integration: IntegrationData, options?: FetchOptions): Promise<ExternalPayment[]>;
  
  // Data Sync
  syncClients(integration: IntegrationData, direction: SyncDirection): Promise<SyncResult>;
  syncInvoices(integration: IntegrationData, direction: SyncDirection): Promise<SyncResult>;
  syncPayments(integration: IntegrationData, direction: SyncDirection): Promise<SyncResult>;
  
  // Write Operations
  pushPayment(integration: IntegrationData, payment: PaymentData): Promise<ExternalPayment>;
  pushClient(integration: IntegrationData, client: ClientData): Promise<ExternalClient>;
}

export interface IntegrationData {
  id: string;
  profileId: string;
  type: IntegrationType;
  accessToken: string;
  refreshToken: string;
  expiresAt?: Date;
  externalId?: string;
  externalName?: string;
  settings: SyncSettings;
}

export interface FetchOptions {
  limit?: number;
  offset?: number;
  modifiedSince?: Date;
  status?: string;
}

export interface PaymentData {
  invoiceId: string;
  amount: number;
  currency: string;
  date: Date;
  reference?: string;
  method?: string;
  notes?: string;
}

export interface ClientData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
}

// =====================================================
// Integration Configuration Data
// =====================================================

export const INTEGRATIONS: Record<IntegrationType, IntegrationConfig> = {
  quickbooks: {
    type: 'quickbooks',
    name: 'QuickBooks',
    description: 'Connect to QuickBooks Online to import invoices and sync clients.',
    logo: '/integrations/quickbooks.svg',
    region: ['International', 'US', 'UK', 'Canada', 'Australia'],
    features: [
      { name: 'Invoice Import', description: 'Import unpaid invoices as debts', supported: true },
      { name: 'Client Sync', description: 'Import and export client contacts', supported: true },
      { name: 'Payment Recording', description: 'Push payment records to QuickBooks', supported: true },
      { name: 'Auto Sync', description: 'Automatic scheduled synchronization', supported: true },
    ],
    oauthConfig: {
      authorizeUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      scopes: ['com.intuit.quickbooks.accounting', 'openid', 'profile', 'email'],
      clientIdEnv: 'QUICKBOOKS_CLIENT_ID',
      clientSecretEnv: 'QUICKBOOKS_CLIENT_SECRET',
    },
    apiBaseUrl: 'https://quickbooks.api.intuit.com/v3/company',
  },
  xero: {
    type: 'xero',
    name: 'Xero',
    description: 'Connect to Xero to import invoices and sync contacts.',
    logo: '/integrations/xero.svg',
    region: ['International', 'UK', 'Australia', 'New Zealand', 'South Africa'],
    features: [
      { name: 'Invoice Import', description: 'Import unpaid invoices as debts', supported: true },
      { name: 'Contact Sync', description: 'Import and export contacts', supported: true },
      { name: 'Payment Recording', description: 'Push payment records to Xero', supported: true },
      { name: 'Auto Sync', description: 'Automatic scheduled synchronization', supported: true },
    ],
    oauthConfig: {
      authorizeUrl: 'https://login.xero.com/identity/connect/authorize',
      tokenUrl: 'https://identity.xero.com/connect/token',
      scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
      clientIdEnv: 'XERO_CLIENT_ID',
      clientSecretEnv: 'XERO_CLIENT_SECRET',
    },
    apiBaseUrl: 'https://api.xero.com/api.xro/2.0',
  },
  sage: {
    type: 'sage',
    name: 'Sage',
    description: 'Connect to Sage Business Cloud to import invoices and sync contacts.',
    logo: '/integrations/sage.svg',
    region: ['Africa', 'Europe', 'UK', 'France', 'Germany', 'Spain'],
    features: [
      { name: 'Invoice Import', description: 'Import unpaid invoices as debts', supported: true },
      { name: 'Contact Sync', description: 'Import and export contacts', supported: true },
      { name: 'Payment Recording', description: 'Push payment records to Sage', supported: false },
      { name: 'Auto Sync', description: 'Automatic scheduled synchronization', supported: true },
    ],
    oauthConfig: {
      authorizeUrl: 'https://www.sageone.com/oauth2/auth/central',
      tokenUrl: 'https://oauth.accounting.sage.com/token',
      scopes: ['full_access', 'offline_access'],
      clientIdEnv: 'SAGE_CLIENT_ID',
      clientSecretEnv: 'SAGE_CLIENT_SECRET',
    },
    apiBaseUrl: 'https://api.accounting.sage.com/v3.1',
  },
  wave: {
    type: 'wave',
    name: 'Wave',
    description: 'Connect to Wave Accounting to import invoices and receipts.',
    logo: '/integrations/wave.svg',
    region: ['Africa', 'North America'],
    features: [
      { name: 'Invoice Import', description: 'Import unpaid invoices as debts', supported: true },
      { name: 'Customer Sync', description: 'Import and export customers', supported: true },
      { name: 'Receipt Import', description: 'Import receipts and expenses', supported: true },
      { name: 'Auto Sync', description: 'Automatic scheduled synchronization', supported: false },
    ],
    oauthConfig: {
      authorizeUrl: 'https://api.waveapps.com/oauth2/authorize',
      tokenUrl: 'https://api.waveapps.com/oauth2/token',
      scopes: ['user.read', 'business.read', 'accounting.read', 'accounting.write'],
      clientIdEnv: 'WAVE_CLIENT_ID',
      clientSecretEnv: 'WAVE_CLIENT_SECRET',
    },
    apiBaseUrl: 'https://gql.waveapps.com/graphql',
  },
};

// Helper function to get integration config
export function getIntegrationConfig(type: IntegrationType): IntegrationConfig | null {
  return INTEGRATIONS[type] || null;
}

// Helper function to check if environment variables are configured
export function isIntegrationConfigured(type: IntegrationType): boolean {
  const config = INTEGRATIONS[type];
  if (!config) return false;
  
  const clientId = process.env[config.oauthConfig.clientIdEnv];
  const clientSecret = process.env[config.oauthConfig.clientSecretEnv];
  
  return !!(clientId && clientSecret);
}
