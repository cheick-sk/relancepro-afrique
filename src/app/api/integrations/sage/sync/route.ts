// Sage Sync Route - Trigger data synchronization
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { fetchInvoices, fetchClients } from '@/lib/integrations/sage/service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { syncType = 'full', direction = 'import' } = body;

    // Get integration
    const integration = await db.integration.findUnique({
      where: {
        profileId_type: {
          profileId: session.user.id,
          type: 'sage',
        },
      },
    });

    if (!integration || integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Sage not connected' },
        { status: 400 }
      );
    }

    // Create sync log
    const syncLog = await db.integrationSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType,
        direction,
        status: 'running',
      },
    });

    try {
      // Prepare integration data for service
      const integrationData = {
        id: integration.id,
        profileId: integration.profileId,
        type: integration.type as 'sage',
        accessToken: integration.accessToken || '',
        refreshToken: integration.refreshToken || '',
        expiresAt: integration.expiresAt || undefined,
        externalId: integration.externalId || undefined,
        settings: {
          syncDirection: integration.syncDirection as 'import' | 'export' | 'both',
          autoSync: integration.autoSync,
          syncFrequency: integration.syncFrequency as 'hourly' | 'daily' | 'weekly' | 'manual',
          fieldMapping: integration.fieldMapping ? JSON.parse(integration.fieldMapping) : {},
        },
      };

      let invoicesImported = 0;
      let clientsImported = 0;
      let errors: Array<{ type: string; message: string }> = [];

      // Import invoices
      if (direction === 'import' || direction === 'both') {
        try {
          const invoices = await fetchInvoices(integrationData);
          
          // Import unpaid invoices as debts
          for (const invoice of invoices) {
            if (invoice.balance && invoice.balance > 0) {
              // Check if client exists, create if not
              let client = await db.client.findFirst({
                where: {
                  profileId: session.user.id,
                  OR: [
                    { email: invoice.client.email },
                    { name: invoice.client.name },
                  ],
                },
              });

              if (!client && invoice.client.name) {
                client = await db.client.create({
                  data: {
                    profileId: session.user.id,
                    name: invoice.client.name,
                    email: invoice.client.email,
                    phone: invoice.client.phone,
                    company: invoice.client.company,
                    status: 'active',
                  },
                });
                clientsImported++;
              }

              // Check if debt already exists
              const existingDebt = await db.debt.findFirst({
                where: {
                  profileId: session.user.id,
                  reference: invoice.reference,
                },
              });

              if (!existingDebt && client) {
                await db.debt.create({
                  data: {
                    profileId: session.user.id,
                    clientId: client.id,
                    reference: invoice.reference,
                    description: invoice.description,
                    amount: invoice.balance,
                    currency: invoice.currency,
                    issueDate: invoice.issueDate,
                    dueDate: invoice.dueDate,
                    status: 'pending',
                    paidAmount: invoice.totalPaid || 0,
                  },
                });
                invoicesImported++;
              }
            }
          }
        } catch (err) {
          errors.push({
            type: 'invoice',
            message: err instanceof Error ? err.message : 'Failed to sync invoices',
          });
        }
      }

      // Update sync log
      await db.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: errors.length > 0 ? 'partial' : 'success',
          completedAt: new Date(),
          invoicesImported,
          clientsImported,
          errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
        },
      });

      // Update integration last sync
      await db.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: errors.length > 0 ? 'partial' : 'success',
          totalSynced: { increment: invoicesImported + clientsImported },
          lastSyncCount: invoicesImported + clientsImported,
        },
      });

      return NextResponse.json({
        success: true,
        status: errors.length > 0 ? 'partial' : 'success',
        invoicesImported,
        clientsImported,
        errors,
      });
    } catch (syncError) {
      // Update sync log with error
      await db.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: syncError instanceof Error ? syncError.message : 'Unknown error',
        },
      });

      throw syncError;
    }
  } catch (error) {
    console.error('Sage sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync with Sage' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get integration status
    const integration = await db.integration.findUnique({
      where: {
        profileId_type: {
          profileId: session.user.id,
          type: 'sage',
        },
      },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!integration) {
      return NextResponse.json({
        connected: false,
        integration: null,
      });
    }

    return NextResponse.json({
      connected: integration.status === 'connected',
      integration: {
        id: integration.id,
        type: integration.type,
        status: integration.status,
        connectedAt: integration.connectedAt,
        lastSyncAt: integration.lastSyncAt,
        lastSyncStatus: integration.lastSyncStatus,
        externalName: integration.externalName,
        syncDirection: integration.syncDirection,
        autoSync: integration.autoSync,
        syncFrequency: integration.syncFrequency,
      },
      recentSyncs: integration.syncLogs.map(log => ({
        id: log.id,
        syncType: log.syncType,
        direction: log.direction,
        status: log.status,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        invoicesImported: log.invoicesImported,
        clientsImported: log.clientsImported,
        errorMessage: log.errorMessage,
      })),
    });
  } catch (error) {
    console.error('Sage status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get Sage status' },
      { status: 500 }
    );
  }
}

// Disconnect Sage
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update integration to disconnected
    await db.integration.update({
      where: {
        profileId_type: {
          profileId: session.user.id,
          type: 'sage',
        },
      },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sage disconnected successfully',
    });
  } catch (error) {
    console.error('Sage disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect Sage' },
      { status: 500 }
    );
  }
}
