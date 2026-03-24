// =====================================================
// RELANCEPRO AFRICA - SMS Settings API Route
// Manage SMS provider settings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { encryptForStorage } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';

// =====================================================
// GET: Get SMS Settings
// =====================================================

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let settings = await db.smsSettings.findUnique({
      where: { profileId: session.user.id },
    });

    if (!settings) {
      settings = await db.smsSettings.create({
        data: { profileId: session.user.id },
      });
    }

    // Don't return sensitive data in full
    return NextResponse.json({
      ...settings,
      twilioAuthToken: settings.twilioAuthToken ? '••••••••' : '',
      africastalkingApiKey: settings.africastalkingApiKey ? '••••••••' : '',
    });
  } catch (error) {
    console.error('[SMS Settings] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT: Update SMS Settings
// =====================================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      twilioEnabled,
      africastalkingApiKey,
      africastalkingUsername,
      africastalkingSenderId,
      africastalkingEnabled,
      defaultProvider,
      senderIdEnabled,
      customSenderId,
      monthlySmsLimit,
    } = body;

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    // Twilio settings
    if (twilioAccountSid !== undefined) {
      updateData.twilioAccountSid = twilioAccountSid || null;
    }
    if (twilioAuthToken !== undefined && twilioAuthToken !== '••••••••') {
      updateData.twilioAuthToken = twilioAuthToken ? encryptForStorage(twilioAuthToken) : null;
    }
    if (twilioPhoneNumber !== undefined) {
      updateData.twilioPhoneNumber = twilioPhoneNumber || null;
    }
    if (twilioEnabled !== undefined) {
      updateData.twilioEnabled = twilioEnabled;
    }

    // Africa's Talking settings
    if (africastalkingApiKey !== undefined && africastalkingApiKey !== '••••••••') {
      updateData.africastalkingApiKey = africastalkingApiKey ? encryptForStorage(africastalkingApiKey) : null;
    }
    if (africastalkingUsername !== undefined) {
      updateData.africastalkingUsername = africastalkingUsername || null;
    }
    if (africastalkingSenderId !== undefined) {
      updateData.africastalkingSenderId = africastalkingSenderId || null;
    }
    if (africastalkingEnabled !== undefined) {
      updateData.africastalkingEnabled = africastalkingEnabled;
    }

    // General settings
    if (defaultProvider !== undefined) {
      updateData.defaultProvider = defaultProvider;
    }
    if (senderIdEnabled !== undefined) {
      updateData.senderIdEnabled = senderIdEnabled;
    }
    if (customSenderId !== undefined) {
      updateData.customSenderId = customSenderId || null;
    }
    if (monthlySmsLimit !== undefined) {
      updateData.monthlySmsLimit = Math.min(Math.max(monthlySmsLimit, 100), 100000);
    }

    // Upsert settings
    const settings = await db.smsSettings.upsert({
      where: { profileId: session.user.id },
      create: {
        profileId: session.user.id,
        ...updateData,
      },
      update: updateData,
    });

    // Log audit
    await logAudit({
      userId: session.user.id,
      action: 'sms_settings_updated',
      entityType: 'SmsSettings',
      entityId: settings.id,
      details: JSON.stringify({
        twilioEnabled: settings.twilioEnabled,
        africastalkingEnabled: settings.africastalkingEnabled,
        defaultProvider: settings.defaultProvider,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Paramètres SMS mis à jour',
      settings: {
        ...settings,
        twilioAuthToken: '••••••••',
        africastalkingApiKey: '••••••••',
      },
    });
  } catch (error) {
    console.error('[SMS Settings] PUT error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
