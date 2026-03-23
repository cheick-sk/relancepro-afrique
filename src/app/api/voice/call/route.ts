// =====================================================
// RELANCEPRO AFRICA - Voice Call API Route
// Initiate voice calls via Twilio or Africa's Talking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { sendVoiceCall, validateAfricanPhone, estimateVoiceCost, selectBestProvider, generateVoiceScript } from '@/lib/sms/service';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { VoiceLanguage } from '@/lib/sms/types';

// =====================================================
// POST: Initiate Voice Call
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

    // Rate limiting (stricter for voice calls)
    const identifier = getRateLimitIdentifier(
      request.headers.get('x-forwarded-for'),
      session.user.id
    );
    const rateLimit = checkRateLimit(identifier, 'strict');
    if (rateLimit.blocked) {
      return NextResponse.json(
        { error: rateLimit.retryAfter ? `Trop d'appels. Réessayez dans ${rateLimit.retryAfter} secondes.` : 'Trop de requêtes' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      to, 
      message, 
      audioUrl, 
      language = 'fr-FR',
      clientId,
      debtId,
      reminderId,
      scheduledAt,
      useTemplate,
      templateParams,
    } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Numéro de téléphone requis' },
        { status: 400 }
      );
    }

    // Either message, audioUrl, or useTemplate must be provided
    if (!message && !audioUrl && !useTemplate) {
      return NextResponse.json(
        { error: 'Message, audioUrl ou template requis' },
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

    // Generate message from template if requested
    let finalMessage = message;
    if (useTemplate && templateParams) {
      finalMessage = generateVoiceScript({
        clientName: templateParams.clientName || 'Client',
        amount: templateParams.amount || '',
        currency: templateParams.currency || 'GNF',
        reference: templateParams.reference,
        companyName: templateParams.companyName,
        language: language as VoiceLanguage,
      });
    }

    // Validate message length for TTS
    if (finalMessage && finalMessage.length > 1000) {
      return NextResponse.json(
        { error: 'Message trop long pour la synthèse vocale (max 1000 caractères)' },
        { status: 400 }
      );
    }

    // Estimate cost
    const costEstimate = estimateVoiceCost(to, 1);

    // Select provider
    const { preferred } = selectBestProvider(to);

    // Get user's profile for callback URL
    const callbackUrl = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'}/api/webhooks/twilio`;

    // Create voice call log entry
    const voiceCall = await db.voiceCall.create({
      data: {
        profileId: session.user.id,
        to,
        callType: audioUrl ? 'audio' : 'tts',
        message: finalMessage,
        audioUrl,
        provider: preferred,
        status: 'queued',
        cost: costEstimate.cost,
        language: language,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        clientId,
        debtId,
        reminderId,
      },
    });

    // Initiate voice call
    const result = await sendVoiceCall({
      to,
      message: finalMessage,
      audioUrl,
      language: language as VoiceLanguage,
      callbackUrl,
    });

    // Update voice call log with result
    await db.voiceCall.update({
      where: { id: voiceCall.id },
      data: {
        callId: result.callId,
        status: result.status,
        cost: result.cost || costEstimate.cost,
        errorCode: result.error ? 'CALL_ERROR' : null,
        errorMessage: result.error,
        initiatedAt: result.success ? new Date() : null,
      },
    });

    // Log audit
    await logAudit({
      userId: session.user.id,
      action: result.success ? 'voice_call_initiated' : 'voice_call_failed',
      entityType: 'VoiceCall',
      entityId: voiceCall.id,
      details: JSON.stringify({
        to,
        provider: result.provider,
        status: result.status,
        callType: audioUrl ? 'audio' : 'tts',
      }),
      status: result.success ? 'success' : 'failed',
    });

    // Return response
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Appel vocal initié avec succès',
        data: {
          id: voiceCall.id,
          callId: result.callId,
          status: result.status,
          provider: result.provider,
          cost: result.cost,
        },
      }, { headers: rateLimit.headers });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Erreur lors de l\'initiation de l\'appel',
        data: {
          id: voiceCall.id,
          status: result.status,
        },
      }, { status: 500, headers: rateLimit.headers });
    }
  } catch (error) {
    console.error('[Voice] Call error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'initiation de l\'appel' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Get Voice Call Logs
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

    // Get voice call logs
    const [calls, total] = await Promise.all([
      db.voiceCall.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.voiceCall.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: calls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Voice] Get logs error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des logs' },
      { status: 500 }
    );
  }
}
