// QuickBooks Connect Route - Start OAuth2 flow
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectQuickBooks } from '@/lib/integrations/quickbooks/service';
import { authOptions } from '@/lib/auth/config';

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

    // Get the base URL for the callback
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;
    
    const callbackUrl = `${baseUrl}/api/integrations/quickbooks/callback`;

    // Generate authorization URL
    const authUrl = await connectQuickBooks(session.user.id, callbackUrl);

    return NextResponse.json({ 
      authorizationUrl: authUrl,
      message: 'Redirect user to authorization URL to connect QuickBooks'
    });
  } catch (error) {
    console.error('QuickBooks connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect QuickBooks' },
      { status: 500 }
    );
  }
}
