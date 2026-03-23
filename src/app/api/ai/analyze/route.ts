import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  predictPaymentProbability,
  analyzeClientRisk,
  suggestBestAction,
  predictBestSendTime
} from "@/lib/services/ai-service";
import { formatCurrencyAmount, getDefaultCurrency } from "@/lib/config";

// GET endpoint for various analysis types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisType = searchParams.get("type") || "overview";

    // Get profile
    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
    }

    const language = (profile.preferredLanguage as 'fr' | 'en') || 'fr';

    switch (analysisType) {
      case "payment-patterns":
        return await analyzePaymentPatterns(session.user.id, language);
      
      case "optimal-times":
        return await analyzeOptimalTimes(session.user.id, language);
      
      case "high-risk":
        return await identifyHighRisk(session.user.id, language);
      
      case "client-risk":
        const clientId = searchParams.get("clientId");
        if (!clientId) {
          return NextResponse.json(
            { error: "clientId requis pour l'analyse de risque client" },
            { status: 400 }
          );
        }
        return await analyzeSingleClientRisk(session.user.id, clientId, language);
      
      case "debt-probability":
        const debtId = searchParams.get("debtId");
        if (!debtId) {
          return NextResponse.json(
            { error: "debtId requis pour la prédiction de paiement" },
            { status: 400 }
          );
        }
        return await predictDebtPayment(session.user.id, debtId, language);
      
      case "suggestions":
        return await getActionSuggestions(session.user.id, language);
      
      case "overview":
      default:
        return await getAnalysisOverview(session.user.id, language);
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}

// Analyze payment patterns
async function analyzePaymentPatterns(profileId: string, language: 'fr' | 'en') {
  // Get all debts with their payment history
  const debts = await db.debt.findMany({
    where: { profileId },
    include: {
      client: true,
      reminders: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  const paidDebts = debts.filter(d => d.status === 'paid');
  const pendingDebts = debts.filter(d => d.status === 'pending' || d.status === 'partial');
  
  // Calculate average payment time
  let totalPaymentDays = 0;
  let paidCount = 0;
  
  for (const debt of paidDebts) {
    if (debt.paidDate && debt.dueDate) {
      const issueDate = debt.issueDate || debt.createdAt;
      const paymentDays = Math.ceil(
        (new Date(debt.paidDate).getTime() - new Date(issueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      totalPaymentDays += paymentDays;
      paidCount++;
    }
  }
  
  const avgPaymentDays = paidCount > 0 ? Math.round(totalPaymentDays / paidCount) : 0;

  // Calculate average days overdue before payment
  let totalOverdueDays = 0;
  let overdueCount = 0;
  
  for (const debt of paidDebts) {
    if (debt.paidDate && debt.dueDate) {
      const overdueDays = Math.max(0, Math.ceil(
        (new Date(debt.paidDate).getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      ));
      totalOverdueDays += overdueDays;
      overdueCount++;
    }
  }
  
  const avgOverdueDays = overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0;

  // Calculate reminder effectiveness
  const totalReminders = debts.reduce((sum, d) => sum + d.reminderCount, 0);
  const reminderResponseRate = totalReminders > 0 
    ? Math.round((paidDebts.length / debts.length) * 100)
    : 0;

  // Calculate payment by time of day (based on reminder delivery times)
  const morningPayments = paidDebts.filter(d => {
    if (!d.paidDate) return false;
    const hour = new Date(d.paidDate).getHours();
    return hour >= 8 && hour < 12;
  }).length;

  const afternoonPayments = paidDebts.filter(d => {
    if (!d.paidDate) return false;
    const hour = new Date(d.paidDate).getHours();
    return hour >= 14 && hour < 18;
  }).length;

  // Payment by day of week
  const dayOfWeekPayments: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const debt of paidDebts) {
    if (debt.paidDate) {
      const day = new Date(debt.paidDate).getDay();
      dayOfWeekPayments[day]++;
    }
  }

  const bestPaymentDay = Object.entries(dayOfWeekPayments)
    .sort(([, a], [, b]) => b - a)[0];
  
  const dayNames = language === 'fr'
    ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Monthly payment trends
  const monthlyPayments: Record<string, number> = {};
  for (const debt of paidDebts) {
    if (debt.paidDate) {
      const monthKey = new Date(debt.paidDate).toISOString().slice(0, 7); // YYYY-MM
      monthlyPayments[monthKey] = (monthlyPayments[monthKey] || 0) + debt.paidAmount;
    }
  }

  return NextResponse.json({
    summary: {
      totalDebts: debts.length,
      paidDebts: paidDebts.length,
      pendingDebts: pendingDebts.length,
      averagePaymentDays: avgPaymentDays,
      averageOverdueDays: avgOverdueDays,
      reminderResponseRate,
    },
    timing: {
      morningPayments,
      afternoonPayments,
      bestPaymentTime: morningPayments > afternoonPayments 
        ? language === 'fr' ? "Matin (8h-12h)" : "Morning (8am-12pm)"
        : language === 'fr' ? "Après-midi (14h-18h)" : "Afternoon (2pm-6pm)",
      bestPaymentDay: bestPaymentDay ? dayNames[parseInt(bestPaymentDay[0])] : null,
    },
    trends: {
      monthlyPayments,
      paymentByDayOfWeek: dayOfWeekPayments,
    },
    insights: generatePaymentInsights({
      avgPaymentDays,
      avgOverdueDays,
      reminderResponseRate,
      paidDebts: paidDebts.length,
      totalDebts: debts.length,
    }, language),
  });
}

function generatePaymentInsights(data: {
  avgPaymentDays: number;
  avgOverdueDays: number;
  reminderResponseRate: number;
  paidDebts: number;
  totalDebts: number;
}, language: 'fr' | 'en'): string[] {
  const insights: string[] = [];
  
  if (data.avgPaymentDays > 30) {
    insights.push(language === 'fr'
      ? "Le délai moyen de paiement est élevé. Envisagez des rappels plus fréquents."
      : "Average payment time is high. Consider more frequent reminders."
    );
  }
  
  if (data.avgOverdueDays > 14) {
    insights.push(language === 'fr'
      ? "Les paiements sont souvent en retard. Proposez des facilités de paiement."
      : "Payments are often late. Offer payment plans."
    );
  }
  
  if (data.reminderResponseRate < 50) {
    insights.push(language === 'fr'
      ? "Le taux de réponse aux relances est faible. Optimisez vos messages."
      : "Reminder response rate is low. Optimize your messages."
    );
  } else if (data.reminderResponseRate > 80) {
    insights.push(language === 'fr'
      ? "Excellent taux de recouvrement ! Continuez sur cette lancée."
      : "Excellent recovery rate! Keep it up."
    );
  }
  
  const paymentRate = data.totalDebts > 0 ? (data.paidDebts / data.totalDebts) * 100 : 0;
  if (paymentRate > 70) {
    insights.push(language === 'fr'
      ? "Votre taux de recouvrement est supérieur à la moyenne régionale (65%)."
      : "Your recovery rate is above the regional average (65%)."
    );
  }
  
  return insights;
}

// Analyze optimal reminder times
async function analyzeOptimalTimes(profileId: string, language: 'fr' | 'en') {
  // Get clients with their reminder history
  const clients = await db.client.findMany({
    where: { profileId },
    include: {
      reminders: {
        where: { status: 'delivered' },
        orderBy: { deliveredAt: 'desc' },
        take: 10,
      },
      debts: {
        where: { status: 'paid' },
        include: {
          reminders: true,
        },
      },
    },
  });

  // Analyze optimal times per client
  const clientOptimalTimes = clients.map(client => {
    const deliveredReminders = client.reminders.filter(r => r.deliveredAt);
    
    // Find patterns in successful reminders
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};
    
    for (const reminder of deliveredReminders) {
      if (reminder.deliveredAt) {
        const hour = new Date(reminder.deliveredAt).getHours();
        const day = new Date(reminder.deliveredAt).getDay();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    }
    
    const bestHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0];
    const bestDay = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    const dayNames = language === 'fr'
      ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Calculate next optimal send time
    const nextOptimalTime = predictBestSendTime(client);
    
    return {
      clientId: client.id,
      clientName: client.name,
      bestHour: bestHour ? parseInt(bestHour[0]) : 10,
      bestDay: bestDay ? dayNames[parseInt(bestDay[0])] : null,
      nextOptimalTime,
      reminderCount: deliveredReminders.length,
    };
  });

  // Overall optimal times
  const overallHourCounts: Record<number, number> = {};
  const overallDayCounts: Record<number, number> = {};
  
  for (const client of clients) {
    for (const reminder of client.reminders) {
      if (reminder.deliveredAt) {
        const hour = new Date(reminder.deliveredAt).getHours();
        const day = new Date(reminder.deliveredAt).getDay();
        overallHourCounts[hour] = (overallHourCounts[hour] || 0) + 1;
        overallDayCounts[day] = (overallDayCounts[day] || 0) + 1;
      }
    }
  }
  
  const bestOverallHour = Object.entries(overallHourCounts)
    .sort(([, a], [, b]) => b - a)[0];
  const bestOverallDay = Object.entries(overallDayCounts)
    .sort(([, a], [, b]) => b - a)[0];
  
  const dayNames = language === 'fr'
    ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return NextResponse.json({
    overall: {
      bestHour: bestOverallHour ? parseInt(bestOverallHour[0]) : 10,
      bestDay: bestOverallDay ? dayNames[parseInt(bestOverallDay[0])] : null,
      recommended: language === 'fr'
        ? `Envoyez vos relances entre 9h-11h le matin ou 14h-16h l'après-midi pour un meilleur taux d'ouverture.`
        : `Send your reminders between 9am-11am in the morning or 2pm-4pm in the afternoon for better open rates.`,
    },
    clients: clientOptimalTimes.filter(c => c.reminderCount > 0),
    timeSlots: {
      morning: { start: 9, end: 11, recommended: true },
      midday: { start: 12, end: 13, recommended: false },
      afternoon: { start: 14, end: 16, recommended: true },
      evening: { start: 17, end: 19, recommended: false },
    },
  });
}

// Identify high-risk debts
async function identifyHighRisk(profileId: string, language: 'fr' | 'en') {
  // Get all pending/partial debts
  const debts = await db.debt.findMany({
    where: {
      profileId,
      status: { in: ['pending', 'partial'] },
    },
    include: { client: true },
    orderBy: { dueDate: 'asc' },
  });

  // Analyze each debt for risk
  const riskAnalysis = await Promise.all(
    debts.map(async (debt) => {
      const daysOverdue = Math.ceil(
        (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate risk score
      let riskScore = 0;
      const riskFactors: string[] = [];
      
      if (daysOverdue > 60) {
        riskScore += 40;
        riskFactors.push(language === 'fr' 
          ? `Retard critique: ${daysOverdue} jours`
          : `Critical delay: ${daysOverdue} days`
        );
      } else if (daysOverdue > 30) {
        riskScore += 30;
        riskFactors.push(language === 'fr'
          ? `Retard important: ${daysOverdue} jours`
          : `Significant delay: ${daysOverdue} days`
        );
      } else if (daysOverdue > 14) {
        riskScore += 20;
        riskFactors.push(language === 'fr'
          ? `Retard modéré: ${daysOverdue} jours`
          : `Moderate delay: ${daysOverdue} days`
        );
      } else if (daysOverdue > 7) {
        riskScore += 10;
        riskFactors.push(language === 'fr'
          ? `Retard léger: ${daysOverdue} jours`
          : `Slight delay: ${daysOverdue} days`
        );
      }
      
      if (debt.reminderCount >= 3) {
        riskScore += 25;
        riskFactors.push(language === 'fr'
          ? `${debt.reminderCount} relances sans réponse`
          : `${debt.reminderCount} reminders without response`
        );
      } else if (debt.reminderCount >= 2) {
        riskScore += 15;
        riskFactors.push(language === 'fr'
          ? `${debt.reminderCount} relances envoyées`
          : `${debt.reminderCount} reminders sent`
        );
      }
      
      if (!debt.client?.email && !debt.client?.phone) {
        riskScore += 25;
        riskFactors.push(language === 'fr'
          ? "Aucun moyen de contact"
          : "No contact method"
        );
      }
      
      if (debt.amount > 1000000) {
        riskScore += 15;
        riskFactors.push(language === 'fr'
          ? "Montant élevé"
          : "High amount"
        );
      }
      
      const amountDue = debt.amount - debt.paidAmount;
      if (debt.paidAmount > 0) {
        riskScore -= 10; // Reduce risk if partial payment made
      }
      
      riskScore = Math.max(0, Math.min(100, riskScore));
      
      let riskLevel: "low" | "medium" | "high" | "critical";
      if (riskScore >= 70) {
        riskLevel = "critical";
      } else if (riskScore >= 50) {
        riskLevel = "high";
      } else if (riskScore >= 25) {
        riskLevel = "medium";
      } else {
        riskLevel = "low";
      }
      
      return {
        debtId: debt.id,
        reference: debt.reference,
        client: {
          id: debt.client?.id,
          name: debt.client?.name,
          email: debt.client?.email,
          phone: debt.client?.phone,
        },
        amount: debt.amount,
        amountDue,
        currency: debt.currency,
        daysOverdue,
        reminderCount: debt.reminderCount,
        riskScore,
        riskLevel,
        riskFactors,
        lastReminderAt: debt.lastReminderAt,
        nextReminderAt: debt.nextReminderAt,
      };
    })
  );

  // Sort by risk score (highest first)
  riskAnalysis.sort((a, b) => b.riskScore - a.riskScore);

  // Group by risk level
  const groupedRisks = {
    critical: riskAnalysis.filter(d => d.riskLevel === 'critical'),
    high: riskAnalysis.filter(d => d.riskLevel === 'high'),
    medium: riskAnalysis.filter(d => d.riskLevel === 'medium'),
    low: riskAnalysis.filter(d => d.riskLevel === 'low'),
  };

  // Calculate totals
  const totalAtRisk = riskAnalysis.reduce((sum, d) => sum + d.amountDue, 0);
  const criticalAmount = groupedRisks.critical.reduce((sum, d) => sum + d.amountDue, 0);
  const highAmount = groupedRisks.high.reduce((sum, d) => sum + d.amountDue, 0);

  return NextResponse.json({
    summary: {
      totalDebts: debts.length,
      totalAtRisk,
      criticalCount: groupedRisks.critical.length,
      highCount: groupedRisks.high.length,
      criticalAmount,
      highAmount,
    },
    grouped: groupedRisks,
    all: riskAnalysis,
    recommendations: generateRiskRecommendations(groupedRisks, language),
  });
}

function generateRiskRecommendations(
  groupedRisks: {
    critical: Array<{ amountDue: number; client: { name: string } }>;
    high: Array<{ amountDue: number }>;
    medium: Array<{ amountDue: number }>;
    low: Array<{ amountDue: number }>;
  },
  language: 'fr' | 'en'
): string[] {
  const recommendations: string[] = [];
  
  if (groupedRisks.critical.length > 0) {
    recommendations.push(language === 'fr'
      ? `${groupedRisks.critical.length} créances nécessitent une action immédiate. Contactez ces clients par téléphone.`
      : `${groupedRisks.critical.length} debts require immediate action. Contact these clients by phone.`
    );
  }
  
  if (groupedRisks.high.length > 3) {
    recommendations.push(language === 'fr'
      ? "Envisagez d'externaliser le recouvrement des créances à haut risque."
      : "Consider outsourcing collection for high-risk debts."
    );
  }
  
  if (groupedRisks.medium.length > 5) {
    recommendations.push(language === 'fr'
      ? "Envoyez des relances groupées aux créances à risque modéré."
      : "Send batch reminders to moderate-risk debts."
    );
  }
  
  if (groupedRisks.low.length > 0) {
    recommendations.push(language === 'fr'
      ? "Continuez le suivi régulier des créances à faible risque."
      : "Continue regular follow-up for low-risk debts."
    );
  }
  
  return recommendations;
}

// Analyze single client risk
async function analyzeSingleClientRisk(profileId: string, clientId: string, language: 'fr' | 'en') {
  const client = await db.client.findFirst({
    where: { id: clientId, profileId },
    include: {
      debts: true,
    },
  });

  if (!client) {
    return NextResponse.json(
      { error: language === 'fr' ? "Client non trouvé" : "Client not found" },
      { status: 404 }
    );
  }

  const riskAnalysis = await analyzeClientRisk(client, client.debts, language);

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      status: client.status,
    },
    risk: riskAnalysis,
  });
}

// Predict debt payment probability
async function predictDebtPayment(profileId: string, debtId: string, language: 'fr' | 'en') {
  const debt = await db.debt.findFirst({
    where: { id: debtId, profileId },
    include: { client: true },
  });

  if (!debt) {
    return NextResponse.json(
      { error: language === 'fr' ? "Créance non trouvée" : "Debt not found" },
      { status: 404 }
    );
  }

  if (!debt.client) {
    return NextResponse.json(
      { error: language === 'fr' ? "Client non associé" : "Client not associated" },
      { status: 400 }
    );
  }

  const prediction = await predictPaymentProbability(debt, debt.client, language);

  return NextResponse.json({
    debt: {
      id: debt.id,
      reference: debt.reference,
      amount: debt.amount,
      amountDue: debt.amount - debt.paidAmount,
      currency: debt.currency,
      dueDate: debt.dueDate,
      status: debt.status,
      reminderCount: debt.reminderCount,
    },
    client: {
      id: debt.client.id,
      name: debt.client.name,
    },
    prediction,
  });
}

// Get action suggestions
async function getActionSuggestions(profileId: string, language: 'fr' | 'en') {
  const debts = await db.debt.findMany({
    where: { profileId },
    include: { client: true },
  });

  const clients = await db.client.findMany({
    where: { profileId },
  });

  const suggestions = await suggestBestAction(debts, clients, language);

  return NextResponse.json({
    suggestions,
    generatedAt: new Date().toISOString(),
  });
}

// Get analysis overview
async function getAnalysisOverview(profileId: string, language: 'fr' | 'en') {
  // Get basic stats
  const debts = await db.debt.findMany({
    where: { profileId },
    include: { client: true },
  });

  const clients = await db.client.findMany({
    where: { profileId },
  });

  const pendingDebts = debts.filter(d => d.status === 'pending' || d.status === 'partial');
  const overdueDebts = debts.filter(d => 
    new Date(d.dueDate) < new Date() && d.status !== 'paid'
  );
  
  const totalPending = pendingDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  const totalOverdue = overdueDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  // Get high-risk count
  let highRiskCount = 0;
  for (const debt of overdueDebts) {
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOverdue > 30 || debt.reminderCount >= 3) {
      highRiskCount++;
    }
  }

  // Get suggestions
  const suggestions = await suggestBestAction(debts, clients, language);

  return NextResponse.json({
    summary: {
      totalDebts: debts.length,
      pendingDebts: pendingDebts.length,
      overdueDebts: overdueDebts.length,
      highRiskDebts: highRiskCount,
      totalClients: clients.length,
      totalPendingAmount: totalPending,
      totalOverdueAmount: totalOverdue,
    },
    quickActions: suggestions.slice(0, 3),
    alerts: generateAlerts(overdueDebts, highRiskCount, language),
  });
}

function generateAlerts(overdueDebts: Array<{ id: string; amount: number; dueDate: Date }>, highRiskCount: number, language: 'fr' | 'en'): Array<{ type: string; message: string }> {
  const alerts: Array<{ type: string; message: string }> = [];
  
  if (highRiskCount > 0) {
    alerts.push({
      type: 'critical',
      message: language === 'fr'
        ? `${highRiskCount} créance(s) à haut risque nécessitent votre attention`
        : `${highRiskCount} high-risk debt(s) require your attention`,
    });
  }
  
  const veryOverdue = overdueDebts.filter(d => {
    const days = Math.ceil((Date.now() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return days > 60;
  });
  
  if (veryOverdue.length > 0) {
    alerts.push({
      type: 'warning',
      message: language === 'fr'
        ? `${veryOverdue.length} créance(s) ont plus de 60 jours de retard`
        : `${veryOverdue.length} debt(s) are over 60 days overdue`,
    });
  }
  
  return alerts;
}
