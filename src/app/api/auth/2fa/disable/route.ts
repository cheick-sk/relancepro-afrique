/**
 * API Route: Disable Two-Factor Authentication
 * POST /api/auth/2fa/disable - Disable 2FA (requires password or code)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { verifyTOTP, verifyBackupCode, disable2FA } from '@/lib/auth/two-factor';
import { AuditAction, logAction } from '@/lib/audit';
import { compare } from 'bcryptjs';

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA (requires password and optionally 2FA code)
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
    const { password, code, recoveryCode } = body;

    // Mot de passe requis pour désactiver le 2FA
    if (!password) {
      return NextResponse.json(
        { error: 'Mot de passe requis pour désactiver le 2FA' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { 
        password: true,
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

    // Vérifier le mot de passe
    if (!user.password) {
      return NextResponse.json(
        { error: 'Configuration de compte invalide' },
        { status: 400 }
      );
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      await logAction({
        userId: session.user.id,
        action: AuditAction.TWO_FACTOR_DISABLE,
        status: 'failed',
        details: { reason: 'invalid_password' },
      });

      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 400 }
      );
    }

    // Si 2FA activé, vérifier le code ou le code de récupération
    if (user.twoFactorEnabled) {
      if (!code && !recoveryCode) {
        return NextResponse.json(
          { error: 'Code 2FA ou code de récupération requis' },
          { status: 400 }
        );
      }

      // Vérifier le code TOTP
      if (code && user.twoFactorSecret) {
        const isValid = verifyTOTP(code, user.twoFactorSecret);
        if (!isValid) {
          await logAction({
            userId: session.user.id,
            action: AuditAction.TWO_FACTOR_DISABLE,
            status: 'failed',
            details: { reason: 'invalid_totp' },
          });

          return NextResponse.json(
            { error: 'Code 2FA invalide' },
            { status: 400 }
          );
        }
      }

      // Vérifier le code de récupération
      if (recoveryCode && user.twoFactorBackupCodes) {
        const result = verifyBackupCode(recoveryCode, user.twoFactorBackupCodes);
        if (!result.valid) {
          await logAction({
            userId: session.user.id,
            action: AuditAction.TWO_FACTOR_DISABLE,
            status: 'failed',
            details: { reason: 'invalid_recovery_code' },
          });

          return NextResponse.json(
            { error: 'Code de récupération invalide' },
            { status: 400 }
          );
        }
      }
    }

    // Désactiver le 2FA
    await disable2FA(session.user.id);

    // Révoquer toutes les sessions de confiance
    await db.session.updateMany({
      where: {
        userId: session.user.id,
        isTrusted: true,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Authentification à deux facteurs désactivée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la désactivation 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
