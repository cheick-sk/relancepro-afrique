// QuickBooks Integration Service for RelancePro Africa
// Implements OAuth2 authentication and sync operations

import {
  OAuthTokens,
  OAuthState,
  ExternalInvoice,
  ExternalClient,
  ExternalPayment,
  SyncResult,
  SyncError,
  IntegrationData,
  FetchOptions,
  PaymentData,
  ClientData,
  getIntegrationConfig,
} from '../types';
import { encrypt, decrypt } from '@/lib/encryption';

const QUICKBOOKS_CONFIG = getIntegrationConfig('quickbooks');

// =====================================================
// OAuth2 Authentication
// =====================================================

/**
 * Generate the authorization URL for QuickBooks OAuth2 flow
 */
export async function connectQuickBooks(
  profileId: string,
  redirectUrl: string
): Promise<string> {
  if (!QUICKBOOKS_CONFIG) {
    throw new Error('QuickBooks integration not configured');
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  if (!clientId) {
    throw new Error('QuickBooks client ID not configured');
  }

  // Create state parameter with profile info
  const state: OAuthState = {
    profileId,
    integrationType: 'quickbooks',
    redirectUrl,
    timestamp: Date.now(),
  };
  
  const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: QUICKBOOKS_CONFIG.oauthConfig.scopes.join(' '),
    redirect_uri: redirectUrl,
    state: encodedState,
    access_type: 'offline', // For refresh tokens
  });

  return `${QUICKBOOKS_CONFIG.oauthConfig.authorizeUrl}?${params.toString()}`;
}

/**
 * Handle OAuth2 callback and exchange code for tokens
 */
export async function handleCallback(
  code: string,
  state: string,
  realmId?: string
): Promise<{
  tokens: OAuthTokens;
  profileId: string;
  realmId?: string;
}> {
  if (!QUICKBOOKS_CONFIG) {
    throw new Error('QuickBooks integration not configured');
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks credentials not configured');
  }

  // Decode state
  const decodedState: OAuthState = JSON.parse(
    Buffer.from(state, 'base64').toString('utf-8')
  );

  // Exchange code for tokens
  const tokenUrl = QUICKBOOKS_CONFIG.oauthConfig.tokenUrl;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: decodedState.redirectUrl,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks token exchange failed: ${errorText}`);
  }

  const tokenData = await response.json();
  
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  return {
    tokens: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      expiresAt,
      tokenType: tokenData.token_type || 'Bearer',
    },
    profileId: decodedState.profileId,
    realmId: realmId || tokenData.realmId,
  };
}

/**
 * Refresh expired access token
 */
export async function refreshTokens(integration: IntegrationData): Promise<OAuthTokens> {
  if (!QUICKBOOKS_CONFIG) {
    throw new Error('QuickBooks integration not configured');
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks credentials not configured');
  }

  // Decrypt refresh token
  const refreshToken = await decrypt(integration.refreshToken);

  const tokenUrl = QUICKBOOKS_CONFIG.oauthConfig.tokenUrl;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks token refresh failed: ${errorText}`);
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
 * Disconnect from QuickBooks (revoke tokens)
 */
export async function disconnect(integration: IntegrationData): Promise<void> {
  // QuickBooks doesn't have a revoke endpoint, so we just mark as disconnected
  // The tokens will be removed from the database
}

// =====================================================
// Data Fetching
// =====================================================

/**
 * Fetch invoices from QuickBooks
 */
export async function fetchInvoices(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalInvoice[]> {
  if (!integration.externalId) {
    throw new Error('QuickBooks company ID not set');
  }

  // Check if token needs refresh
  const accessToken = await getValidAccessToken(integration);

  // Build query
  let query = "SELECT * FROM Invoice WHERE Balance > '0'";
  
  if (options?.modifiedSince) {
    const modifiedDate = options.modifiedSince.toISOString().split('T')[0];
    query += ` AND MetaData.LastUpdatedTime > '${modifiedDate}'`;
  }
  
  query += ' ORDERBY TxnDate DESC';
  
  if (options?.limit) {
    query += ` MAXRESULTS ${options.limit}`;
  } else {
    query += ' MAXRESULTS 100';
  }
  
  if (options?.offset) {
    query += ` STARTPOSITION ${options.offset + 1}`;
  }

  const url = `${QUICKBOOKS_CONFIG?.apiBaseUrl}/${integration.externalId}/query?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks invoice fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const invoices = data.QueryResponse?.Invoice || [];

  // Fetch customer details for each invoice
  const clientMap = new Map<string, ExternalClient>();
  const invoicesWithClients = await Promise.all(
    invoices.map(async (invoice: Record<string, unknown>) => {
      let client = clientMap.get(invoice.CustomerRef?.value as string);
      if (!client && invoice.CustomerRef?.value) {
        client = await fetchClientById(integration, accessToken, invoice.CustomerRef.value as string);
        if (client) {
          clientMap.set(invoice.CustomerRef.value as string, client);
        }
      }
      
      return mapQuickBooksInvoice(invoice, client);
    })
  );

  return invoicesWithClients;
}

/**
 * Fetch a single client by ID from QuickBooks
 */
async function fetchClientById(
  integration: IntegrationData,
  accessToken: string,
  clientId: string
): Promise<ExternalClient | null> {
  if (!integration.externalId) return null;

  const url = `${QUICKBOOKS_CONFIG?.apiBaseUrl}/${integration.externalId}/customer/${clientId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return mapQuickBooksCustomer(data.Customer);
  } catch {
    return null;
  }
}

/**
 * Fetch clients/customers from QuickBooks
 */
export async function fetchClients(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalClient[]> {
  if (!integration.externalId) {
    throw new Error('QuickBooks company ID not set');
  }

  const accessToken = await getValidAccessToken(integration);

  let query = "SELECT * FROM Customer WHERE Active = true";
  
  if (options?.modifiedSince) {
    const modifiedDate = options.modifiedSince.toISOString().split('T')[0];
    query += ` AND MetaData.LastUpdatedTime > '${modifiedDate}'`;
  }
  
  query += ' ORDERBY DisplayName';
  
  if (options?.limit) {
    query += ` MAXRESULTS ${options.limit}`;
  } else {
    query += ' MAXRESULTS 100';
  }

  const url = `${QUICKBOOKS_CONFIG?.apiBaseUrl}/${integration.externalId}/query?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks customer fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const customers = data.QueryResponse?.Customer || [];

  return customers.map(mapQuickBooksCustomer);
}

/**
 * Fetch payments from QuickBooks
 */
export async function fetchPayments(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalPayment[]> {
  if (!integration.externalId) {
    throw new Error('QuickBooks company ID not set');
  }

  const accessToken = await getValidAccessToken(integration);

  let query = "SELECT * FROM Payment";
  
  if (options?.modifiedSince) {
    const modifiedDate = options.modifiedSince.toISOString().split('T')[0];
    query += ` WHERE MetaData.LastUpdatedTime > '${modifiedDate}'`;
  }
  
  query += ' ORDERBY TxnDate DESC';
  
  if (options?.limit) {
    query += ` MAXRESULTS ${options.limit}`;
  } else {
    query += ' MAXRESULTS 100';
  }

  const url = `${QUICKBOOKS_CONFIG?.apiBaseUrl}/${integration.externalId}/query?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks payment fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const payments = data.QueryResponse?.Payment || [];

  return payments.map((payment: Record<string, unknown>) => ({
    id: payment.Id as string,
    invoiceId: (payment.Line as Array<Record<string, unknown>>)?.[0]?.LinkedTxn?.[0]?.TxnId as string || '',
    amount: payment.TotalAmt as number,
    currency: 'USD', // QuickBooks uses company currency
    date: new Date(payment.TxnDate as string),
    reference: payment.PaymentRefNum as string,
    method: payment.PaymentMethodRef?.name as string,
  }));
}

// =====================================================
// Data Sync Operations
// =====================================================

/**
 * Sync clients between RelancePro and QuickBooks
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
      // The actual import to database will be handled by the sync route
    }

    // Export logic would be implemented here
    // For now, we'll leave clientsExported at 0
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
 * Sync invoices between RelancePro and QuickBooks
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
      // The actual import to database will be handled by the sync route
    }

    // Export logic would be implemented here
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
 * Sync payments between RelancePro and QuickBooks
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
 * Push a payment to QuickBooks
 */
export async function pushPayment(
  integration: IntegrationData,
  payment: PaymentData
): Promise<ExternalPayment> {
  if (!integration.externalId) {
    throw new Error('QuickBooks company ID not set');
  }

  const accessToken = await getValidAccessToken(integration);

  const url = `${QUICKBOOKS_CONFIG?.apiBaseUrl}/${integration.externalId}/payment`;

  const paymentData = {
    TotalAmt: payment.amount,
    PaymentRefNum: payment.reference,
    PaymentMethodRef: payment.method ? { name: payment.method } : undefined,
    TxnDate: payment.date.toISOString().split('T')[0],
    Line: [{
      Amount: payment.amount,
      LinkedTxn: [{
        TxnId: payment.invoiceId,
        TxnType: 'Invoice',
      }],
    }],
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
    throw new Error(`QuickBooks payment creation failed: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    id: data.Payment.Id,
    invoiceId: payment.invoiceId,
    amount: data.Payment.TotalAmt,
    currency: payment.currency,
    date: new Date(data.Payment.TxnDate),
    reference: data.Payment.PaymentRefNum,
    method: payment.method,
  };
}

/**
 * Push a client to QuickBooks
 */
export async function pushClient(
  integration: IntegrationData,
  client: ClientData
): Promise<ExternalClient> {
  if (!integration.externalId) {
    throw new Error('QuickBooks company ID not set');
  }

  const accessToken = await getValidAccessToken(integration);

  const url = `${QUICKBOOKS_CONFIG?.apiBaseUrl}/${integration.externalId}/customer`;

  const customerData = {
    DisplayName: client.name,
    CompanyName: client.company,
    PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
    PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
    BillAddr: client.address ? { Line1: client.address } : undefined,
    Notes: client.notes,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(customerData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks customer creation failed: ${errorText}`);
  }

  const data = await response.json();
  
  return mapQuickBooksCustomer(data.Customer);
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
 * Map QuickBooks invoice to ExternalInvoice
 */
function mapQuickBooksInvoice(
  invoice: Record<string, unknown>,
  client?: ExternalClient | null
): ExternalInvoice {
  const totalAmt = invoice.TotalAmt as number || 0;
  const balance = invoice.Balance as number || 0;
  const totalPaid = totalAmt - balance;
  
  return {
    id: invoice.Id as string,
    reference: invoice.DocNumber as string || invoice.Id as string,
    description: (invoice.Line as Array<Record<string, unknown>>)?.[0]?.Description as string,
    amount: totalAmt,
    currency: (invoice.CurrencyRef as Record<string, string>)?.value || 'USD',
    issueDate: new Date(invoice.TxnDate as string),
    dueDate: new Date((invoice.DueDate as string) || invoice.TxnDate as string),
    status: balance > 0 ? 'overdue' : 'paid',
    client: client || {
      id: (invoice.CustomerRef as Record<string, string>)?.value || '',
      name: (invoice.CustomerRef as Record<string, string>)?.name || 'Unknown',
    },
    totalPaid,
    balance,
  };
}

/**
 * Map QuickBooks customer to ExternalClient
 */
function mapQuickBooksCustomer(customer: Record<string, unknown>): ExternalClient {
  return {
    id: customer.Id as string,
    name: customer.DisplayName as string || customer.CompanyName as string || 'Unknown',
    email: (customer.PrimaryEmailAddr as Record<string, string>)?.Address,
    phone: (customer.PrimaryPhone as Record<string, string>)?.FreeFormNumber,
    company: customer.CompanyName as string,
    address: (customer.BillAddr as Record<string, string>)?.Line1,
    notes: customer.Notes as string,
  };
}
