/**
 * API Route: Disable Two-Factor Authentication
 * POST /api/auth/2fa/disable
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { verifyTOTP, verifyRecoveryCode } from '@/lib/two-factor';
import { AuditAction, logAction } from '@/lib/audit';
import { compare } from 'bcryptjs';

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
        { error: 'Mot de passe requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { 
        password: true,
        twoFactorEnabled: true, 
        twoFactorBackupCodes: true,
        twoFactorSecret: true,
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
      if (code && user.twoFactorBackupCodes) {
        const isValid = verifyTOTP(code, user.twoFactorBackupCodes);
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
      if (recoveryCode && user.twoFactorSecret) {
        const result = verifyRecoveryCode(recoveryCode, user.twoFactorSecret);
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
    await db.profile.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorBackupCodes: null,
        twoFactorSecret: null,
      },
    });

    // Log de l'action
    await logAction({
      userId: session.user.id,
      action: AuditAction.TWO_FACTOR_DISABLE,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: '2FA désactivé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la désactivation 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
