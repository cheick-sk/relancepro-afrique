// =====================================================
// RELANCEPRO AFRICA - API Cron for Risk Analysis
// Analyse des risques, prédictions de paiement et résumé quotidien
// Tous les textes sont en français
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/services/email";
import { CLEANUP_CONFIG } from "@/lib/cron/config";

// =====================================================
// TYPES
// =====================================================

interface RiskAnalysisResult {
  debtsAnalyzed: number;
  clientsUpdated: number;
  predictionsGenerated: number;
  highRiskDebts: number;
  errors: string[];
}

interface DailySummary {
  totalDebts: number;
  pendingDebts: number;
  overdueDebts: number;
  totalAmount: number;
  overdueAmount: number;
  remindersSentToday: number;
  paymentsReceivedToday: number;
  newClientsToday: number;
  highRiskClients: number;
}

interface AdminReport {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalDebts: number;
  totalAmount: number;
  remindersSent: number;
  errors: string[];
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
    console.error("[Cron] CRON_SECRET non configuré");
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
// RISK ANALYSIS FUNCTIONS
// =====================================================

/**
 * Analyse le risque pour toutes les dettes
 */
async function analyzeAllDebtsRisk(): Promise<RiskAnalysisResult> {
  const result: RiskAnalysisResult = {
    debtsAnalyzed: 0,
    clientsUpdated: 0,
    predictionsGenerated: 0,
    highRiskDebts: 0,
    errors: [],
  };

  try {
    // Récupérer toutes les dettes en cours
    const debts = await db.debt.findMany({
      where: {
        status: { in: ["pending", "partial"] },
      },
      include: {
        client: {
          include: {
            debts: true,
            reminders: true,
          },
        },
        reminders: true,
      },
    });

    result.debtsAnalyzed = debts.length;

    // Analyser chaque dette
    for (const debt of debts) {
      try {
        const riskAnalysis = calculateDebtRisk(debt);
        
        // Mettre à jour le client si le score a changé
        if (riskAnalysis.clientRiskScore !== debt.client.riskScore) {
          await db.client.update({
            where: { id: debt.clientId },
            data: {
              riskScore: riskAnalysis.clientRiskScore,
              riskLevel: riskAnalysis.clientRiskLevel,
            },
          });
          result.clientsUpdated++;
        }

        // Mettre à jour les prédictions de la dette
        await db.debt.update({
          where: { id: debt.id },
          data: {
            paymentProbability: riskAnalysis.paymentProbability,
            predictedPayDate: riskAnalysis.predictedPayDate,
          },
        });
        result.predictionsGenerated++;

        if (riskAnalysis.clientRiskLevel === "high") {
          result.highRiskDebts++;
        }
      } catch (error) {
        result.errors.push(
          `Erreur analyse dette ${debt.id}: ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    }

    return result;
  } catch (error) {
    console.error("[Analyze] Erreur analyse des risques:", error);
    throw error;
  }
}

/**
 * Calcule le risque d'une dette
 */
function calculateDebtRisk(debt: any): {
  clientRiskScore: number;
  clientRiskLevel: string;
  paymentProbability: number;
  predictedPayDate: Date | null;
} {
  const now = new Date();
  const daysOverdue = Math.floor(
    (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Score de base
  let riskScore = 0;

  // Facteur: jours de retard (max 40 points)
  riskScore += Math.min(daysOverdue * 2, 40);

  // Facteur: nombre de relances sans réponse (max 20 points)
  const reminderCount = debt.reminders?.length || 0;
  riskScore += Math.min(reminderCount * 7, 20);

  // Facteur: montant élevé (max 15 points)
  if (debt.amount > 1000000) riskScore += 15;
  else if (debt.amount > 500000) riskScore += 10;
  else if (debt.amount > 100000) riskScore += 5;

  // Facteur: historique client (max 25 points)
  const clientDebts = debt.client?.debts || [];
  const paidDebts = clientDebts.filter((d: any) => d.status === "paid").length;
  const totalClientDebts = clientDebts.length;
  
  if (totalClientDebts > 0) {
    const paymentRate = paidDebts / totalClientDebts;
    if (paymentRate < 0.5) riskScore += 25;
    else if (paymentRate < 0.7) riskScore += 15;
    else if (paymentRate < 0.9) riskScore += 5;
  }

  // Normaliser le score (0-100)
  const finalScore = Math.min(100, Math.max(0, riskScore));

  // Déterminer le niveau de risque
  let riskLevel = "low";
  if (finalScore >= 70) riskLevel = "high";
  else if (finalScore >= 40) riskLevel = "medium";

  // Calculer la probabilité de paiement (inverse du risque)
  const paymentProbability = Math.max(0, Math.min(100, 100 - finalScore));

  // Prédire la date de paiement
  let predictedPayDate: Date | null = null;
  if (paymentProbability > 30) {
    predictedPayDate = new Date(now);
    // Plus le risque est élevé, plus le délai est long
    const daysToAdd = Math.floor((finalScore / 100) * 60) + 7;
    predictedPayDate.setDate(predictedPayDate.getDate() + daysToAdd);
  }

  return {
    clientRiskScore: finalScore,
    clientRiskLevel: riskLevel,
    paymentProbability,
    predictedPayDate,
  };
}

// =====================================================
// DAILY SUMMARY FUNCTIONS
// =====================================================

/**
 * Génère le résumé quotidien pour un utilisateur
 */
async function generateDailySummary(profileId: string): Promise<DailySummary> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Compter les dettes
  const totalDebts = await db.debt.count({
    where: { profileId },
  });

  const pendingDebts = await db.debt.count({
    where: { profileId, status: { in: ["pending", "partial"] } },
  });

  const overdueDebts = await db.debt.count({
    where: {
      profileId,
      status: { in: ["pending", "partial"] },
      dueDate: { lt: now },
    },
  });

  // Calculer les montants
  const debtStats = await db.debt.aggregate({
    where: { profileId, status: { in: ["pending", "partial"] } },
    _sum: { amount: true },
  });

  const overdueStats = await db.debt.aggregate({
    where: {
      profileId,
      status: { in: ["pending", "partial"] },
      dueDate: { lt: now },
    },
    _sum: { amount: true },
  });

  // Relances envoyées aujourd'hui
  const remindersSentToday = await db.reminder.count({
    where: {
      profileId,
      createdAt: { gte: todayStart },
    },
  });

  // Paiements reçus aujourd'hui (via portail)
  const paymentsReceivedToday = await db.clientPayment.count({
    where: {
      status: "success",
      createdAt: { gte: todayStart },
      client: { profileId },
    },
  });

  // Nouveaux clients aujourd'hui
  const newClientsToday = await db.client.count({
    where: {
      profileId,
      createdAt: { gte: todayStart },
    },
  });

  // Clients à haut risque
  const highRiskClients = await db.client.count({
    where: {
      profileId,
      riskLevel: "high",
    },
  });

  return {
    totalDebts,
    pendingDebts,
    overdueDebts,
    totalAmount: debtStats._sum.amount || 0,
    overdueAmount: overdueStats._sum.amount || 0,
    remindersSentToday,
    paymentsReceivedToday,
    newClientsToday,
    highRiskClients,
  };
}

/**
 * Envoie le résumé quotidien aux administrateurs
 */
async function sendDailySummaryToAdmins(): Promise<AdminReport> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const report: AdminReport = {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalDebts: 0,
    totalAmount: 0,
    remindersSent: 0,
    errors: [],
  };

  try {
    // Statistiques globales
    report.totalUsers = await db.profile.count();
    
    report.activeUsers = await db.profile.count({
      where: {
        subscriptionStatus: { in: ["active", "demo"] },
      },
    });

    report.newUsersToday = await db.profile.count({
      where: { createdAt: { gte: todayStart } },
    });

    report.totalDebts = await db.debt.count();
    
    const debtStats = await db.debt.aggregate({
      where: { status: { in: ["pending", "partial"] } },
      _sum: { amount: true },
    });
    report.totalAmount = debtStats._sum.amount || 0;

    report.remindersSent = await db.reminder.count({
      where: { createdAt: { gte: todayStart } },
    });

    // Envoyer le rapport par email aux admins
    const admins = await db.profile.findMany({
      where: { role: "admin" },
    });

    for (const admin of admins) {
      try {
        await sendEmail({
          to: admin.email,
          subject: "Rapport quotidien - RelancePro Africa",
          html: generateAdminReportEmail(report, admin),
        });
      } catch (error) {
        report.errors.push(
          `Erreur envoi rapport à ${admin.email}: ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    }

    return report;
  } catch (error) {
    console.error("[Analyze] Erreur génération rapport admin:", error);
    throw error;
  }
}

/**
 * Génère l'email de rapport admin
 */
function generateAdminReportEmail(report: AdminReport, admin: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">RelancePro Africa</h1>
        <p style="color: white; margin: 5px 0 0 0;">Rapport Quotidien</p>
      </div>
      <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${admin.name || "Administrateur"},</p>
        <p>Voici le résumé de l'activité d'aujourd'hui sur RelancePro Africa :</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Utilisateurs</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 5px 0;">👥 Total utilisateurs: <strong>${report.totalUsers}</strong></li>
            <li style="padding: 5px 0;">✅ Utilisateurs actifs: <strong>${report.activeUsers}</strong></li>
            <li style="padding: 5px 0;">🆕 Nouveaux aujourd'hui: <strong>${report.newUsersToday}</strong></li>
          </ul>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Créances</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 5px 0;">📊 Total créances: <strong>${report.totalDebts}</strong></li>
            <li style="padding: 5px 0;">💰 Montant total en attente: <strong>${formatAmount(report.totalAmount)}</strong></li>
            <li style="padding: 5px 0;">📧 Relances envoyées: <strong>${report.remindersSent}</strong></li>
          </ul>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          L'équipe RelancePro Africa
        </p>
      </div>
    </div>
  `;
}

// =====================================================
// CLEANUP FUNCTIONS
// =====================================================

/**
 * Nettoie les anciennes notifications
 */
async function cleanupOldNotifications(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - CLEANUP_CONFIG.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const result = await db.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      read: true,
    },
  });

  return result.count;
}

/**
 * Met à jour les statistiques globales
 */
async function updateGlobalStatistics(): Promise<void> {
  // Cette fonction peut être utilisée pour mettre à jour
  // un cache ou des statistiques pré-calculées
  console.log("[Analyze] Mise à jour des statistiques globales...");
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * GET /api/cron/analyze
 * Analyse les risques et génère le résumé quotidien
 * 
 * Paramètres de requête:
 * - action: "risk" | "summary" | "all" (défaut: "all")
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Vérifier l'authentification
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: "Non autorisé", message: "Secret cron invalide ou manquant" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") || "all";

    console.log(`[Cron] Démarrage de l'analyse (${action})...`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case "risk":
        // Analyse des risques uniquement
        result = await analyzeAllDebtsRisk();
        break;

      case "summary":
        // Résumé quotidien pour les admins
        result = await sendDailySummaryToAdmins();
        break;

      case "cleanup":
        // Nettoyage des notifications
        const deletedNotifications = await cleanupOldNotifications();
        result = { deletedNotifications };
        break;

      case "all":
      default:
        // Tout exécuter
        const [riskResult, adminReport, deletedNotifs] = await Promise.all([
          analyzeAllDebtsRisk(),
          sendDailySummaryToAdmins(),
          cleanupOldNotifications(),
        ]);

        await updateGlobalStatistics();

        result = {
          riskAnalysis: riskResult,
          adminReport,
          cleanup: { deletedNotifications: deletedNotifs },
        };
        break;
    }

    const duration = Date.now() - startTime;

    console.log(`[Cron] Analyse terminée en ${duration}ms:`, result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      action,
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Erreur lors de l'analyse:", error);

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/analyze
 * Support pour les webhooks
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Vérifier l'authentification
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: "Non autorisé", message: "Secret cron invalide ou manquant" },
        { status: 401 }
      );
    }

    // Parser les options du body
    let options: Record<string, unknown> = {};
    try {
      options = await request.json();
    } catch {
      // Pas de body, utiliser les valeurs par défaut
    }

    const action = (options.action as string) || "all";

    console.log(`[Cron] POST analyse (${action})...`);

    let result: Record<string, unknown> = {};

    if (action === "risk" || action === "all") {
      result = { ...result, riskAnalysis: await analyzeAllDebtsRisk() };
    }

    if (action === "summary" || action === "all") {
      result = { ...result, adminReport: await sendDailySummaryToAdmins() };
    }

    if (action === "cleanup" || action === "all") {
      const deletedNotifications = await cleanupOldNotifications();
      result = { ...result, cleanup: { deletedNotifications } };
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      action,
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Erreur POST analyse:", error);

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " FCFA";
}

// Export de la fonction generateDailySummary pour utilisation externe
export { generateDailySummary };
