// Sage Integration Service for RelancePro Africa
// Implements OAuth2 authentication and sync operations for Sage Business Cloud

import {
  OAuthTokens,
  OAuthState,
  ExternalInvoice,
  ExternalClient,
  ExternalPayment,
  SyncResult,
  IntegrationData,
  FetchOptions,
  PaymentData,
  ClientData,
  getIntegrationConfig,
} from '../types';
import { decrypt } from '@/lib/encryption';

const SAGE_CONFIG = getIntegrationConfig('sage');

// =====================================================
// OAuth2 Authentication
// =====================================================

/**
 * Generate the authorization URL for Sage OAuth2 flow
 */
export async function connectSage(
  profileId: string,
  redirectUrl: string
): Promise<string> {
  if (!SAGE_CONFIG) {
    throw new Error('Sage integration not configured');
  }

  const clientId = process.env.SAGE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Sage client ID not configured');
  }

  // Create state parameter with profile info
  const state: OAuthState = {
    profileId,
    integrationType: 'sage',
    redirectUrl,
    timestamp: Date.now(),
  };
  
  const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: SAGE_CONFIG.oauthConfig.scopes.join(' '),
    redirect_uri: redirectUrl,
    state: encodedState,
  });

  return `${SAGE_CONFIG.oauthConfig.authorizeUrl}?${params.toString()}`;
}

/**
 * Handle OAuth2 callback and exchange code for tokens
 */
export async function handleCallback(
  code: string,
  state: string
): Promise<{
  tokens: OAuthTokens;
  profileId: string;
  businessId?: string;
  businessName?: string;
}> {
  if (!SAGE_CONFIG) {
    throw new Error('Sage integration not configured');
  }

  const clientId = process.env.SAGE_CLIENT_ID;
  const clientSecret = process.env.SAGE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Sage credentials not configured');
  }

  // Decode state
  const decodedState: OAuthState = JSON.parse(
    Buffer.from(state, 'base64').toString('utf-8')
  );

  // Exchange code for tokens
  const tokenUrl = SAGE_CONFIG.oauthConfig.tokenUrl;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: decodedState.redirectUrl,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sage token exchange failed: ${errorText}`);
  }

  const tokenData = await response.json();
  
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // Get business info
  const businessInfo = await getSageBusinessInfo(tokenData.access_token);

  return {
    tokens: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      expiresAt,
      tokenType: tokenData.token_type || 'Bearer',
    },
    profileId: decodedState.profileId,
    businessId: businessInfo?.id,
    businessName: businessInfo?.name,
  };
}

/**
 * Get Sage business information
 */
async function getSageBusinessInfo(accessToken: string): Promise<{ id: string; name: string } | null> {
  try {
    const response = await fetch(`${SAGE_CONFIG?.apiBaseUrl}/businesses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const business = data.$items?.[0];
    
    if (business) {
      return {
        id: business.id,
        name: business.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Refresh expired access token
 */
export async function refreshTokens(integration: IntegrationData): Promise<OAuthTokens> {
  if (!SAGE_CONFIG) {
    throw new Error('Sage integration not configured');
  }

  const clientId = process.env.SAGE_CLIENT_ID;
  const clientSecret = process.env.SAGE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Sage credentials not configured');
  }

  const refreshToken = await decrypt(integration.refreshToken);

  const tokenUrl = SAGE_CONFIG.oauthConfig.tokenUrl;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sage token refresh failed: ${errorText}`);
  }

  const tokenData = await response.json();
  
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    expiresAt,
    tokenType: tokenData.token_type || 'Bearer',
  };
}

/**
 * Disconnect from Sage
 */
export async function disconnect(_integration: IntegrationData): Promise<void> {
  // Sage doesn't have a specific disconnect endpoint
  // Tokens will be removed from database
}

// =====================================================
// Data Fetching
// =====================================================

/**
 * Fetch invoices from Sage
 */
export async function fetchInvoices(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalInvoice[]> {
  const accessToken = await getValidAccessToken(integration);

  const params = new URLSearchParams({
    search: 'invoice_type_id:SI', // Sales Invoices
  });

  if (options?.limit) {
    params.append('items_per_page', options.limit.toString());
  }

  const url = `${SAGE_CONFIG?.apiBaseUrl}/sales_invoices?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sage invoice fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const invoices = data.$items || [];

  return invoices.map((invoice: Record<string, unknown>) => mapSageInvoice(invoice));
}

/**
 * Fetch clients/contacts from Sage
 */
export async function fetchClients(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalClient[]> {
  const accessToken = await getValidAccessToken(integration);

  const params = new URLSearchParams();

  if (options?.limit) {
    params.append('items_per_page', options.limit.toString());
  }

  const url = `${SAGE_CONFIG?.apiBaseUrl}/contacts?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sage contact fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const contacts = data.$items || [];

  return contacts.map(mapSageContact);
}

/**
 * Fetch payments from Sage
 */
export async function fetchPayments(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalPayment[]> {
  const accessToken = await getValidAccessToken(integration);

  const params = new URLSearchParams();

  if (options?.limit) {
    params.append('items_per_page', options.limit.toString());
  }

  const url = `${SAGE_CONFIG?.apiBaseUrl}/payments?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sage payment fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const payments = data.$items || [];

  return payments.map((payment: Record<string, unknown>) => ({
    id: payment.id as string,
    invoiceId: (payment.links as Array<Record<string, string>>)?.find(l => l.rel === 'invoice')?.href || '',
    amount: payment.total_amount as number,
    currency: (payment.currency as string) || 'EUR',
    date: new Date(payment.date as string),
    reference: payment.reference as string,
    method: payment.payment_method as string,
  }));
}

// =====================================================
// Data Sync Operations
// =====================================================

/**
 * Sync clients between RelancePro and Sage
 */
export async function syncClients(
  integration: IntegrationData,
  direction: 'import' | 'export' | 'both'
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    status: 'success',
    invoicesImported: 0,
    invoicesExported: 0,
    clientsImported: 0,
    clientsExported: 0,
    paymentsImported: 0,
    paymentsExported: 0,
    errors: [],
    startedAt: new Date(),
  };

  try {
    if (direction === 'import' || direction === 'both') {
      const clients = await fetchClients(integration);
      result.clientsImported = clients.length;
    }
  } catch (error) {
    result.success = false;
    result.status = 'failed';
    result.errors.push({
      type: 'client',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  result.completedAt = new Date();
  return result;
}

/**
 * Sync invoices between RelancePro and Sage
 */
export async function syncInvoices(
  integration: IntegrationData,
  direction: 'import' | 'export' | 'both'
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    status: 'success',
    invoicesImported: 0,
    invoicesExported: 0,
    clientsImported: 0,
    clientsExported: 0,
    paymentsImported: 0,
    paymentsExported: 0,
    errors: [],
    startedAt: new Date(),
  };

  try {
    if (direction === 'import' || direction === 'both') {
      const invoices = await fetchInvoices(integration);
      result.invoicesImported = invoices.length;
    }
  } catch (error) {
    result.success = false;
    result.status = 'failed';
    result.errors.push({
      type: 'invoice',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  result.completedAt = new Date();
  return result;
}

/**
 * Sync payments between RelancePro and Sage
 */
export async function syncPayments(
  integration: IntegrationData,
  direction: 'import' | 'export' | 'both'
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    status: 'success',
    invoicesImported: 0,
    invoicesExported: 0,
    clientsImported: 0,
    clientsExported: 0,
    paymentsImported: 0,
    paymentsExported: 0,
    errors: [],
    startedAt: new Date(),
  };

  try {
    if (direction === 'import' || direction === 'both') {
      const payments = await fetchPayments(integration);
      result.paymentsImported = payments.length;
    }
  } catch (error) {
    result.success = false;
    result.status = 'failed';
    result.errors.push({
      type: 'payment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  result.completedAt = new Date();
  return result;
}

// =====================================================
// Write Operations
// =====================================================

/**
 * Push a payment to Sage (Note: Sage API may not support this for all regions)
 */
export async function pushPayment(
  integration: IntegrationData,
  payment: PaymentData
): Promise<ExternalPayment> {
  const accessToken = await getValidAccessToken(integration);

  const url = `${SAGE_CONFIG?.apiBaseUrl}/payments`;

  const paymentData = {
    payment_method_id: 'CASH', // Default, should be configurable
    total_amount: payment.amount,
    date: payment.date.toISOString().split('T')[0],
    reference: payment.reference,
    base_currency: payment.currency,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sage payment creation failed: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    invoiceId: payment.invoiceId,
    amount: data.total_amount,
    currency: data.base_currency,
    date: new Date(data.date),
    reference: data.reference,
    method: data.payment_method_id,
  };
}

/**
 * Push a client to Sage
 */
export async function pushClient(
  integration: IntegrationData,
  client: ClientData
): Promise<ExternalClient> {
  const accessToken = await getValidAccessToken(integration);

  const url = `${SAGE_CONFIG?.apiBaseUrl}/contacts`;

  const contactData = {
    name: client.name,
    company_name: client.company,
    email: client.email,
    telephone: client.phone,
    address_line_1: client.address,
    notes: client.notes,
    contact_type_ids: ['CUSTOMER'],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(contactData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sage contact creation failed: ${errorText}`);
  }

  const data = await response.json();
  
  return mapSageContact(data);
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidAccessToken(integration: IntegrationData): Promise<string> {
  if (!integration.expiresAt || new Date() >= integration.expiresAt) {
    const newTokens = await refreshTokens(integration);
    return newTokens.accessToken;
  }
  
  return decrypt(integration.accessToken);
}

/**
 * Map Sage invoice to ExternalInvoice
 */
function mapSageInvoice(invoice: Record<string, unknown>): ExternalInvoice {
  const totalAmount = invoice.total_amount as number || 0;
  const amountPaid = invoice.total_paid as number || 0;
  const balance = totalAmount - amountPaid;
  
  const statusMap: Record<string, 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'> = {
    'DRAFT': 'draft',
    'UNPAID': 'sent',
    'PARTIAL': 'partial',
    'PAID': 'paid',
    'VOID': 'cancelled',
  };

  return {
    id: invoice.id as string,
    reference: invoice.invoice_number as string || invoice.id as string,
    description: (invoice.invoice_lines as Array<Record<string, string>>)?.[0]?.description,
    amount: totalAmount,
    currency: (invoice.currency as string) || 'EUR',
    issueDate: new Date(invoice.date as string),
    dueDate: new Date(invoice.due_date as string),
    status: balance > 0 && new Date(invoice.due_date as string) < new Date()
      ? 'overdue'
      : statusMap[invoice.status as string] || 'sent',
    client: {
      id: (invoice.contact as Record<string, string>)?.id || '',
      name: (invoice.contact as Record<string, string>)?.name || 'Unknown',
      email: (invoice.contact as Record<string, string>)?.email,
    },
    totalPaid: amountPaid,
    balance,
  };
}

/**
 * Map Sage contact to ExternalClient
 */
function mapSageContact(contact: Record<string, unknown>): ExternalClient {
  return {
    id: contact.id as string,
    name: contact.name as string || 'Unknown',
    email: contact.email as string,
    phone: contact.telephone as string,
    company: contact.company_name as string,
    address: contact.address_line_1 as string,
    notes: contact.notes as string,
  };
}
