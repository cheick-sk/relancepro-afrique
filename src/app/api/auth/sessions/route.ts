/**
 * API Route: Session Management
 * GET /api/auth/sessions - List active sessions
 * DELETE /api/auth/sessions - Revoke session(s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { AuditAction, logAction } from '@/lib/audit';

/**
 * Parse User Agent string
 */
function parseUserAgent(userAgent: string | null): {
  browser: string;
  os: string;
  device: string;
} {
  if (!userAgent) {
    return { browser: 'Inconnu', os: 'Inconnu', device: 'Desktop' };
  }

  // Browser detection
  let browser = 'Inconnu';
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }

  // OS detection
  let os = 'Inconnu';
  if (userAgent.includes('Windows NT 10')) {
    os = 'Windows 10/11';
  } else if (userAgent.includes('Windows NT 6.3')) {
    os = 'Windows 8.1';
  } else if (userAgent.includes('Windows NT 6.2')) {
    os = 'Windows 8';
  } else if (userAgent.includes('Windows NT 6.1')) {
    os = 'Windows 7';
  } else if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
  } else if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+(\.\d+)?)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS (\d+[._]\d+)/);
    os = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  }

  // Device type detection
  let device = 'Desktop';
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    device = 'Mobile';
  } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
    device = 'Tablet';
  }

  return { browser, os, device };
}

/**
 * GET /api/auth/sessions
 * List all active sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Get current session token from auth
    const currentSessionToken = (session as any).sessionId;

    // Fetch all sessions for the user
    const sessions = await db.session.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() }, // Only non-expired
      },
      orderBy: {
        lastActive: 'desc',
      },
    });

    // Parse and format sessions
    const formattedSessions = sessions.map(s => {
      const { browser, os, device } = parseUserAgent(s.userAgent);
      
      return {
        id: s.id,
        token: s.token.substring(0, 8) + '...', // Masked token
        userAgent: s.userAgent,
        ip: s.ip,
        device,
        browser,
        os,
        country: s.country,
        city: s.city,
        lastActive: s.lastActive.toISOString(),
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isTrusted: s.isTrusted,
        isRevoked: s.isRevoked,
        isCurrent: s.token === currentSessionToken,
      };
    });

    return NextResponse.json({
      sessions: formattedSessions,
      total: formattedSessions.length,
      active: formattedSessions.filter(s => !s.isRevoked).length,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/sessions
 * Revoke a specific session or all other sessions
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    const revokeAll = searchParams.get('revokeAll') === 'true';

    // Get current session token
    const currentSessionToken = (session as any).sessionId;

    if (revokeAll) {
      // Revoke all other sessions
      const result = await db.session.updateMany({
        where: {
          userId: session.user.id,
          token: { not: currentSessionToken },
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: session.user.id,
        },
      });

      await logAction({
        userId: session.user.id,
        action: AuditAction.SESSION_REVOKE,
        status: 'success',
        details: { revokedCount: result.count, type: 'all_others' },
      });

      return NextResponse.json({
        success: true,
        message: `${result.count} session(s) révoquée(s)`,
        revokedCount: result.count,
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID de session requis' },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const targetSession = await db.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    });

    if (!targetSession) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // Prevent revoking current session
    if (targetSession.token === currentSessionToken) {
      return NextResponse.json(
        { error: 'Impossible de révoquer la session actuelle' },
        { status: 400 }
      );
    }

    // Revoke the session
    await db.session.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: session.user.id,
      },
    });

    await logAction({
      userId: session.user.id,
      action: AuditAction.SESSION_REVOKE,
      status: 'success',
      details: { sessionId, type: 'single' },
    });

    return NextResponse.json({
      success: true,
      message: 'Session révoquée',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/sessions
 * Update session (e.g., mark as trusted device)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, isTrusted } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID de session requis' },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const targetSession = await db.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    });

    if (!targetSession) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // Update trust status
    const trustedUntil = isTrusted 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : null;

    await db.session.update({
      where: { id: sessionId },
      data: {
        isTrusted,
        trustedUntil,
      },
    });

    await logAction({
      userId: session.user.id,
      action: isTrusted ? AuditAction.TRUSTED_DEVICE_ADD : AuditAction.TRUSTED_DEVICE_REMOVE,
      status: 'success',
      details: { sessionId },
    });

    return NextResponse.json({
      success: true,
      message: isTrusted 
        ? 'Appareil marqué comme confiance' 
        : 'Confiance retirée de l\'appareil',
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
