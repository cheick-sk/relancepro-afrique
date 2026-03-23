/**
 * API Route: Manage User Sessions
 * GET: List active sessions
 * DELETE: Revoke sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, revokeSession, revokeOtherSessions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { AuditAction, logAction } from '@/lib/audit';

// Parser pour extraire les infos du user agent
function parseUserAgent(userAgent: string | null): { browser: string; os: string; device: string } {
  if (!userAgent) {
    return { browser: 'Inconnu', os: 'Inconnu', device: 'Inconnu' };
  }

  // Détection du navigateur
  let browser = 'Inconnu';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edg')) browser = 'Edge';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

  // Détection de l'OS
  let os = 'Inconnu';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  // Détection du type d'appareil
  let device = 'Desktop';
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) device = 'Mobile';
  else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) device = 'Tablet';

  return { browser, os, device };
}

// GET - Lister les sessions actives
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Récupérer toutes les sessions non expirées et non révoquées
    const sessions = await db.session.findMany({
      where: {
        userId: session.user.id,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        lastActive: 'desc',
      },
    });

    // Parser les user agents et formater les sessions
    const formattedSessions = sessions.map(s => {
      const { browser, os, device } = parseUserAgent(s.userAgent);
      return {
        id: s.id,
        token: s.token.slice(0, 8) + '...', // Masquer le token complet
        isCurrentSession: false, // À déterminer côté client
        device,
        browser,
        os,
        ip: s.ip,
        country: s.country,
        city: s.city,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isTrusted: s.isTrusted,
      };
    });

    return NextResponse.json({
      sessions: formattedSessions,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Révoquer des sessions
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, sessionToken, revokeAll } = body;

    if (revokeAll) {
      // Révoquer toutes les autres sessions
      const currentToken = (session as any).sessionId || '';
      const count = await revokeOtherSessions(session.user.id, currentToken);

      await logAction({
        userId: session.user.id,
        action: AuditAction.SESSION_REVOKE,
        status: 'success',
        details: { count, revokeAll: true },
      });

      return NextResponse.json({
        success: true,
        message: `${count} session(s) révoquée(s)`,
        revokedCount: count,
      });
    }

    if (sessionId) {
      // Révoquer une session spécifique
      const targetSession = await db.session.findUnique({
        where: { id: sessionId },
        select: { userId: true, token: true },
      });

      if (!targetSession || targetSession.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }

      await revokeSession(targetSession.token, session.user.id);

      await logAction({
        userId: session.user.id,
        action: AuditAction.SESSION_REVOKE,
        status: 'success',
        details: { sessionId },
      });

      return NextResponse.json({
        success: true,
        message: 'Session révoquée',
      });
    }

    if (sessionToken) {
      // Révoquer par token
      await revokeSession(sessionToken, session.user.id);

      await logAction({
        userId: session.user.id,
        action: AuditAction.SESSION_REVOKE,
        status: 'success',
        details: { sessionToken: sessionToken.slice(0, 8) + '...' },
      });

      return NextResponse.json({
        success: true,
        message: 'Session révoquée',
      });
    }

    return NextResponse.json(
      { error: 'Paramètres invalides' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erreur lors de la révocation des sessions:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST - Marquer un appareil comme approuvé
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, trustDevice } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID de session requis' },
        { status: 400 }
      );
    }

    const targetSession = await db.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!targetSession || targetSession.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // Définir la date d'expiration de la confiance (30 jours)
    const trustedUntil = trustDevice
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

    await db.session.update({
      where: { id: sessionId },
      data: {
        isTrusted: trustDevice,
        trustedUntil,
      },
    });

    await logAction({
      userId: session.user.id,
      action: trustDevice ? AuditAction.TRUSTED_DEVICE_ADD : AuditAction.TRUSTED_DEVICE_REMOVE,
      status: 'success',
      details: { sessionId },
    });

    return NextResponse.json({
      success: true,
      message: trustDevice
        ? 'Appareil marqué comme approuvé'
        : 'Appareil retiré des appareils approuvés',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la session:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
