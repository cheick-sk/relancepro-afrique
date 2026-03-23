// =====================================================
// RELANCEPRO AFRICA - Reminder Queue System
// Gestion de la file d'attente des relances avec priorités et retry
// Tous les textes sont en français
// =====================================================

import { db } from "@/lib/db";
import {
  RATE_LIMITS,
  QUEUE_CONFIG,
  QUEUE_STATUS,
  PRIORITY_LEVELS,
  isWithinSendWindow,
  isInQuietHours,
  getNextSendTime,
  DEFAULT_TIMEZONE,
  type QueueStatus as QueueStatusType,
  type PriorityLevel,
} from "./config";
import { generateAIReminder } from "@/lib/services/ai-service";
import { sendReminderEmail } from "@/lib/services/email";
import { sendCustomWhatsAppMessage } from "@/lib/services/whatsapp";

// =====================================================
// TYPES
// =====================================================

interface QueueItem {
  id: string;
  debtId: string;
  clientId: string;
  profileId: string;
  scheduledAt: Date;
  reminderType: "first" | "second" | "third";
  channel: "email" | "whatsapp" | "both";
  status: QueueStatusType;
  attempts: number;
  maxAttempts: number;
  subject?: string;
  message?: string;
  tone?: string;
  error?: string;
  sentAt?: Date;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  total: number;
}

interface AddToQueueOptions {
  debtId: string;
  clientId: string;
  profileId: string;
  scheduledAt: Date;
  reminderType: "first" | "second" | "third";
  channel?: "email" | "whatsapp" | "both";
  priority?: PriorityLevel;
  message?: string;
  subject?: string;
  timezone?: string;
}

interface ProcessQueueResult {
  processed: number;
  sent: number;
  failed: number;
  retried: number;
  cancelled: number;
}

// =====================================================
// RATE LIMITING (In-Memory)
// =====================================================

// Stockage en mémoire pour le rate limiting (réinitialisé au redémarrage)
const rateLimitStore = new Map<string, { count: number; resetAt: Date }>();
const minuteLimitStore = new Map<string, { count: number; resetAt: Date }>();

/**
 * Vérifie et incrémente la limite de taux pour un utilisateur
 */
export async function checkAndIncrementRateLimit(profileId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const now = new Date();

  // Nettoyer les entrées expirées
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }

  // Obtenir ou créer l'entrée de limite
  let entry = rateLimitStore.get(profileId);
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 heure
    };
    rateLimitStore.set(profileId, entry);
  }

  // Vérifier la limite
  const allowed = entry.count < RATE_LIMITS.MAX_REMINDERS_PER_HOUR;
  const remaining = Math.max(0, RATE_LIMITS.MAX_REMINDERS_PER_HOUR - entry.count);

  if (allowed) {
    entry.count++;
  }

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Vérifie la limite par minute (anti-spam)
 */
export function checkMinuteRateLimit(profileId: string): boolean {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  // Nettoyer les entrées expirées
  for (const [key, value] of minuteLimitStore.entries()) {
    if (value.resetAt < now) {
      minuteLimitStore.delete(key);
    }
  }

  let entry = minuteLimitStore.get(profileId);
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: new Date(now.getTime() + 60 * 1000),
    };
    minuteLimitStore.set(profileId, entry);
  }

  if (entry.count >= RATE_LIMITS.MAX_REMINDERS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Obtient le statut actuel de limite de taux
 */
export function getRateLimitStatus(profileId: string): {
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
} {
  const entry = rateLimitStore.get(profileId);
  const now = new Date();

  if (!entry || entry.resetAt < now) {
    return {
      count: 0,
      limit: RATE_LIMITS.MAX_REMINDERS_PER_HOUR,
      remaining: RATE_LIMITS.MAX_REMINDERS_PER_HOUR,
      resetAt: new Date(now.getTime() + 60 * 60 * 1000),
    };
  }

  return {
    count: entry.count,
    limit: RATE_LIMITS.MAX_REMINDERS_PER_HOUR,
    remaining: Math.max(0, RATE_LIMITS.MAX_REMINDERS_PER_HOUR - entry.count),
    resetAt: entry.resetAt,
  };
}

// =====================================================
// QUEUE MANAGEMENT
// =====================================================

/**
 * Convertit le niveau de priorité en nombre
 */
function priorityToNumber(priority: PriorityLevel): number {
  switch (priority) {
    case "urgent":
      return 2;
    case "normal":
      return 1;
    case "low":
      return 0;
    default:
      return 1;
  }
}

/**
 * Ajoute une relance à la file d'attente
 */
export async function addToQueue(options: AddToQueueOptions): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const {
      debtId,
      clientId,
      profileId,
      scheduledAt,
      reminderType,
      channel = "email",
      priority = "normal",
      message,
      subject,
      timezone = DEFAULT_TIMEZONE,
    } = options;

    // Vérifier si déjà dans la file
    const existing = await db.reminderQueue.findFirst({
      where: {
        debtId,
        reminderType,
        status: { in: ["pending", "processing"] },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "Une relance est déjà planifiée pour cette créance",
      };
    }

    // S'assurer que l'heure est dans la fenêtre d'envoi
    let finalScheduledAt = scheduledAt;
    if (!isWithinSendWindow(scheduledAt, timezone) || isInQuietHours(scheduledAt)) {
      finalScheduledAt = getNextSendTime(scheduledAt, timezone);
    }

    // Créer l'élément dans la file
    const queueItem = await db.reminderQueue.create({
      data: {
        debtId,
        clientId,
        profileId,
        scheduledAt: finalScheduledAt,
        reminderType,
        channel,
        status: QUEUE_STATUS.PENDING,
        attempts: 0,
        maxAttempts: RATE_LIMITS.MAX_RETRY_ATTEMPTS,
        priority: priorityToNumber(priority),
        message,
        subject,
      },
    });

    // Enregistrer l'action
    await db.reminderLog.create({
      data: {
        profileId,
        action: "scheduled",
        entityType: "ReminderQueue",
        entityId: queueItem.id,
        details: JSON.stringify({
          debtId,
          reminderType,
          scheduledAt: finalScheduledAt.toISOString(),
          channel,
          priority,
        }),
        success: true,
      },
    });

    return { success: true, id: queueItem.id };
  } catch (error) {
    console.error("[Queue] Erreur ajout à la file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Traite la file d'attente des relances
 */
export async function processQueue(): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    retried: 0,
    cancelled: 0,
  };

  try {
    // Vérifier si dans la fenêtre d'envoi
    if (!isWithinSendWindow()) {
      console.log("[Queue] Hors fenêtre d'envoi, traitement ignoré");
      return result;
    }

    const now = new Date();

    // Récupérer les éléments en attente qui sont dus
    const pendingItems = await db.reminderQueue.findMany({
      where: {
        status: QUEUE_STATUS.PENDING,
        scheduledAt: { lte: now },
      },
      orderBy: [
        { priority: "desc" },
        { scheduledAt: "asc" },
      ],
      take: QUEUE_CONFIG.BATCH_SIZE,
      include: {
        debt: {
          include: {
            client: true,
            profile: {
              include: { settings: true },
            },
          },
        },
      },
    });

    result.processed = pendingItems.length;

    for (const item of pendingItems) {
      try {
        // Marquer comme en cours de traitement
        await db.reminderQueue.update({
          where: { id: item.id },
          data: {
            status: QUEUE_STATUS.PROCESSING,
            attempts: { increment: 1 },
          },
        });

        // Vérifier la limite de taux
        const rateLimit = await checkAndIncrementRateLimit(item.profileId);
        if (!rateLimit.allowed) {
          // Replanifier pour plus tard
          await db.reminderQueue.update({
            where: { id: item.id },
            data: {
              status: QUEUE_STATUS.PENDING,
              scheduledAt: rateLimit.resetAt,
            },
          });
          continue;
        }

        // Vérifier la limite par minute
        if (!checkMinuteRateLimit(item.profileId)) {
          // Attendre un peu et réessayer
          await sleep(1000);
        }

        // Traiter la relance
        const sendResult = await processQueueItem(item as any);

        if (sendResult.success) {
          // Marquer comme envoyé
          await db.reminderQueue.update({
            where: { id: item.id },
            data: {
              status: QUEUE_STATUS.SENT,
              sentAt: new Date(),
            },
          });

          result.sent++;

          // Enregistrer le succès
          await logQueueAction(item.profileId, "sent", item.id, true);
        } else {
          // Gérer l'échec
          if (item.attempts >= item.maxAttempts) {
            // Maximum de tentatives atteint
            await db.reminderQueue.update({
              where: { id: item.id },
              data: {
                status: QUEUE_STATUS.FAILED,
                error: sendResult.error,
              },
            });

            result.failed++;

            await logQueueAction(item.profileId, "failed", item.id, false, sendResult.error);
          } else {
            // Réessayer plus tard
            const retryAt = new Date(
              Date.now() + RATE_LIMITS.RETRY_COOLDOWN_MINUTES * 60 * 1000
            );

            await db.reminderQueue.update({
              where: { id: item.id },
              data: {
                status: QUEUE_STATUS.PENDING,
                scheduledAt: retryAt,
                error: sendResult.error,
              },
            });

            result.retried++;
          }
        }
      } catch (error) {
        console.error(`[Queue] Erreur traitement élément ${item.id}:`, error);
        result.failed++;

        // Marquer comme échoué
        await db.reminderQueue.update({
          where: { id: item.id },
          data: {
            status: QUEUE_STATUS.FAILED,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          },
        });
      }

      // Délai entre les éléments
      await sleep(QUEUE_CONFIG.BATCH_DELAY_MS);
    }

    return result;
  } catch (error) {
    console.error("[Queue] Erreur traitement file:", error);
    throw error;
  }
}

/**
 * Traite un élément de la file
 */
async function processQueueItem(item: any): Promise<{ success: boolean; error?: string }> {
  const { debt } = item;
  const { client, profile } = debt;

  try {
    // Générer le message si non fourni
    let message = item.message;
    let subject = item.subject;

    if (!message) {
      const reminderNumber =
        item.reminderType === "first" ? 1 : item.reminderType === "second" ? 2 : 3;

      const aiContent = await generateAIReminder(
        client,
        debt,
        reminderNumber as 1 | 2 | 3,
        undefined,
        (profile.preferredLanguage || 'fr') as 'fr' | 'en'
      );

      message = aiContent.message;
      subject = aiContent.subject;

      // Mettre à jour avec le contenu généré
      await db.reminderQueue.update({
        where: { id: item.id },
        data: {
          message,
          subject,
          tone: aiContent.tone,
        },
      });
    }

    // Envoyer via le canal approprié
    if (item.channel === "email" || item.channel === "both") {
      if (client.email) {
        const result = await sendReminderEmail(
          client,
          debt,
          profile,
          (item.reminderType === "first" ? 1 : item.reminderType === "second" ? 2 : 3) as 1 | 2 | 3,
          { subject: subject || undefined, message }
        );

        if (!result.success) {
          return { success: false, error: result.error };
        }
      }
    }

    if (item.channel === "whatsapp" || item.channel === "both") {
      if (client.phone) {
        const result = await sendCustomWhatsAppMessage(client.phone, message);

        if (!result.success && item.channel === "whatsapp") {
          return { success: false, error: result.error };
        }
      }
    }

    // Créer l'enregistrement de relance
    await db.reminder.create({
      data: {
        debtId: debt.id,
        clientId: client.id,
        profileId: profile.id,
        type: item.channel === "whatsapp" ? "whatsapp" : "email",
        subject: item.channel !== "whatsapp" ? subject : null,
        message: message || "",
        status: "sent",
        tone: item.tone,
        sentAt: new Date(),
      },
    });

    // Mettre à jour la dette
    await db.debt.update({
      where: { id: debt.id },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
      },
    });

    // Mettre à jour le compteur du profil
    await db.profile.update({
      where: { id: profile.id },
      data: {
        remindersUsed: { increment: 1 },
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Obtient les statistiques de la file
 */
export async function getQueueStats(profileId?: string): Promise<QueueStats> {
  const where = profileId ? { profileId } : {};

  const stats = await db.reminderQueue.groupBy({
    by: ["status"],
    _count: true,
    where,
  });

  const result: QueueStats = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    total: 0,
  };

  for (const stat of stats) {
    result[stat.status as keyof QueueStats] = stat._count;
    result.total += stat._count;
  }

  return result;
}

/**
 * Obtient les éléments en attente pour un utilisateur
 */
export async function getPendingQueueItems(profileId: string): Promise<QueueItem[]> {
  const items = await db.reminderQueue.findMany({
    where: {
      profileId,
      status: { in: ["pending", "processing"] },
    },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: 50,
  });

  return items as unknown as QueueItem[];
}

/**
 * Annule un élément de la file
 */
export async function cancelQueueItem(
  id: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const item = await db.reminderQueue.findFirst({
      where: { id, profileId },
    });

    if (!item) {
      return { success: false, error: "Élément non trouvé" };
    }

    if (item.status !== QUEUE_STATUS.PENDING) {
      return { success: false, error: "Seuls les éléments en attente peuvent être annulés" };
    }

    await db.reminderQueue.update({
      where: { id },
      data: { status: QUEUE_STATUS.CANCELLED },
    });

    await logQueueAction(profileId, "cancelled", id, true);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Réessaie les éléments échoués
 */
export async function retryFailedItems(profileId?: string): Promise<{
  success: boolean;
  retried: number;
  error?: string;
}> {
  try {
    const where = {
      status: QUEUE_STATUS.FAILED,
      ...(profileId && { profileId }),
    };

    const failedItems = await db.reminderQueue.findMany({
      where,
      take: 50,
    });

    let retried = 0;

    for (const item of failedItems) {
      const scheduledAt = getNextSendTime();

      await db.reminderQueue.update({
        where: { id: item.id },
        data: {
          status: QUEUE_STATUS.PENDING,
          scheduledAt,
          attempts: 0,
          error: null,
        },
      });

      retried++;
    }

    return { success: true, retried };
  } catch (error) {
    return {
      success: false,
      retried: 0,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

// =====================================================
// SCHEDULE REMINDERS FOR DEBTS
// =====================================================

/**
 * Planifie les relances pour toutes les dettes en retard
 */
export async function scheduleRemindersForOverdueDebts(): Promise<{
  scheduled: number;
  errors: number;
}> {
  const now = new Date();
  let scheduled = 0;
  let errors = 0;

  try {
    // Récupérer toutes les dettes en retard sans relances en attente
    const overdueDebts = await db.debt.findMany({
      where: {
        status: { in: ["pending", "partial"] },
        dueDate: { lt: now },
        OR: [
          { autoRemindEnabled: true },
          { autoRemindEnabled: null },
        ],
      },
      include: {
        client: true,
        profile: {
          include: { settings: true },
        },
      },
    });

    for (const debt of overdueDebts) {
      const settings = debt.profile.settings;
      const day1 = settings?.reminderDay1 || 3;
      const day2 = settings?.reminderDay2 || 7;
      const day3 = settings?.reminderDay3 || 14;

      const daysOverdue = Math.floor(
        (now.getTime() - debt.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Déterminer le type de relance suivant
      let reminderType: "first" | "second" | "third" | null = null;
      let scheduledAt = new Date();

      if (debt.reminderCount === 0 && daysOverdue >= day1) {
        reminderType = "first";
      } else if (debt.reminderCount === 1 && daysOverdue >= day2) {
        reminderType = "second";
      } else if (debt.reminderCount === 2 && daysOverdue >= day3) {
        reminderType = "third";
      }

      if (reminderType) {
        // Déterminer la priorité basée sur le montant et le retard
        let priority: PriorityLevel = "normal";
        if (debt.amount > 1000000 || daysOverdue > 30) {
          priority = "urgent";
        } else if (debt.amount < 100000) {
          priority = "low";
        }

        const result = await addToQueue({
          debtId: debt.id,
          clientId: debt.clientId,
          profileId: debt.profileId,
          scheduledAt,
          reminderType,
          channel: debt.client.email ? "email" : debt.client.phone ? "whatsapp" : "email",
          priority,
        });

        if (result.success) {
          scheduled++;
        } else {
          errors++;
        }
      }
    }

    return { scheduled, errors };
  } catch (error) {
    console.error("[Queue] Erreur planification relances:", error);
    throw error;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logQueueAction(
  profileId: string,
  action: string,
  entityId: string,
  success: boolean,
  error?: string | null
): Promise<void> {
  await db.reminderLog.create({
    data: {
      profileId,
      action,
      entityType: "ReminderQueue",
      entityId,
      success,
      error,
    },
  });
}

// =====================================================
// EXPORTS
// =====================================================

export type { QueueItem, QueueStats, AddToQueueOptions, ProcessQueueResult };
