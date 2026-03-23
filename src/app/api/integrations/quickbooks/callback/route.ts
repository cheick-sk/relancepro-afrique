// QuickBooks Callback Route - Handle OAuth2 callback
import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/integrations/quickbooks/service';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth error
    if (error) {
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      return NextResponse.redirect(
        `${protocol}://${host}/settings/integrations?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const result = await handleCallback(code, state, realmId || undefined);

    // Encrypt tokens before storing
    const encryptedAccessToken = await encrypt(result.tokens.accessToken);
    const encryptedRefreshToken = await encrypt(result.tokens.refreshToken);

    // Save or update integration in database
    const existingIntegration = await db.integration.findUnique({
      where: {
        profileId_type: {
          profileId: result.profileId,
          type: 'quickbooks',
        },
      },
    });

    if (existingIntegration) {
      // Update existing integration
      await db.integration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: result.tokens.expiresAt,
          tokenType: result.tokens.tokenType,
          status: 'connected',
          connectedAt: new Date(),
          disconnectedAt: null,
          externalId: result.realmId,
        },
      });
    } else {
      // Create new integration
      await db.integration.create({
        data: {
          profileId: result.profileId,
          type: 'quickbooks',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: result.tokens.expiresAt,
          tokenType: result.tokens.tokenType,
          status: 'connected',
          connectedAt: new Date(),
          externalId: result.realmId,
        },
      });
    }

    // Redirect to success page
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(
      `${protocol}://${host}/settings/integrations?success=quickbooks_connected`
    );
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(
      `${protocol}://${host}/settings/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'Failed to connect QuickBooks')}`
    );
  }
}
