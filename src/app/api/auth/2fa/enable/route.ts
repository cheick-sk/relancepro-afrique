/**
 * API Route: Enable Two-Factor Authentication
 * POST /api/auth/2fa/enable
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { generateTOTPSecret, generateQRCode, generateRecoveryCodes } from '@/lib/two-factor';
import { AuditAction, logAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérifier si 2FA est déjà activé
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });

    if (user?.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA déjà activé' },
        { status: 400 }
      );
    }

    // Générer le secret TOTP
    const { secret, uri, encrypted } = generateTOTPSecret(
      session.user.email,
      'RelancePro Africa'
    );

    // Générer le QR code
    const qrCode = await generateQRCode(uri);

    // Générer les codes de récupération
    const { codes, encrypted: encryptedCodes } = generateRecoveryCodes();

    // Stocker temporairement le secret (pas encore activé)
    await db.profile.update({
      where: { id: session.user.id },
      data: {
        twoFactorBackupCodes: encrypted,
      },
    });

    // Log de l'action
    await logAction({
      userId: session.user.id,
      action: AuditAction.TWO_FACTOR_ENABLE,
      status: 'success',
      details: { step: 'initiated' },
    });

    return NextResponse.json({
      success: true,
      qrCode,
      secret, // Affiché pour configuration manuelle
      recoveryCodes: codes, // À afficher une seule fois
    });
  } catch (error) {
    console.error('Erreur lors de l\'activation 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
