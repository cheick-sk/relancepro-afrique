// =====================================================
// RELANCEPRO AFRICA - SMS Send API Route
// Send SMS messages via Twilio or Africa's Talking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { sendSMS, validateAfricanPhone, estimateSMSCost, selectBestProvider } from '@/lib/sms/service';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

// =====================================================
// POST: Send SMS
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Rate limiting
    const identifier = getRateLimitIdentifier(
      request.headers.get('x-forwarded-for'),
      session.user.id
    );
    const rateLimit = checkRateLimit(identifier, 'reminders');
    if (rateLimit.blocked) {
      return NextResponse.json(
        { error: rateLimit.retryAfter ? `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter} secondes.` : 'Trop de requêtes' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    // Parse request body
    const body = await request.json();
    const { to, message, clientId, debtId, reminderId, senderId } = body;

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Numéro de téléphone et message requis' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 1530) { // ~10 SMS segments
      return NextResponse.json(
        { error: 'Message trop long (max 1530 caractères)' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneValidation = validateAfricanPhone(to);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Numéro de téléphone invalide' },
        { status: 400 }
      );
    }

    // Get user's SMS settings
    let smsSettings = await db.smsSettings.findUnique({
      where: { profileId: session.user.id },
    });

    // Create default SMS settings if not exists
    if (!smsSettings) {
      smsSettings = await db.smsSettings.create({
        data: { profileId: session.user.id },
      });
    }

    // Check monthly limit
    if (smsSettings.monthlySmsUsed >= smsSettings.monthlySmsLimit) {
      return NextResponse.json(
        { error: 'Limite mensuelle de SMS atteinte' },
        { status: 403 }
      );
    }

    // Estimate cost
    const costEstimate = estimateSMSCost(message, to);

    // Select provider
    const { preferred } = selectBestProvider(to);

    // Create SMS log entry
    const smsLog = await db.smsLog.create({
      data: {
        profileId: session.user.id,
        to,
        message,
        provider: preferred,
        status: 'pending',
        cost: costEstimate.cost,
        segments: costEstimate.segments,
        clientId,
        debtId,
        reminderId,
      },
    });

    // Send SMS
    const result = await sendSMS({
      to,
      message,
      profileId: session.user.id,
      senderId: senderId || smsSettings.customSenderId || undefined,
    });

    // Update SMS log with result
    await db.smsLog.update({
      where: { id: smsLog.id },
      data: {
        messageId: result.messageId,
        status: result.status,
        cost: result.cost || costEstimate.cost,
        segments: result.segments || costEstimate.segments,
        errorCode: result.error ? 'SEND_ERROR' : null,
        errorMessage: result.error,
        sentAt: result.success ? new Date() : null,
      },
    });

    // Update monthly usage if successful
    if (result.success) {
      await db.smsSettings.update({
        where: { profileId: session.user.id },
        data: {
          monthlySmsUsed: { increment: 1 },
        },
      });
    }

    // Log audit
    await logAudit({
      userId: session.user.id,
      action: result.success ? 'sms_sent' : 'sms_failed',
      entityType: 'SmsLog',
      entityId: smsLog.id,
      details: JSON.stringify({
        to,
        provider: result.provider,
        status: result.status,
        cost: result.cost,
      }),
      status: result.success ? 'success' : 'failed',
    });

    // Return response
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SMS envoyé avec succès',
        data: {
          id: smsLog.id,
          messageId: result.messageId,
          status: result.status,
          cost: result.cost,
          segments: result.segments,
          provider: result.provider,
        },
      }, { headers: rateLimit.headers });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Erreur lors de l\'envoi du SMS',
        data: {
          id: smsLog.id,
          status: result.status,
        },
      }, { status: 500, headers: rateLimit.headers });
    }
  } catch (error) {
    console.error('[SMS] Send error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'envoi du SMS' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Get SMS Logs
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');

    // Build where clause
    const where: Record<string, unknown> = {
      profileId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (provider) {
      where.provider = provider;
    }

    // Get SMS logs
    const [logs, total] = await Promise.all([
      db.smsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.smsLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[SMS] Get logs error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des logs' },
      { status: 500 }
    );
  }
}
