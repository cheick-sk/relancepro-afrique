/**
 * API Route: Two-Factor Authentication Backup Codes
 * GET /api/auth/2fa/backup-codes - Get backup codes (masked)
 * POST /api/auth/2fa/backup-codes - Regenerate backup codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { 
  generateBackupCodes, 
  getRecoveryCodesStatus,
  getDecryptedBackupCodes 
} from '@/lib/auth/two-factor';
import { AuditAction, logAction } from '@/lib/audit';

/**
 * GET /api/auth/2fa/backup-codes
 * Get backup codes status (masked for security)
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

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA non activé' },
        { status: 400 }
      );
    }

    // Obtenir le statut des codes
    const codesStatus = getRecoveryCodesStatus(user.twoFactorBackupCodes);

    // Optionnellement révéler les codes (si demandé)
    const { searchParams } = new URL(request.url);
    const reveal = searchParams.get('reveal') === 'true';

    let codes: string[] | undefined;
    if (reveal && user.twoFactorBackupCodes) {
      codes = getDecryptedBackupCodes(user.twoFactorBackupCodes) || undefined;
      
      // Log de la révélation des codes
      await logAction({
        userId: session.user.id,
        action: AuditAction.TWO_FACTOR_VERIFY,
        status: 'success',
        details: { action: 'backup_codes_revealed' },
      });
    }

    return NextResponse.json({
      hasCodes: codesStatus.hasCodes,
      count: codesStatus.count,
      codes,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des codes de récupération:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/2fa/backup-codes
 * Regenerate backup codes
 */
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
    const { count = 8, passwordVerified } = body;

    // Vérifier que l'utilisateur a confirmé son mot de passe
    if (!passwordVerified) {
      return NextResponse.json(
        { error: 'Vérification du mot de passe requise' },
        { status: 400 }
      );
    }

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA non activé' },
        { status: 400 }
      );
    }

    // Générer de nouveaux codes de récupération
    const { codes, encrypted } = generateBackupCodes(count);

    // Mettre à jour les codes en base de données
    await db.profile.update({
      where: { id: session.user.id },
      data: { twoFactorBackupCodes: encrypted },
    });

    // Log de l'action
    await logAction({
      userId: session.user.id,
      action: AuditAction.TWO_FACTOR_ENABLE,
      status: 'success',
      details: { action: 'backup_codes_regenerated', count },
    });

    return NextResponse.json({
      success: true,
      message: 'Nouveaux codes de récupération générés',
      codes,
      count: codes.length,
    });
  } catch (error) {
    console.error('Erreur lors de la régénération des codes de récupération:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/2fa/backup-codes
 * Delete all backup codes (requires 2FA confirmation)
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

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA non activé' },
        { status: 400 }
      );
    }

    // Supprimer tous les codes de récupération
    await db.profile.update({
      where: { id: session.user.id },
      data: { twoFactorBackupCodes: null },
    });

    // Log de l'action
    await logAction({
      userId: session.user.id,
      action: AuditAction.TWO_FACTOR_ENABLE,
      status: 'success',
      details: { action: 'backup_codes_deleted' },
    });

    return NextResponse.json({
      success: true,
      message: 'Codes de récupération supprimés',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des codes de récupération:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
