// API Route pour les insights IA - RelancePro Africa
// GET: Récupérer les insights du tableau de bord IA

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { analyzePaymentPatterns, detectAnomalies, getOptimalReminderTime, getPreferredChannel } from '@/lib/ai/behavioral-analysis';
import { analyzeClientRisk, getRiskMitigationSuggestions } from '@/lib/ai/risk-analysis';
import { formatCurrencyAmount } from '@/lib/config';

// =====================================================
// GET - Récupérer les insights
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard'; // dashboard, trends, anomalies, opportunities
    const period = searchParams.get('period') || 'week'; // day, week, month

    // Get user's data
    const [clients, debts, reminders, insights] = await Promise.all([
      db.client.findMany({
        where: { profileId: session.user.id },
        include: {
          debts: { select: { amount: true, paidAmount: true, status: true, dueDate: true } },
          _count: { select: { debts: true } }
        }
      }),
      db.debt.findMany({
        where: { profileId: session.user.id },
        include: {
          client: { select: { name: true, riskLevel: true } }
        }
      }),
      db.reminder.findMany({
        where: { profileId: session.user.id },
        select: {
          type: true,
          status: true,
          responseReceived: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      db.aIInsight.findMany({
        where: { profileId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    const now = new Date();
    const periodStart = getPeriodStart(period);

    // Calculate metrics
    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
    const pendingDebts = debts.filter(d => d.status === 'pending' || d.status === 'partial');
    const overdueDebts = debts.filter(d => new Date(d.dueDate) < now && d.status !== 'paid');

    // Dashboard insights
    if (type === 'dashboard') {
      // Generate AI insights
      const dashboardInsights = await generateDashboardInsights(
        clients,
        debts,
        reminders,
        overdueDebts,
        totalDebt,
        totalPaid
      );

      // Get recent anomalies
      const recentAnomalies = await detectRecentAnomalies(clients, session.user.id);

      // Get opportunities
      const opportunities = await identifyOpportunities(debts, clients);

      // Calculate trends
      const trends = await calculateTrends(debts, reminders, periodStart);

      // Store new insights in database
      await storeInsights(session.user.id, dashboardInsights.insights);

      return NextResponse.json({
        insights: dashboardInsights.insights,
        anomalies: recentAnomalies,
        opportunities,
        trends,
        stats: {
          totalClients: clients.length,
          totalDebts: debts.length,
          pendingDebts: pendingDebts.length,
          overdueDebts: overdueDebts.length,
          totalAmount: totalDebt,
          paidAmount: totalPaid,
          recoveryRate: totalDebt > 0 ? ((totalPaid / totalDebt) * 100).toFixed(1) : 0
        },
        existingInsights: insights,
        timestamp: new Date().toISOString()
      });
    }

    // Trends only
    if (type === 'trends') {
      const trends = await calculateTrends(debts, reminders, periodStart);
      return NextResponse.json({
        trends,
        period,
        timestamp: new Date().toISOString()
      });
    }

    // Anomalies only
    if (type === 'anomalies') {
      const anomalies = await detectRecentAnomalies(clients, session.user.id);
      return NextResponse.json({
        anomalies,
        timestamp: new Date().toISOString()
      });
    }

    // Opportunities only
    if (type === 'opportunities') {
      const opportunities = await identifyOpportunities(debts, clients);
      return NextResponse.json({
        opportunities,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des insights' },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

async function generateDashboardInsights(
  clients: any[],
  debts: any[],
  reminders: any[],
  overdueDebts: any[],
  totalDebt: number,
  totalPaid: number
) {
  const insights: Array<{
    type: 'prediction' | 'anomaly' | 'opportunity' | 'warning';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    action?: string;
  }> = [];

  const now = new Date();

  // High risk clients warning
  const highRiskClients = clients.filter(c => c.riskLevel === 'high');
  if (highRiskClients.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Clients à risque élevé',
      description: `${highRiskClients.length} client(s) ont un niveau de risque élevé et nécessitent une attention particulière.`,
      severity: 'high',
      action: 'Voir les clients à risque'
    });
  }

  // Critical overdue debts
  const criticalDebts = overdueDebts.filter(d => {
    const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 60;
  });

  if (criticalDebts.length > 0) {
    const totalCritical = criticalDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    insights.push({
      type: 'warning',
      title: 'Créances critiques',
      description: `${criticalDebts.length} créance(s) ont plus de 60 jours de retard, totalisant ${formatCurrencyAmount(totalCritical, 'GNF')}.`,
      severity: 'high',
      action: 'Voir les créances critiques'
    });
  }

  // Recovery rate insight
  const recoveryRate = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
  if (recoveryRate > 70) {
    insights.push({
      type: 'prediction',
      title: 'Excellent taux de recouvrement',
      description: `Votre taux de recouvrement est de ${recoveryRate.toFixed(1)}%, supérieur à la moyenne régionale (60-70%).`,
      severity: 'low'
    });
  } else if (recoveryRate < 40) {
    insights.push({
      type: 'warning',
      title: 'Taux de recouvrement faible',
      description: `Votre taux de recouvrement est de ${recoveryRate.toFixed(1)}%. Envisagez d'intensifier les relances.`,
      severity: 'medium',
      action: 'Voir la stratégie de recouvrement'
    });
  }

  // Reminder response rate
  const respondedReminders = reminders.filter(r => r.responseReceived);
  const responseRate = reminders.length > 0 ? (respondedReminders.length / reminders.length) * 100 : 0;
  if (responseRate < 30 && reminders.length > 5) {
    insights.push({
      type: 'anomaly',
      title: 'Faible taux de réponse aux relances',
      description: `Seulement ${responseRate.toFixed(0)}% de vos relances ont reçu une réponse. Envisagez d\'utiliser WhatsApp.`,
      severity: 'medium',
      action: 'Optimiser les canaux de contact'
    });
  }

  // Payment opportunities
  const partialPayments = debts.filter(d => d.paidAmount > 0 && d.paidAmount < d.amount && d.status !== 'paid');
  if (partialPayments.length > 0) {
    insights.push({
      type: 'opportunity',
      title: 'Paiements partiels en cours',
      description: `${partialPayments.length} client(s) ont effectué un paiement partiel. Proposez-leur un échéancier.`,
      severity: 'low',
      action: 'Proposer des échéanciers'
    });
  }

  // Upcoming due dates
  const upcomingDueDates = debts.filter(d => {
    const dueDate = new Date(d.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 0 && daysUntilDue <= 7 && d.status !== 'paid';
  });

  if (upcomingDueDates.length > 0) {
    insights.push({
      type: 'prediction',
      title: 'Échéances à venir',
      description: `${upcomingDueDates.length} créance(s) arrivent à échéance cette semaine. Envoyez des rappels préventifs.`,
      severity: 'low',
      action: 'Envoyer des rappels'
    });
  }

  return { insights };
}

async function detectRecentAnomalies(clients: any[], profileId: string) {
  const anomalies: Array<{
    clientId: string;
    clientName: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
  }> = [];

  // Check each client for anomalies
  for (const client of clients.slice(0, 10)) { // Limit to avoid too many AI calls
    try {
      const recentActivity = {
        reminders: client.debts?.flatMap((d: any) => d.reminders || []) || [],
        payments: client.debts?.filter((d: any) => d.paidAmount > 0).map((d: any) => ({
          amount: d.paidAmount,
          paidAt: d.paidDate || new Date(),
          method: null
        })) || [],
        communications: []
      };

      const detection = await detectAnomalies(client.id, recentActivity);
      
      if (detection.detected) {
        for (const anomaly of detection.anomalies) {
          anomalies.push({
            clientId: client.id,
            clientName: client.name,
            type: anomaly.type,
            description: anomaly.description,
            severity: detection.severity,
            detectedAt: anomaly.detectedAt
          });
        }
      }
    } catch (error) {
      // Continue with next client
    }
  }

  return anomalies;
}

async function identifyOpportunities(debts: any[], clients: any[]) {
  const opportunities: Array<{
    type: string;
    title: string;
    description: string;
    potentialAmount: number;
    action: string;
    debtIds?: string[];
  }> = [];

  const now = new Date();

  // Negotiation opportunities
  const negotiableDebts = debts.filter(d => {
    const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 30 && daysOverdue < 90 && d.reminderCount >= 2 && d.status !== 'paid';
  });

  if (negotiableDebts.length > 0) {
    const potential = negotiableDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    opportunities.push({
      type: 'negotiation',
      title: 'Créances négociables',
      description: `${negotiableDebts.length} créance(s) peuvent faire l'objet d'une négociation pour accélérer le recouvrement.`,
      potentialAmount: potential * 0.8, // 80% recovery estimate
      action: 'Proposer des échéanciers',
      debtIds: negotiableDebts.map(d => d.id)
    });
  }

  // WhatsApp opportunity
  const emailOnlyClients = clients.filter(c => c.email && !c.phone);
  if (emailOnlyClients.length > 0) {
    opportunities.push({
      type: 'channel',
      title: 'Étendre les canaux de contact',
      description: `${emailOnlyClients.length} client(s) n'ont qu'un email. Obtenir leur numéro WhatsApp améliorerait le taux de réponse.`,
      potentialAmount: 0,
      action: 'Demander les numéros WhatsApp'
    });
  }

  // Early payment discount opportunity
  const recentDebts = debts.filter(d => {
    const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0 && daysOverdue < 14 && d.amount > 500000;
  });

  if (recentDebts.length > 0) {
    const potential = recentDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    opportunities.push({
      type: 'discount',
      title: 'Remise pour paiement rapide',
      description: `${recentDebts.length} créance(s) récentes de montant élevé pourraient bénéficier d'une remise de 5% pour paiement immédiat.`,
      potentialAmount: potential * 0.95,
      action: 'Proposer des remises',
      debtIds: recentDebts.map(d => d.id)
    });
  }

  return opportunities;
}

async function calculateTrends(debts: any[], reminders: any[], periodStart: Date) {
  const now = new Date();
  
  // Payment trend
  const recentPayments = debts.filter(d => 
    d.status === 'paid' && d.paidDate && new Date(d.paidDate) >= periodStart
  );
  
  const previousPeriodStart = new Date(periodStart.getTime() - (now.getTime() - periodStart.getTime()));
  const previousPayments = debts.filter(d => 
    d.status === 'paid' && d.paidDate && 
    new Date(d.paidDate) >= previousPeriodStart && 
    new Date(d.paidDate) < periodStart
  );

  const paymentTrend = previousPayments.length > 0 
    ? ((recentPayments.length - previousPayments.length) / previousPayments.length) * 100
    : recentPayments.length > 0 ? 100 : 0;

  // Response rate trend
  const recentReminders = reminders.filter(r => new Date(r.createdAt) >= periodStart);
  const previousReminders = reminders.filter(r => 
    new Date(r.createdAt) >= previousPeriodStart && 
    new Date(r.createdAt) < periodStart
  );

  const recentResponseRate = recentReminders.length > 0 
    ? (recentReminders.filter(r => r.responseReceived).length / recentReminders.length) * 100
    : 0;

  const previousResponseRate = previousReminders.length > 0 
    ? (previousReminders.filter(r => r.responseReceived).length / previousReminders.length) * 100
    : 0;

  const responseTrend = previousResponseRate > 0 
    ? recentResponseRate - previousResponseRate
    : 0;

  // Overdue trend
  const overdueTrend = debts.filter(d => {
    const dueDate = new Date(d.dueDate);
    return dueDate >= periodStart && dueDate < now && d.status !== 'paid';
  }).length;

  return {
    payments: {
      current: recentPayments.length,
      previous: previousPayments.length,
      trend: paymentTrend,
      direction: paymentTrend > 0 ? 'up' : paymentTrend < 0 ? 'down' : 'stable'
    },
    responseRate: {
      current: recentResponseRate,
      previous: previousResponseRate,
      trend: responseTrend,
      direction: responseTrend > 0 ? 'up' : responseTrend < 0 ? 'down' : 'stable'
    },
    overdue: {
      newOverdue: overdueTrend,
      direction: overdueTrend > 2 ? 'up' : overdueTrend < 1 ? 'down' : 'stable'
    }
  };
}

async function storeInsights(profileId: string, insights: any[]) {
  for (const insight of insights) {
    try {
      await db.aIInsight.create({
        data: {
          profileId,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          severity: insight.severity
        }
      });
    } catch (error) {
      // Continue if storage fails
    }
  }
}
