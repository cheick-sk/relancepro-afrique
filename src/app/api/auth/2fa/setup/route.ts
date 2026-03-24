/**
 * API Route: Two-Factor Authentication Setup
 * GET /api/auth/2fa/setup - Get 2FA status and QR code
 * POST /api/auth/2fa/setup - Verify and enable 2FA
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { 
  generateTOTPSecret, 
  generateQRCode, 
  generateBackupCodes, 
  verifyTOTP,
  enable2FA,
  getTwoFactorStatus,
  getRecoveryCodesStatus
} from '@/lib/auth/two-factor';
import { AuditAction, logAction } from '@/lib/audit';

/**
 * GET /api/auth/2fa/setup
 * Get 2FA status and setup QR code
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

    // Récupérer le statut 2FA
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Si 2FA est déjà activé, retourner le statut uniquement
    if (user.twoFactorEnabled) {
      const codesStatus = getRecoveryCodesStatus(user.twoFactorBackupCodes);
      
      return NextResponse.json({
        enabled: true,
        hasRecoveryCodes: codesStatus.hasCodes,
        codesRemaining: codesStatus.count,
      });
    }

    // Générer un nouveau secret pour la configuration
    const { secret, uri, encrypted } = generateTOTPSecret(
      session.user.id,
      user.email || session.user.email,
      'RelancePro Africa'
    );

    // Générer le QR code
    const qrCode = await generateQRCode(uri);

    // Générer les codes de récupération
    const { codes, encrypted: encryptedCodes } = generateBackupCodes();

    // Stocker temporairement le secret (pas encore activé)
    await db.profile.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: encrypted,
        twoFactorBackupCodes: encryptedCodes,
      },
    });

    return NextResponse.json({
      enabled: false,
      qrCode,
      secret,
      manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret,
      recoveryCodes: codes,
      instructions: {
        fr: [
          'Téléchargez une application d\'authentification (Google Authenticator, Authy, etc.)',
          'Scannez le QR code ci-dessus',
          'Ou entrez manuellement le code secret',
          'Entrez le code à 6 chiffres généré',
        ],
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du setup 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/2fa/setup
 * Verify code and enable 2FA
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
    const { code, recoveryCodes } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code de vérification requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur avec le secret temporaire
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA déjà activé' },
        { status: 400 }
      );
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Configuration 2FA non initiée' },
        { status: 400 }
      );
    }

    // Vérifier le code TOTP
    const isValid = verifyTOTP(code, user.twoFactorSecret);

    if (!isValid) {
      await logAction({
        userId: session.user.id,
        action: AuditAction.TWO_FACTOR_VERIFY,
        status: 'failed',
        details: { reason: 'invalid_code_setup' },
      });

      return NextResponse.json(
        { error: 'Code invalide. Veuillez réessayer.' },
        { status: 400 }
      );
    }

    // Générer de nouveaux codes de récupération si fournis ou si non existants
    let finalBackupCodes = user.twoFactorBackupCodes;
    let finalCodes: string[] | undefined;

    if (recoveryCodes || !user.twoFactorBackupCodes) {
      const { codes, encrypted } = generateBackupCodes();
      finalBackupCodes = encrypted;
      finalCodes = codes;
    }

    // Activer le 2FA
    await db.profile.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorSecret,
        twoFactorBackupCodes: finalBackupCodes,
      },
    });

    // Log de l'action
    await logAction({
      userId: session.user.id,
      action: AuditAction.TWO_FACTOR_ENABLE,
      status: 'success',
      details: { enabledAt: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: 'Authentification à deux facteurs activée avec succès',
      recoveryCodes: finalCodes,
    });
  } catch (error) {
    console.error('Erreur lors de l\'activation 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
