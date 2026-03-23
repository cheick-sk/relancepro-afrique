// Wave Integration Service for RelancePro Africa
// Implements OAuth2 authentication and sync operations for Wave Accounting

import {
  OAuthTokens,
  OAuthState,
  ExternalInvoice,
  ExternalClient,
  ExternalPayment,
  SyncResult,
  IntegrationData,
  FetchOptions,
  ClientData,
  getIntegrationConfig,
} from '../types';
import { decrypt } from '@/lib/encryption';

const WAVE_CONFIG = getIntegrationConfig('wave');

// Wave uses GraphQL API
const WAVE_GRAPHQL_URL = 'https://gql.waveapps.com/graphql/public';

// =====================================================
// OAuth2 Authentication
// =====================================================

/**
 * Generate the authorization URL for Wave OAuth2 flow
 */
export async function connectWave(
  profileId: string,
  redirectUrl: string
): Promise<string> {
  if (!WAVE_CONFIG) {
    throw new Error('Wave integration not configured');
  }

  const clientId = process.env.WAVE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Wave client ID not configured');
  }

  // Create state parameter with profile info
  const state: OAuthState = {
    profileId,
    integrationType: 'wave',
    redirectUrl,
    timestamp: Date.now(),
  };
  
  const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: WAVE_CONFIG.oauthConfig.scopes.join(' '),
    redirect_uri: redirectUrl,
    state: encodedState,
  });

  return `${WAVE_CONFIG.oauthConfig.authorizeUrl}?${params.toString()}`;
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
  if (!WAVE_CONFIG) {
    throw new Error('Wave integration not configured');
  }

  const clientId = process.env.WAVE_CLIENT_ID;
  const clientSecret = process.env.WAVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Wave credentials not configured');
  }

  // Decode state
  const decodedState: OAuthState = JSON.parse(
    Buffer.from(state, 'base64').toString('utf-8')
  );

  // Exchange code for tokens
  const tokenUrl = WAVE_CONFIG.oauthConfig.tokenUrl;
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
    throw new Error(`Wave token exchange failed: ${errorText}`);
  }

  const tokenData = await response.json();
  
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // Get business info
  const businessInfo = await getWaveBusinessInfo(tokenData.access_token);

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
 * Get Wave business information using GraphQL
 */
async function getWaveBusinessInfo(accessToken: string): Promise<{ id: string; name: string } | null> {
  const query = `
    query {
      businesses {
        id
        name
      }
    }
  `;

  try {
    const response = await fetch(WAVE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const business = data.data?.businesses?.[0];
    
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
  if (!WAVE_CONFIG) {
    throw new Error('Wave integration not configured');
  }

  const clientId = process.env.WAVE_CLIENT_ID;
  const clientSecret = process.env.WAVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Wave credentials not configured');
  }

  const refreshToken = await decrypt(integration.refreshToken);

  const tokenUrl = WAVE_CONFIG.oauthConfig.tokenUrl;
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
    throw new Error(`Wave token refresh failed: ${errorText}`);
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
 * Disconnect from Wave
 */
export async function disconnect(_integration: IntegrationData): Promise<void> {
  // Wave doesn't have a specific disconnect endpoint
  // Tokens will be removed from database
}

// =====================================================
// Data Fetching (GraphQL)
// =====================================================

/**
 * Fetch invoices from Wave using GraphQL
 */
export async function fetchInvoices(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalInvoice[]> {
  const accessToken = await getValidAccessToken(integration);
  const businessId = integration.externalId;

  if (!businessId) {
    throw new Error('Wave business ID not set');
  }

  const limit = options?.limit || 50;

  const query = `
    query($businessId: ID!, $limit: Int!) {
      business(id: $businessId) {
        invoices(first: $limit) {
          edges {
            node {
              id
              invoiceNumber
              createdAt
              dueDate
              status
              total {
                value
                currency
              }
              amountDue {
                value
                currency
              }
              amountPaid {
                value
                currency
              }
              customer {
                id
                name
                email
              }
              items {
                edges {
                  node {
                    description
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(WAVE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { businessId, limit },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wave invoice fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const invoices = data.data?.business?.invoices?.edges || [];

  return invoices.map((edge: { node: Record<string, unknown> }) => mapWaveInvoice(edge.node));
}

/**
 * Fetch clients/customers from Wave using GraphQL
 */
export async function fetchClients(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalClient[]> {
  const accessToken = await getValidAccessToken(integration);
  const businessId = integration.externalId;

  if (!businessId) {
    throw new Error('Wave business ID not set');
  }

  const limit = options?.limit || 50;

  const query = `
    query($businessId: ID!, $limit: Int!) {
      business(id: $businessId) {
        customers(first: $limit) {
          edges {
            node {
              id
              name
              email
              mobile
              address {
                addressLine1
                city
                country
              }
              notes
            }
          }
        }
      }
    }
  `;

  const response = await fetch(WAVE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { businessId, limit },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wave customer fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const customers = data.data?.business?.customers?.edges || [];

  return customers.map((edge: { node: Record<string, unknown> }) => mapWaveCustomer(edge.node));
}

/**
 * Fetch payments from Wave using GraphQL
 */
export async function fetchPayments(
  integration: IntegrationData,
  options?: FetchOptions
): Promise<ExternalPayment[]> {
  const accessToken = await getValidAccessToken(integration);
  const businessId = integration.externalId;

  if (!businessId) {
    throw new Error('Wave business ID not set');
  }

  const limit = options?.limit || 50;

  const query = `
    query($businessId: ID!, $limit: Int!) {
      business(id: $businessId) {
        moneyTransactions(first: $limit, type: PAYMENT) {
          edges {
            node {
              id
              amount {
                value
                currency
              }
              date
              description
              externalId
            }
          }
        }
      }
    }
  `;

  const response = await fetch(WAVE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { businessId, limit },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wave payment fetch failed: ${errorText}`);
  }

  const data = await response.json();
  const transactions = data.data?.business?.moneyTransactions?.edges || [];

  return transactions.map((edge: { node: Record<string, unknown> }) => ({
    id: edge.node.id as string,
    invoiceId: '', // Wave doesn't link directly
    amount: (edge.node.amount as Record<string, unknown>)?.value as number || 0,
    currency: (edge.node.amount as Record<string, unknown>)?.currency as string || 'USD',
    date: new Date(edge.node.date as string),
    reference: edge.node.externalId as string,
    method: 'Bank Transfer',
  }));
}

// =====================================================
// Data Sync Operations
// =====================================================

/**
 * Sync clients between RelancePro and Wave
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
 * Sync invoices between RelancePro and Wave
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
 * Sync payments between RelancePro and Wave
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
 * Push a client to Wave using GraphQL
 */
export async function pushClient(
  integration: IntegrationData,
  client: ClientData
): Promise<ExternalClient> {
  const accessToken = await getValidAccessToken(integration);
  const businessId = integration.externalId;

  if (!businessId) {
    throw new Error('Wave business ID not set');
  }

  const mutation = `
    mutation($businessId: ID!, $input: CustomerCreateInput!) {
      customerCreate(input: { businessId: $businessId, customer: $input }) {
        customer {
          id
          name
          email
          mobile
        }
        didSucceed
        inputErrors {
          path
          message
        }
      }
    }
  `;

  const input = {
    name: client.name,
    email: client.email,
    mobile: client.phone,
    address: client.address ? {
      addressLine1: client.address,
    } : undefined,
  };

  const response = await fetch(WAVE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: { businessId, input },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wave customer creation failed: ${errorText}`);
  }

  const data = await response.json();
  const result = data.data?.customerCreate;

  if (!result?.didSucceed) {
    const errors = result?.inputErrors || [];
    throw new Error(`Wave customer creation failed: ${errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return mapWaveCustomer(result.customer);
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
 * Map Wave invoice to ExternalInvoice
 */
function mapWaveInvoice(invoice: Record<string, unknown>): ExternalInvoice {
  const total = (invoice.total as Record<string, unknown>)?.value as number || 0;
  const amountDue = (invoice.amountDue as Record<string, unknown>)?.value as number || 0;
  const amountPaid = (invoice.amountPaid as Record<string, unknown>)?.value as number || 0;
  const currency = (invoice.total as Record<string, unknown>)?.currency as string || 'USD';
  
  const statusMap: Record<string, 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'> = {
    'DRAFT': 'draft',
    'SENT': 'sent',
    'VIEWED': 'sent',
    'OVERDUE': 'overdue',
    'PAID': 'paid',
    'PARTIAL': 'partial',
    'VOID': 'cancelled',
  };

  return {
    id: invoice.id as string,
    reference: invoice.invoiceNumber as string || invoice.id as string,
    description: (invoice.items as { edges: Array<{ node: { description: string } }> })?.edges?.[0]?.node?.description,
    amount: total,
    currency,
    issueDate: new Date(invoice.createdAt as string),
    dueDate: new Date(invoice.dueDate as string),
    status: statusMap[invoice.status as string] || 'sent',
    client: {
      id: (invoice.customer as Record<string, unknown>)?.id as string || '',
      name: (invoice.customer as Record<string, unknown>)?.name as string || 'Unknown',
      email: (invoice.customer as Record<string, unknown>)?.email as string,
    },
    totalPaid: amountPaid,
    balance: amountDue,
  };
}

/**
 * Map Wave customer to ExternalClient
 */
function mapWaveCustomer(customer: Record<string, unknown>): ExternalClient {
  return {
    id: customer.id as string,
    name: customer.name as string || 'Unknown',
    email: customer.email as string,
    phone: customer.mobile as string,
    company: customer.name as string,
    address: (customer.address as Record<string, unknown>)?.addressLine1 as string,
    notes: customer.notes as string,
  };
}
