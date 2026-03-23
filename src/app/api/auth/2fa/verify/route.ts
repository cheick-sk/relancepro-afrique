/**
 * API Route: Two-Factor Authentication Verification
 * POST /api/auth/2fa/verify - Verify 2FA code during login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { verifyTOTP, verifyBackupCode, getRecoveryCodesStatus } from '@/lib/auth/two-factor';
import { AuditAction, logAction } from '@/lib/audit';
import { randomUUID } from 'crypto';

/**
 * POST /api/auth/2fa/verify
 * Verify 2FA code during login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      code, 
      recoveryCode, 
      rememberDevice,
      sessionId 
    } = body;

    // Vérifier les paramètres requis
    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    if (!code && !recoveryCode) {
      return NextResponse.json(
        { error: 'Code 2FA ou code de récupération requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await db.profile.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        subscriptionStatus: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
        teamId: true,
        teamRole: true,
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
        { error: '2FA non activé pour ce compte' },
        { status: 400 }
      );
    }

    let isVerified = false;
    let codesRemaining: number | undefined;

    // Vérifier le code TOTP
    if (code && user.twoFactorSecret) {
      isVerified = verifyTOTP(code, user.twoFactorSecret);
      
      if (!isVerified) {
        await logAction({
          userId: user.id,
          action: AuditAction.TWO_FACTOR_VERIFY,
          status: 'failed',
          details: { reason: 'invalid_totp' },
        });
      }
    }

    // Vérifier le code de récupération
    if (recoveryCode && !isVerified && user.twoFactorBackupCodes) {
      const result = verifyBackupCode(recoveryCode, user.twoFactorBackupCodes);
      isVerified = result.valid;
      codesRemaining = result.codesLeft;

      if (isVerified) {
        // Mettre à jour les codes de récupération restants
        await db.profile.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: result.remainingCodes },
        });

        await logAction({
          userId: user.id,
          action: AuditAction.RECOVERY_CODE_USED,
          status: 'success',
          details: { codesRemaining: result.codesLeft },
        });
      } else {
        await logAction({
          userId: user.id,
          action: AuditAction.TWO_FACTOR_VERIFY,
          status: 'failed',
          details: { reason: 'invalid_recovery_code' },
        });
      }
    }

    if (!isVerified) {
      return NextResponse.json(
        { error: 'Code invalide', codesRemaining },
        { status: 400 }
      );
    }

    // Log de la vérification réussie
    await logAction({
      userId: user.id,
      action: AuditAction.TWO_FACTOR_VERIFY,
      status: 'success',
      details: { method: code ? 'totp' : 'recovery_code' },
    });

    // Mettre à jour la dernière connexion
    await db.profile.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Si "se souvenir de cet appareil", créer une session de confiance
    if (rememberDevice) {
      const trustedToken = randomUUID();
      const trustedUntil = new Date();
      trustedUntil.setDate(trustedUntil.getDate() + 30); // 30 jours

      await db.session.create({
        data: {
          userId: user.id,
          token: trustedToken,
          isTrusted: true,
          trustedUntil,
          expiresAt: trustedUntil,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName,
          subscriptionStatus: user.subscriptionStatus,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorVerified: true,
          teamId: user.teamId,
          teamRole: user.teamRole,
        },
        trustedDeviceToken: trustedToken,
        codesRemaining,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        subscriptionStatus: user.subscriptionStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorVerified: true,
        teamId: user.teamId,
        teamRole: user.teamRole,
      },
      codesRemaining,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/2fa/verify
 * Check if 2FA is required for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const user = await db.profile.findUnique({
      where: { email },
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

    const codesStatus = getRecoveryCodesStatus(user.twoFactorBackupCodes);

    return NextResponse.json({
      twoFactorEnabled: user.twoFactorEnabled,
      hasRecoveryCodes: codesStatus.hasCodes,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
