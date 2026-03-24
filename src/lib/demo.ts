// =====================================================
// RELANCEPRO AFRICA - Demo Mode Utilities
// System for managing demo mode with limitations
// =====================================================

import { db } from "@/lib/db";

// =====================================================
// CONSTANTS
// =====================================================

export const DEMO_CONFIG = {
  duration: 7, // days
  limits: {
    maxClients: 5,
    maxEmailReminders: 10,
    maxWhatsAppReminders: 5,
  },
  features: {
    basicAI: true,
    advancedAI: false,
    customTemplates: false,
    webhooks: false,
    apiAccess: false,
  },
};

// =====================================================
// TYPES
// =====================================================

export type DemoAction = "create_client" | "send_email" | "send_whatsapp" | "export";

export interface DemoLimits {
  maxClients: number;
  maxEmailReminders: number;
  maxWhatsAppReminders: number;
}

export interface DemoUsage {
  clients: number;
  emailReminders: number;
  whatsappReminders: number;
  daysRemaining: number;
  isExpired: boolean;
}

export interface DemoCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

export interface ProfileWithDemo {
  id: string;
  subscriptionStatus: string;
  demoStartedAt: Date | null;
  demoExpiresAt: Date | null;
}

// =====================================================
// MAIN FUNCTIONS
// =====================================================

/**
 * Check if demo mode is still active for a profile
 */
export function isDemoActive(profile: ProfileWithDemo): boolean {
  if (profile.subscriptionStatus !== "demo") {
    return false;
  }

  if (!profile.demoExpiresAt) {
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(profile.demoExpiresAt);

  return now <= expiresAt;
}

/**
 * Get remaining days in demo period
 */
export function getDemoRemainingDays(profile: ProfileWithDemo): number {
  if (!profile.demoExpiresAt) {
    return 0;
  }

  const now = new Date();
  const expiresAt = new Date(profile.demoExpiresAt);
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Check if an action is allowed within demo limits
 */
export async function checkDemoLimits(
  profileId: string,
  action: DemoAction
): Promise<DemoCheckResult> {
  // Get current profile
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: {
      subscriptionStatus: true,
      demoStartedAt: true,
      demoExpiresAt: true,
    },
  });

  if (!profile) {
    return { allowed: false, reason: "Profile not found" };
  }

  // If not in demo mode, allow everything (paid users)
  if (profile.subscriptionStatus !== "demo") {
    return { allowed: true };
  }

  // Check if demo is expired
  if (!isDemoActive(profile)) {
    return {
      allowed: false,
      reason: "Votre période d'essai a expiré. Veuillez souscrire à un plan payant.",
    };
  }

  // Get current usage
  const usage = await getDemoUsage(profileId, profile);

  switch (action) {
    case "create_client":
      if (usage.clients >= DEMO_CONFIG.limits.maxClients) {
        return {
          allowed: false,
          reason: `Limite atteinte: ${usage.clients}/${DEMO_CONFIG.limits.maxClients} clients autorisés en mode démo.`,
          currentUsage: usage.clients,
          limit: DEMO_CONFIG.limits.maxClients,
        };
      }
      return { allowed: true };

    case "send_email":
      if (usage.emailReminders >= DEMO_CONFIG.limits.maxEmailReminders) {
        return {
          allowed: false,
          reason: `Limite atteinte: ${usage.emailReminders}/${DEMO_CONFIG.limits.maxEmailReminders} relances email autorisées en mode démo.`,
          currentUsage: usage.emailReminders,
          limit: DEMO_CONFIG.limits.maxEmailReminders,
        };
      }
      return { allowed: true };

    case "send_whatsapp":
      if (usage.whatsappReminders >= DEMO_CONFIG.limits.maxWhatsAppReminders) {
        return {
          allowed: false,
          reason: `Limite atteinte: ${usage.whatsappReminders}/${DEMO_CONFIG.limits.maxWhatsAppReminders} relances WhatsApp autorisées en mode démo.`,
          currentUsage: usage.whatsappReminders,
          limit: DEMO_CONFIG.limits.maxWhatsAppReminders,
        };
      }
      return { allowed: true };

    case "export":
      // Export is always allowed, but will have watermark
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

/**
 * Start demo period for a profile
 */
export async function startDemo(profileId: string): Promise<{
  success: boolean;
  expiresAt?: Date;
  error?: string;
}> {
  try {
    // Check if profile exists
    const profile = await db.profile.findUnique({
      where: { id: profileId },
      select: { subscriptionStatus: true, demoStartedAt: true },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Check if already in demo or paid
    if (profile.subscriptionStatus === "active") {
      return { success: false, error: "Vous avez déjà un abonnement actif" };
    }

    if (profile.subscriptionStatus === "demo" && profile.demoStartedAt) {
      return { success: false, error: "Vous avez déjà commencé votre période d'essai" };
    }

    // Calculate demo period
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + DEMO_CONFIG.duration);

    // Update profile
    await db.profile.update({
      where: { id: profileId },
      data: {
        subscriptionStatus: "demo",
        demoStartedAt: now,
        demoExpiresAt: expiresAt,
      },
    });

    return { success: true, expiresAt };
  } catch (error) {
    console.error("Error starting demo:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

/**
 * Get current usage stats for demo mode
 */
export async function getDemoUsage(
  profileId: string,
  profile?: { subscriptionStatus: string; demoExpiresAt: Date | null } | null
): Promise<DemoUsage> {
  // Get profile if not provided
  if (!profile) {
    profile = await db.profile.findUnique({
      where: { id: profileId },
      select: {
        subscriptionStatus: true,
        demoExpiresAt: true,
      },
    });
  }

  // Get client count
  const clients = await db.client.count({
    where: { profileId },
  });

  // Get reminder counts by type (only for demo period)
  const demoStart = profile?.subscriptionStatus === "demo" 
    ? await db.profile.findUnique({
        where: { id: profileId },
        select: { demoStartedAt: true },
      }).then(p => p?.demoStartedAt)
    : null;

  const emailReminders = await db.reminder.count({
    where: {
      profileId,
      type: "email",
      ...(demoStart && { createdAt: { gte: demoStart } }),
    },
  });

  const whatsappReminders = await db.reminder.count({
    where: {
      profileId,
      type: "whatsapp",
      ...(demoStart && { createdAt: { gte: demoStart } }),
    },
  });

  // Calculate remaining days
  let daysRemaining = 0;
  let isExpired = false;

  if (profile?.subscriptionStatus === "demo" && profile.demoExpiresAt) {
    const now = new Date();
    const expiresAt = new Date(profile.demoExpiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(0, daysRemaining);
    isExpired = daysRemaining <= 0;
  }

  return {
    clients,
    emailReminders,
    whatsappReminders,
    daysRemaining,
    isExpired,
  };
}

/**
 * Check if user is in demo mode (active or expired)
 */
export function isInDemoMode(profile: ProfileWithDemo): boolean {
  return profile.subscriptionStatus === "demo";
}

/**
 * Get demo limits configuration
 */
export function getDemoLimits(): DemoLimits {
  return { ...DEMO_CONFIG.limits };
}

/**
 * Check if a feature is available in demo mode
 */
export function isFeatureAvailableInDemo(feature: keyof typeof DEMO_CONFIG.features): boolean {
  return DEMO_CONFIG.features[feature];
}

/**
 * Add watermark to PDF export for demo users
 */
export function addDemoWatermark(pdfDoc: typeof import("jspdf"), text: string = "MODE DÉMO - RELANCEPRO AFRICA"): void {
  const pageCount = pdfDoc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    pdfDoc.setPage(i);
    
    // Save current state
    pdfDoc.saveGraphicsState();
    
    // Set watermark style
    pdfDoc.setTextColor(200, 200, 200);
    pdfDoc.setFontSize(40);
    pdfDoc.setFont("helvetica", "bold");
    
    // Add diagonal watermark
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    
    // Center position
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    
    // Draw rotated text
    pdfDoc.text(text, centerX, centerY, {
      angle: 45,
      align: "center",
    });
    
    // Restore state
    pdfDoc.restoreGraphicsState();
  }
}

/**
 * Add watermark text to Excel sheet for demo users
 */
export function addDemoWatermarkToSheet(
  worksheet: ReturnType<typeof import("xlsx").utils.aoa_to_sheet>,
  message: string = "MODE DÉMO - Document généré avec RelancePro Africa"
): void {
  // Add watermark notice at the end of the sheet
  const currentData = worksheet["!ref"] ? 
    Object.keys(worksheet).filter(k => k.startsWith("!") === false) : [];
  
  const lastRow = currentData.length > 0 ? 
    Math.max(...currentData.map(k => parseInt(k.match(/\d+$/)?.[0] || "0"))) + 2 : 2;
  
  // Add watermark rows
  worksheet[`A${lastRow}`] = { t: "s", v: "" };
  worksheet[`A${lastRow + 1}`] = { 
    t: "s", 
    v: `⚠️ ${message}` 
  };
}
