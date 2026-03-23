// Xero Integration Service for RelancePro Africa
// Implements OAuth2 authentication and sync operations

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

const XERO_CONFIG = getIntegrationConfig('xero');

// =====================================================
// OAuth2 Authentication
// =====================================================

/**
 * Generate the authorization URL for Xero OAuth2 flow
 */
export async function connectXero(
  profileId: string,
  redirectUrl: string
): Promise<string> {
  if (!XERO_CONFIG) {
    throw new Error('Xero integration not configured');
  }

  const clientId = process.env.XERO_CLIENT_ID;
  if (!clientId) {
    throw new Error('Xero client ID not configured');
  }

  // Create state parameter with profile info
  const state: OAuthState = {
    profileId,
    integrationType: 'xero',
    redirectUrl,
    timestamp: Date.now(),
  };
  
  const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: XERO_CONFIG.oauthConfig.scopes.join(' '),
    redirect_uri: redirectUrl,
    state: encodedState,
  });

  return `${XERO_CONFIG.oauthConfig.authorizeUrl}?${params.toString()}`;
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
  tenantId?: string;
  tenantName?: string;
}> {
  if (!XERO_CONFIG) {
    throw new Error('Xero integration not configured');
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Xero credentials not configured');
  }

  // Decode state
  const decodedState: OAuthState = JSON.parse(
    Buffer.from(state, 'base64').toString('utf-8')
  );

  // Exchange code for tokens
  const tokenUrl = XERO_CONFIG.oauthConfig.tokenUrl;
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
    throw new Error(`Xero token exchange failed: ${errorText}`);
  }

  const tokenData = await response.json();
  
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // Get tenant connections
  const connections = await getXeroConnections(tokenData.access_token);
  const tenant = connections[0]; // Use first tenant

  return {
    tokens: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      expiresAt,
      tokenType: tokenData.token_type || 'Bearer',
    },
    profileId: decodedState.profileId,
    tenantId: tenant?.tenantId,
    tenantName: tenant?.tenantName,
  };
}

/**
 * Get Xero tenant connections
 */
async function getXeroConnections(accessToken: string): Promise<Array<{ tenantId: string; tenantName: string }>> {
  const response = await fetch('https://api.xero.com/connections', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    return [];
  }

  const connections = await response.json();
  return connections.map((conn: { id: string; tenantName: string }) => ({
    tenantId: conn.id,
    tenantName: conn.tenantName,
  }));
}

/**
 * Refresh expired access token
 */
export async function refreshTokens(integration: IntegrationData): Promise<OAuthTokens> {
  if (!XERO_CONFIG) {
    throw new Error('Xero integration not configured');
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Xero credentials not configured');
  }

  const refreshToken = await decrypt(integration.refreshToken);

  const tokenUrl = XERO_CONFIG.oauthConfig.tokenUrl;
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
    throw new Error(`Xero token refresh failed: ${errorText}`);
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
 * Disconnect from Xero
 */
export async function disconnect(integration: IntegrationData): Promise<void> {
  const accessToken = await getValidAccessToken(integration);
  
  // Revoke tenant connection
  if (integration.externalId) {
    await fetch(`https://api.xero.com/connections/${integration.externalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }
}

// =====================================================
// Data Fetching
// =====================================================

/**
 * Fetch invoices from Xero
 */
export async function fetchInvoices(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalInvoice[]> {
  const accessToken = await getValidAccessToken(integration);
  const tenantId = integration.externalId;

  if (!tenantId) {
    throw new Error('Xero tenant ID not set');
  }

  const params = new URLSearchParams({
    where: 'Type=="ACCREC"',
    order: 'Date DESC',
  });

  if (options?.modifiedSince) {
    params.append('If-Modified-Since', options.modifiedSince.toUTCString());
  }

  if (options?.status) {
    params.append('where', `Status=="${options.status.toUpperCase()}"`);
  }

  const url = `${XERO_CONFIG?.apiBaseUrl}/Invoices?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Xero invoice fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const invoices = data.Invoices || [];

  // Fetch contact details for each invoice
  return invoices.map((invoice: Record<string, unknown>) => mapXeroInvoice(invoice));
}

/**
 * Fetch clients/contacts from Xero
 */
export async function fetchClients(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalClient[]> {
  const accessToken = await getValidAccessToken(integration);
  const tenantId = integration.externalId;

  if (!tenantId) {
    throw new Error('Xero tenant ID not set');
  }

  const params = new URLSearchParams({
    where: 'IsSupplier==false',
    order: 'Name ASC',
  });

  if (options?.modifiedSince) {
    params.append('If-Modified-Since', options.modifiedSince.toUTCString());
  }

  const url = `${XERO_CONFIG?.apiBaseUrl}/Contacts?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Xero contact fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const contacts = data.Contacts || [];

  return contacts.map(mapXeroContact);
}

/**
 * Fetch payments from Xero
 */
export async function fetchPayments(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalPayment[]> {
  const accessToken = await getValidAccessToken(integration);
  const tenantId = integration.externalId;

  if (!tenantId) {
    throw new Error('Xero tenant ID not set');
  }

  const params = new URLSearchParams({
    order: 'Date DESC',
  });

  if (options?.modifiedSince) {
    params.append('If-Modified-Since', options.modifiedSince.toUTCString());
  }

  const url = `${XERO_CONFIG?.apiBaseUrl}/Payments?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Xero payment fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const payments = data.Payments || [];

  return payments.map((payment: Record<string, unknown>) => ({
    id: payment.PaymentID as string,
    invoiceId: (payment.Invoice as Record<string, string>)?.InvoiceID || '',
    amount: payment.Amount as number,
    currency: 'USD', // Xero uses organization currency
    date: new Date(payment.Date as string),
    reference: payment.Reference as string,
    method: (payment.PaymentMethod as string) || 'Bank Transfer',
  }));
}

// =====================================================
// Data Sync Operations
// =====================================================

/**
 * Sync clients between RelancePro and Xero
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
 * Sync invoices between RelancePro and Xero
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
 * Sync payments between RelancePro and Xero
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
 * Push a payment to Xero
 */
export async function pushPayment(
  integration: IntegrationData,
  payment: PaymentData
): Promise<ExternalPayment> {
  const accessToken = await getValidAccessToken(integration);
  const tenantId = integration.externalId;

  if (!tenantId) {
    throw new Error('Xero tenant ID not set');
  }

  const url = `${XERO_CONFIG?.apiBaseUrl}/Payments`;

  const paymentData = {
    Invoice: {
      InvoiceID: payment.invoiceId,
    },
    Account: {
      Code: '200', // Default account code - should be configurable
    },
    Date: payment.date.toISOString().split('T')[0],
    Amount: payment.amount,
    Reference: payment.reference,
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Xero payment creation failed: ${errorText}`);
  }

  const data = await response.json();
  const createdPayment = data.Payments?.[0];
  
  return {
    id: createdPayment.PaymentID,
    invoiceId: payment.invoiceId,
    amount: createdPayment.Amount,
    currency: payment.currency,
    date: new Date(createdPayment.Date),
    reference: createdPayment.Reference,
    method: payment.method,
  };
}

/**
 * Push a client to Xero
 */
export async function pushClient(
  integration: IntegrationData,
  client: ClientData
): Promise<ExternalClient> {
  const accessToken = await getValidAccessToken(integration);
  const tenantId = integration.externalId;

  if (!tenantId) {
    throw new Error('Xero tenant ID not set');
  }

  const url = `${XERO_CONFIG?.apiBaseUrl}/Contacts`;

  const contactData = {
    Name: client.name,
    CompanyName: client.company,
    EmailAddress: client.email,
    Phones: client.phone ? [{
      PhoneType: 'DEFAULT',
      PhoneNumber: client.phone,
    }] : undefined,
    Addresses: client.address ? [{
      AddressType: 'STREET',
      AddressLine1: client.address,
    }] : undefined,
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(contactData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Xero contact creation failed: ${errorText}`);
  }

  const data = await response.json();
  const createdContact = data.Contacts?.[0];
  
  return mapXeroContact(createdContact);
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
 * Map Xero invoice to ExternalInvoice
 */
function mapXeroInvoice(invoice: Record<string, unknown>): ExternalInvoice {
  const total = invoice.Total as number || 0;
  const amountPaid = invoice.AmountPaid as number || 0;
  const amountDue = invoice.AmountDue as number || 0;
  
  const statusMap: Record<string, 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'> = {
    'DRAFT': 'draft',
    'SUBMITTED': 'sent',
    'AUTHORISED': 'sent',
    'PAID': 'paid',
    'VOIDED': 'cancelled',
    'DELETED': 'cancelled',
  };

  return {
    id: invoice.InvoiceID as string,
    reference: invoice.InvoiceNumber as string || invoice.InvoiceID as string,
    description: (invoice.LineItems as Array<Record<string, unknown>>)?.[0]?.Description as string,
    amount: total,
    currency: (invoice.CurrencyCode as string) || 'USD',
    issueDate: new Date(invoice.Date as string),
    dueDate: new Date(invoice.DueDate as string),
    status: amountDue > 0 && new Date(invoice.DueDate as string) < new Date() 
      ? 'overdue' 
      : statusMap[invoice.Status as string] || 'sent',
    client: {
      id: (invoice.Contact as Record<string, string>)?.ContactID || '',
      name: (invoice.Contact as Record<string, string>)?.Name || 'Unknown',
      email: (invoice.Contact as Record<string, string>)?.EmailAddress,
    },
    totalPaid: amountPaid,
    balance: amountDue,
  };
}

/**
 * Map Xero contact to ExternalClient
 */
function mapXeroContact(contact: Record<string, unknown>): ExternalClient {
  return {
    id: contact.ContactID as string,
    name: contact.Name as string || 'Unknown',
    email: contact.EmailAddress as string,
    phone: (contact.Phones as Array<Record<string, string>>)?.[0]?.PhoneNumber,
    company: contact.Name as string,
    address: (contact.Addresses as Array<Record<string, string>>)?.[0]?.AddressLine1,
    notes: contact.BankAccountDetails as string,
  };
}
