// =====================================================
// RELANCEPRO AFRICA - API Cron for Subscription Expiry Check
// Checks and updates expired subscriptions
// Sends expiration warnings
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/services/email";

// =====================================================
// TYPES
// =====================================================

interface ExpiryCheckResult {
  checked: number;
  expired: number;
  warned: number;
  demoExpired: number;
  errors: string[];
}

interface SubscriptionInfo {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionEnd: Date | null;
  demoExpiresAt: Date | null;
}

// =====================================================
// AUTHENTICATION
// =====================================================

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET not configured");
    return false;
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === cronSecret;
  }

  const urlSecret = request.nextUrl.searchParams.get("secret");
  return urlSecret === cronSecret;
}

// =====================================================
// MAIN PROCESSING
// =====================================================

/**
 * Check and process expired subscriptions
 */
async function checkExpiredSubscriptions(): Promise<ExpiryCheckResult> {
  const result: ExpiryCheckResult = {
    checked: 0,
    expired: 0,
    warned: 0,
    demoExpired: 0,
    errors: [],
  };

  const now = new Date();

  try {
    // 1. Find active subscriptions that have expired
    const expiredActiveSubscriptions = await db.profile.findMany({
      where: {
        subscriptionStatus: "active",
        subscriptionEnd: { lt: now },
      },
    });

    result.checked += expiredActiveSubscriptions.length;

    for (const profile of expiredActiveSubscriptions) {
      try {
        // Update subscription status to expired
        await db.profile.update({
          where: { id: profile.id },
          data: {
            subscriptionStatus: "expired",
          },
        });

        // Send expiration notification email
        await sendExpirationEmail(profile, "subscription");

        result.expired++;
      } catch (error) {
        result.errors.push(
          `Failed to process expired subscription for ${profile.email}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // 2. Find subscriptions expiring soon (within 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringSoonSubscriptions = await db.profile.findMany({
      where: {
        subscriptionStatus: "active",
        subscriptionEnd: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    });

    result.checked += expiringSoonSubscriptions.length;

    for (const profile of expiringSoonSubscriptions) {
      try {
        // Check if we've already sent a warning recently
        const recentWarnings = await db.notification.count({
          where: {
            profileId: profile.id,
            type: "warning",
            title: { contains: "Expiration" },
            createdAt: { gte: threeDaysFromNow },
          },
        });

        if (recentWarnings === 0) {
          // Send expiration warning
          await sendExpirationWarning(profile);
          result.warned++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to send warning to ${profile.email}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // 3. Find expired demo accounts
    const expiredDemoAccounts = await db.profile.findMany({
      where: {
        subscriptionStatus: "demo",
        demoExpiresAt: { lt: now },
      },
    });

    result.checked += expiredDemoAccounts.length;

    for (const profile of expiredDemoAccounts) {
      try {
        // Update demo account to expired
        await db.profile.update({
          where: { id: profile.id },
          data: {
            subscriptionStatus: "expired",
          },
        });

        // Send demo expiration email
        await sendExpirationEmail(profile, "demo");

        // Create notification
        await db.notification.create({
          data: {
            profileId: profile.id,
            type: "warning",
            title: "Période d'essai expirée",
            message:
              "Votre période d'essai gratuite a expiré. Abonnez-vous pour continuer à utiliser RelancePro Africa.",
            actionUrl: "/subscription",
            actionLabel: "S'abonner",
          },
        });

        result.demoExpired++;
      } catch (error) {
        result.errors.push(
          `Failed to process expired demo for ${profile.email}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // 4. Find demo accounts expiring in 1 day
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const demoExpiringSoon = await db.profile.findMany({
      where: {
        subscriptionStatus: "demo",
        demoExpiresAt: {
          gte: now,
          lte: oneDayFromNow,
        },
      },
    });

    result.checked += demoExpiringSoon.length;

    for (const profile of demoExpiringSoon) {
      try {
        // Check if warning already sent
        const recentWarnings = await db.notification.count({
          where: {
            profileId: profile.id,
            type: "warning",
            title: { contains: "essai" },
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentWarnings === 0) {
          // Send demo expiration warning
          await sendDemoExpirationWarning(profile);
          result.warned++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to send demo warning to ${profile.email}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return result;
  } catch (error) {
    console.error("[Cron] Error checking expired subscriptions:", error);
    throw error;
  }
}

/**
 * Send expiration notification email
 */
async function sendExpirationEmail(
  profile: SubscriptionInfo,
  type: "subscription" | "demo"
): Promise<void> {
  const companyName = profile.companyName || profile.name || "Cher client";

  const content = {
    subscription: {
      subject: "Votre abonnement RelancePro Africa a expiré",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">RelancePro Africa</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2>Abonnement expiré</h2>
            <p>Bonjour ${companyName},</p>
            <p>Votre abonnement RelancePro Africa a expiré. Vous avez maintenant accès aux fonctionnalités limitées du plan gratuit.</p>
            <p>Pour continuer à profiter de toutes les fonctionnalités, veuillez renouveler votre abonnement.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://relancepro.africa"}/subscription" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Renouveler mon abonnement
              </a>
            </div>
            <p>L'équipe RelancePro Africa</p>
          </div>
        </div>
      `,
    },
    demo: {
      subject: "Votre période d'essai RelancePro Africa est terminée",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">RelancePro Africa</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2>Période d'essai terminée</h2>
            <p>Bonjour ${companyName},</p>
            <p>Votre période d'essai gratuite de 14 jours est terminée. Nous espérons que vous avez apprécié découvrir RelancePro Africa !</p>
            <p>Pour continuer à gérer vos créances efficacement, abonnez-vous à l'un de nos plans.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://relancepro.africa"}/subscription" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Découvrir nos offres
              </a>
            </div>
            <p>Merci d'avoir essayé RelancePro Africa !</p>
            <p>L'équipe RelancePro Africa</p>
          </div>
        </div>
      `,
    },
  };

  const emailContent = content[type];

  await sendEmail({
    to: profile.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });
}

/**
 * Send expiration warning email
 */
async function sendExpirationWarning(profile: SubscriptionInfo): Promise<void> {
  const companyName = profile.companyName || profile.name || "Cher client";
  const daysLeft = Math.ceil(
    ((profile.subscriptionEnd?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Create in-app notification
  await db.notification.create({
    data: {
      profileId: profile.id,
      type: "warning",
      title: "Expiration prochaine",
      message: `Votre abonnement expire dans ${daysLeft} jour(s). Renouvelez-le pour éviter toute interruption.`,
      actionUrl: "/subscription",
      actionLabel: "Renouveler",
    },
  });

  // Send email
  await sendEmail({
    to: profile.email,
    subject: `Votre abonnement expire dans ${daysLeft} jour(s)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">RelancePro Africa</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2>Rappel : Expiration prochaine</h2>
          <p>Bonjour ${companyName},</p>
          <p>Votre abonnement RelancePro Africa expire dans <strong>${daysLeft} jour(s)</strong>.</p>
          <p>Pour éviter toute interruption de service, veuillez renouveler votre abonnement avant la date d'expiration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://relancepro.africa"}/subscription" 
               style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Renouveler maintenant
            </a>
          </div>
          <p>L'équipe RelancePro Africa</p>
        </div>
      </div>
    `,
  });
}

/**
 * Send demo expiration warning
 */
async function sendDemoExpirationWarning(profile: SubscriptionInfo): Promise<void> {
  const companyName = profile.companyName || profile.name || "Cher client";

  // Create in-app notification
  await db.notification.create({
    data: {
      profileId: profile.id,
      type: "warning",
      title: "Fin d'essai imminent",
      message:
        "Votre période d'essai se termine demain. Abonnez-vous pour conserver vos données.",
      actionUrl: "/subscription",
      actionLabel: "S'abonner",
    },
  });

  // Send email
  await sendEmail({
    to: profile.email,
    subject: "Votre période d'essai se termine demain",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">RelancePro Africa</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2>⚠️ Dernier jour d'essai</h2>
          <p>Bonjour ${companyName},</p>
          <p>Votre période d'essai gratuite se termine <strong>demain</strong>.</p>
          <p>Ne perdez pas vos données ! Abonnez-vous maintenant pour continuer à utiliser RelancePro Africa.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://relancepro.africa"}/subscription" 
               style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Choisir un plan
            </a>
          </div>
          <p>L'équipe RelancePro Africa</p>
        </div>
      </div>
    `,
  });
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * GET /api/cron/check-expired
 * Check and process expired subscriptions
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authentication
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting expired subscription check...");

    const result = await checkExpiredSubscriptions();

    const duration = Date.now() - startTime;

    console.log(`[Cron] Subscription check completed in ${duration}ms:`, result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        checked: result.checked,
        expired: result.expired,
        warned: result.warned,
        demoExpired: result.demoExpired,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("[Cron] Error checking expired subscriptions:", error);

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/check-expired
 * Support for webhooks
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
