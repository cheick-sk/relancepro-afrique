/**
 * API Route: Verify and Activate Two-Factor Authentication
 * POST /api/auth/2fa/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { verifyTOTP, generateRecoveryCodes } from '@/lib/two-factor';
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

    const body = await request.json();
    const { code, generateNewRecoveryCodes } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { 
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

    // Vérifier le code TOTP
    // Le secret temporaire est stocké dans twoFactorBackupCodes lors de l'initialisation
    const secretToVerify = user.twoFactorBackupCodes;
    
    if (!secretToVerify) {
      return NextResponse.json(
        { error: 'Configuration 2FA non initiée. Veuillez d\'abord activer le 2FA.' },
        { status: 400 }
      );
    }

    const isValid = verifyTOTP(code, secretToVerify);

    if (!isValid) {
      await logAction({
        userId: session.user.id,
        action: AuditAction.TWO_FACTOR_VERIFY,
        status: 'failed',
        details: { reason: 'invalid_code' },
      });

      return NextResponse.json(
        { error: 'Code invalide' },
        { status: 400 }
      );
    }

    // Générer de nouveaux codes de récupération si demandé
    let recoveryCodes: string[] | undefined;
    let encryptedRecoveryCodes = user.twoFactorSecret; // Garder les codes existants par défaut

    if (generateNewRecoveryCodes || !user.twoFactorSecret) {
      const { codes, encrypted } = generateRecoveryCodes();
      recoveryCodes = codes;
      encryptedRecoveryCodes = encrypted;
    }

    // Activer le 2FA et stocker les codes de récupération
    await db.profile.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedRecoveryCodes,
        twoFactorBackupCodes: secretToVerify, // Le secret TOTP reste stocké ici
      },
    });

    // Log de l'action
    await logAction({
      userId: session.user.id,
      action: AuditAction.TWO_FACTOR_ENABLE,
      status: 'success',
      details: { step: 'completed' },
    });

    return NextResponse.json({
      success: true,
      message: '2FA activé avec succès',
      recoveryCodes, // Uniquement si de nouveaux codes ont été générés
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
 * Endpoint pour vérifier un code 2FA lors du login
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email et code requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await db.profile.findUnique({
      where: { email },
      select: { 
        id: true,
        twoFactorEnabled: true, 
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé ou 2FA non activé' },
        { status: 400 }
      );
    }

    // Vérifier le code
    const isValid = verifyTOTP(code, user.twoFactorBackupCodes || '');

    if (!isValid) {
      await logAction({
        userId: user.id,
        action: AuditAction.TWO_FACTOR_VERIFY,
        status: 'failed',
        details: { reason: 'invalid_code_login' },
      });

      return NextResponse.json(
        { error: 'Code invalide' },
        { status: 400 }
      );
    }

    await logAction({
      userId: user.id,
      action: AuditAction.TWO_FACTOR_VERIFY,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification 2FA login:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
