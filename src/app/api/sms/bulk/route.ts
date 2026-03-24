// =====================================================
// RELANCEPRO AFRICA - Bulk SMS API Route
// Send bulk SMS messages via Twilio or Africa's Talking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { sendBulkSMS, validateAfricanPhone, estimateSMSCost, selectBestProvider } from '@/lib/sms/provider';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { SMS_RATE_LIMITS } from '@/lib/sms/config';

// =====================================================
// POST: Send Bulk SMS
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
    const { recipients, message, senderId, clientId, debtId } = body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Liste de destinataires requise' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message requis' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 1530) {
      return NextResponse.json(
        { error: 'Message trop long (max 1530 caractères)' },
        { status: 400 }
      );
    }

    // Validate batch size
    if (recipients.length > SMS_RATE_LIMITS.bulkBatchSize) {
      return NextResponse.json(
        { error: `Maximum ${SMS_RATE_LIMITS.bulkBatchSize} destinataires par lot` },
        { status: 400 }
      );
    }

    // Validate all phone numbers
    const invalidPhones: string[] = [];
    const validRecipients: string[] = [];

    for (const phone of recipients) {
      const validation = validateAfricanPhone(phone);
      if (validation.valid) {
        validRecipients.push(phone);
      } else {
        invalidPhones.push(phone);
      }
    }

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'Aucun numéro de téléphone valide', invalidPhones },
        { status: 400 }
      );
    }

    // Get user's SMS settings
    let smsSettings = await db.smsSettings.findUnique({
      where: { profileId: session.user.id },
    });

    if (!smsSettings) {
      smsSettings = await db.smsSettings.create({
        data: { profileId: session.user.id },
      });
    }

    // Check monthly limit
    const projectedUsage = smsSettings.monthlySmsUsed + validRecipients.length;
    if (projectedUsage > smsSettings.monthlySmsLimit) {
      return NextResponse.json(
        { error: `Limite mensuelle dépassée. Restant: ${smsSettings.monthlySmsLimit - smsSettings.monthlySmsUsed} SMS` },
        { status: 403 }
      );
    }

    // Select provider
    const { preferred } = selectBestProvider(validRecipients[0]);

    // Estimate total cost
    let totalEstimatedCost = 0;
    for (const phone of validRecipients) {
      const estimate = estimateSMSCost(message, phone);
      totalEstimatedCost += estimate.cost;
    }

    // Create bulk SMS log entry
    const bulkLog = await db.smsLog.create({
      data: {
        profileId: session.user.id,
        to: validRecipients.join(','),
        message: `[BULK] ${message}`,
        provider: preferred,
        status: 'pending',
        cost: totalEstimatedCost,
        segments: Math.ceil(message.length / 160) * validRecipients.length,
        clientId,
        debtId,
      },
    });

    // Send bulk SMS
    const result = await sendBulkSMS({
      recipients: validRecipients,
      message,
      senderId: senderId || smsSettings.customSenderId || undefined,
    });

    // Update bulk log with result
    await db.smsLog.update({
      where: { id: bulkLog.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        cost: result.totalCost || totalEstimatedCost,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.success ? null : `${result.totalFailed} échecs sur ${validRecipients.length}`,
      },
    });

    // Update monthly usage
    await db.smsSettings.update({
      where: { profileId: session.user.id },
      data: {
        monthlySmsUsed: { increment: result.totalSent },
      },
    });

    // Log audit
    await logAudit({
      userId: session.user.id,
      action: result.success ? 'bulk_sms_sent' : 'bulk_sms_partial',
      entityType: 'SmsLog',
      entityId: bulkLog.id,
      details: JSON.stringify({
        totalRecipients: validRecipients.length,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        provider: preferred,
        cost: result.totalCost,
      }),
      status: result.success ? 'success' : 'partial',
    });

    // Return response
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `${result.totalSent} SMS envoyés avec succès` 
        : `${result.totalSent} SMS envoyés, ${result.totalFailed} échecs`,
      data: {
        id: bulkLog.id,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        totalCost: result.totalCost,
        provider: preferred,
        invalidPhones: invalidPhones.length > 0 ? invalidPhones : undefined,
      },
    }, { headers: rateLimit.headers });

  } catch (error) {
    console.error('[Bulk SMS] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'envoi des SMS' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Get Bulk SMS History
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get bulk SMS logs (messages starting with [BULK])
    const [logs, total] = await Promise.all([
      db.smsLog.findMany({
        where: {
          profileId: session.user.id,
          message: { startsWith: '[BULK]' },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.smsLog.count({
        where: {
          profileId: session.user.id,
          message: { startsWith: '[BULK]' },
        },
      }),
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
    console.error('[Bulk SMS] Get history error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
