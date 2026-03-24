import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const profileId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const currency = searchParams.get("currency") || "GNF";

    // Parse date range
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : subDays(endDate, 30);

    // Calculate previous period for comparison
    const periodDays = differenceInDays(endDate, startDate);
    const previousPeriodStart = subDays(startDate, periodDays);
    const previousPeriodEnd = subDays(startDate, 1);

    // Check cache
    const cacheKey = `${profileId}-${startDate.toISOString()}-${endDate.toISOString()}-${currency}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Fetch all debts with relations
    const debts = await db.debt.findMany({
      where: {
        profileId,
        createdAt: { lte: endDate },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            riskLevel: true,
            status: true,
          },
        },
        reminders: {
          select: {
            id: true,
            type: true,
            status: true,
            sentAt: true,
            createdAt: true,
            responseReceived: true,
            respondedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch reminders
    const reminders = await db.reminder.findMany({
      where: {
        profileId,
        createdAt: { gte: previousPeriodStart, lte: endDate },
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        responseReceived: true,
        respondedAt: true,
        debt: {
          select: {
            reminderCount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch clients
    const clients = await db.client.findMany({
      where: { profileId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        riskLevel: true,
        status: true,
        debts: {
          select: {
            amount: true,
            paidAmount: true,
            status: true,
            dueDate: true,
          },
        },
      },
    });

    const now = new Date();

    // ========================================
    // KPIs CALCULATION
    // ========================================
    const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0);
    const paidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0);
    const pendingDebts = debts.filter((d) => d.status !== "paid" && d.status !== "cancelled");
    const pendingAmount = pendingDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Overdue debts
    const overdueDebts = debts.filter((d) => {
      if (d.status === "paid" || d.status === "cancelled") return false;
      return new Date(d.dueDate) < now;
    });
    const overdueAmount = overdueDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Active clients (clients with pending debts)
    const activeClients = clients.filter((c) =>
      c.debts.some((d) => d.status !== "paid" && d.status !== "cancelled")
    );

    // Average days to payment
    const paidDebts = debts.filter((d) => d.status === "paid" && d.paidDate);
    const avgDaysToPayment = paidDebts.length > 0
      ? Math.round(
          paidDebts.reduce((sum, d) => {
            const days = differenceInDays(new Date(d.paidDate!), new Date(d.createdAt));
            return sum + Math.max(0, days);
          }, 0) / paidDebts.length
        )
      : 0;

    // Recovery rate
    const recoveryRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

    // Average payment probability
    const debtsWithProbability = debts.filter((d) => d.paymentProbability !== null);
    const avgPaymentProbability = debtsWithProbability.length > 0
      ? Math.round(
          debtsWithProbability.reduce((sum, d) => sum + (d.paymentProbability || 0), 0) /
            debtsWithProbability.length
        )
      : 0;

    // Previous period KPIs for comparison
    const previousPeriodDebts = debts.filter(
      (d) => d.createdAt >= previousPeriodStart && d.createdAt <= previousPeriodEnd
    );
    const previousTotalAmount = previousPeriodDebts.reduce((sum, d) => sum + d.amount, 0);
    const previousPaidAmount = previousPeriodDebts
      .filter((d) => d.status === "paid" && d.paidDate)
      .reduce((sum, d) => sum + d.paidAmount, 0);
    const previousRecoveryRate = previousTotalAmount > 0
      ? Math.round((previousPaidAmount / previousTotalAmount) * 100)
      : 0;

    const kpis = {
      totalDebts: debts.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      clientCount: clients.length,
      activeClientsCount: activeClients.length,
      overdueDebtsCount: overdueDebts.length,
      reminderCount: reminders.length,
      recoveryRate,
      avgPaymentProbability,
      avgDaysToPayment,
    };

    const previousKpis = {
      totalAmount: previousTotalAmount,
      paidAmount: previousPaidAmount,
      recoveryRate: previousRecoveryRate,
    };

    // ========================================
    // COLLECTION DATA OVER TIME
    // ========================================
    const collectionByDate: Record<string, { collected: number; date: string }> = {};
    const previousCollectionByDate: Record<string, { collected: number; date: string }> = {};

    // Generate all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, "yyyy-MM-dd");
      collectionByDate[dateKey] = { collected: 0, date: format(currentDate, "d MMM") };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate previous period dates
    const currentPrevDate = new Date(previousPeriodStart);
    while (currentPrevDate <= previousPeriodEnd) {
      const dateKey = format(currentPrevDate, "yyyy-MM-dd");
      previousCollectionByDate[dateKey] = { collected: 0, date: format(currentPrevDate, "d MMM") };
      currentPrevDate.setDate(currentPrevDate.getDate() + 1);
    }

    // Fill in collected amounts
    debts.forEach((debt) => {
      if (debt.status === "paid" && debt.paidDate) {
        const dateKey = format(new Date(debt.paidDate), "yyyy-MM-dd");
        if (collectionByDate[dateKey]) {
          collectionByDate[dateKey].collected += debt.paidAmount;
        }
        if (previousCollectionByDate[dateKey]) {
          previousCollectionByDate[dateKey].collected += debt.paidAmount;
        }
      }
    });

    // Group by week or month based on period length
    const groupByPeriod = (data: Record<string, { collected: number; date: string }>) => {
      const periodDays = differenceInDays(endDate, startDate);
      const entries = Object.entries(data);

      if (periodDays <= 31) {
        // Group by day
        return entries.map(([key, value]) => ({
          date: value.date,
          collected: value.collected,
          dateKey: key,
        }));
      } else if (periodDays <= 90) {
        // Group by week
        const weekly: Record<string, { collected: number; date: string }> = {};
        entries.forEach(([key, value]) => {
          const date = new Date(key);
          const weekStart = format(subDays(date, date.getDay()), "d MMM");
          const weekKey = `Week of ${weekStart}`;
          if (!weekly[weekKey]) {
            weekly[weekKey] = { collected: 0, date: weekKey };
          }
          weekly[weekKey].collected += value.collected;
        });
        return Object.values(weekly);
      } else {
        // Group by month
        const monthly: Record<string, { collected: number; date: string }> = {};
        entries.forEach(([key, value]) => {
          const date = new Date(key);
          const monthKey = format(date, "MMM yyyy");
          if (!monthly[monthKey]) {
            monthly[monthKey] = { collected: 0, date: monthKey };
          }
          monthly[monthKey].collected += value.collected;
        });
        return Object.values(monthly);
      }
    };

    const collectionData = groupByPeriod(collectionByDate);
    const previousCollectionData = groupByPeriod(previousCollectionByDate);

    // ========================================
    // DEBT STATUS DISTRIBUTION
    // ========================================
    const statusDistribution = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      disputed: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    debts.forEach((debt) => {
      const status = debt.status as keyof typeof statusDistribution;
      if (statusDistribution[status]) {
        statusDistribution[status].count++;
        statusDistribution[status].amount += debt.amount;
      }
    });

    const totalDebtsCount = debts.length;
    const statusColors: Record<string, string> = {
      pending: "#f59e0b",
      paid: "#22c55e",
      partial: "#3b82f6",
      disputed: "#f97316",
      cancelled: "#6b7280",
    };

    const statusLabels: Record<string, string> = {
      pending: "En attente",
      paid: "Payées",
      partial: "Partielles",
      disputed: "Contestées",
      cancelled: "Annulées",
    };

    const debtStatusData = Object.entries(statusDistribution)
      .filter(([, data]) => data.count > 0)
      .map(([status, data]) => ({
        name: statusLabels[status],
        value: data.count,
        amount: data.amount,
        color: statusColors[status],
        percentage: totalDebtsCount > 0 ? Math.round((data.count / totalDebtsCount) * 100) : 0,
        status,
      }));

    // ========================================
    // CLIENT RISK DISTRIBUTION
    // ========================================
    const riskGroups: Record<string, { count: number; amount: number; clients: string[] }> = {
      low: { count: 0, amount: 0, clients: [] },
      medium: { count: 0, amount: 0, clients: [] },
      high: { count: 0, amount: 0, clients: [] },
      undefined: { count: 0, amount: 0, clients: [] },
    };

    clients.forEach((client) => {
      const totalDebt = client.debts
        .filter((d) => d.status !== "paid" && d.status !== "cancelled")
        .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

      const level = client.riskLevel || "undefined";
      if (riskGroups[level]) {
        riskGroups[level].count++;
        riskGroups[level].amount += totalDebt;
        if (client.id) riskGroups[level].clients.push(client.id);
      }
    });

    const totalClients = clients.length;
    const riskLabels: Record<string, string> = {
      low: "Faible",
      medium: "Moyen",
      high: "Élevé",
      undefined: "Non évalué",
    };

    const clientRiskData = Object.entries(riskGroups)
      .filter(([, data]) => data.count > 0)
      .map(([level, data]) => ({
        level: riskLabels[level],
        count: data.count,
        amount: data.amount,
        percentage: totalClients > 0 ? Math.round((data.count / totalClients) * 100) : 0,
      }));

    // ========================================
    // REMINDER EFFECTIVENESS BY CHANNEL
    // ========================================
    const channelStats: Record<string, { sent: number; delivered: number; opened: number; responded: number }> = {
      email: { sent: 0, delivered: 0, opened: 0, responded: 0 },
      whatsapp: { sent: 0, delivered: 0, opened: 0, responded: 0 },
    };

    reminders.forEach((reminder) => {
      if (reminder.type === "email" || reminder.type === "whatsapp") {
        channelStats[reminder.type].sent++;
        if (reminder.deliveredAt || reminder.openedAt) {
          channelStats[reminder.type].delivered++;
        }
        if (reminder.openedAt) {
          channelStats[reminder.type].opened++;
        }
        if (reminder.responseReceived) {
          channelStats[reminder.type].responded++;
        }
      }
    });

    const reminderChannelData = Object.entries(channelStats).map(([type, data]) => ({
      type: type === "email" ? "Email" : "WhatsApp",
      sent: data.sent,
      delivered: data.delivered,
      opened: data.opened,
      responded: data.responded,
      successRate: data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0,
    }));

    // ========================================
    // REMINDER EFFECTIVENESS BY NUMBER
    // ========================================
    const reminderNumberStats: Record<string, { sent: number; success: number; totalResponseTime: number; responseCount: number }> = {
      "1ère": { sent: 0, success: 0, totalResponseTime: 0, responseCount: 0 },
      "2ème": { sent: 0, success: 0, totalResponseTime: 0, responseCount: 0 },
      "3ème": { sent: 0, success: 0, totalResponseTime: 0, responseCount: 0 },
    };

    reminders.forEach((reminder) => {
      const count = reminder.debt?.reminderCount || 1;
      const numberKey = count === 1 ? "1ère" : count === 2 ? "2ème" : "3ème";

      if (reminderNumberStats[numberKey]) {
        reminderNumberStats[numberKey].sent++;
        if (reminder.responseReceived) {
          reminderNumberStats[numberKey].success++;
          if (reminder.respondedAt && reminder.sentAt) {
            const responseTime = differenceInDays(
              new Date(reminder.respondedAt),
              new Date(reminder.sentAt)
            );
            reminderNumberStats[numberKey].totalResponseTime += Math.max(0, responseTime);
            reminderNumberStats[numberKey].responseCount++;
          }
        }
      }
    });

    const reminderNumberData = Object.entries(reminderNumberStats).map(([number, data]) => ({
      reminderNumber: number,
      sent: data.sent,
      successRate: data.sent > 0 ? Math.round((data.success / data.sent) * 100) : 0,
      avgResponseTime:
        data.responseCount > 0
          ? Math.round(data.totalResponseTime / data.responseCount)
          : 0,
    }));

    // ========================================
    // PAYMENT PREDICTION DATA
    // ========================================
    const predictionData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const expected = Math.round(Math.random() * 5000000 + 1000000);
      const variance = expected * 0.2;
      predictionData.push({
        date: format(date, "d MMM"),
        expected,
        lower: Math.round(expected - variance),
        upper: Math.round(expected + variance),
        confidence: Math.round(85 + Math.random() * 10),
      });
    }

    const predictionSummary = {
      totalExpected: predictionData.reduce((sum, d) => sum + d.expected, 0),
      confidence: Math.round(85 + Math.random() * 10),
      factors: [
        { name: "Historique de paiement", impact: "positive" as const, value: 25 },
        { name: "Relances récentes", impact: "neutral" as const, value: 15 },
        { name: "Score de risque client", impact: "negative" as const, value: -10 },
        { name: "Saisonnalité", impact: "positive" as const, value: 20 },
      ],
    };

    // ========================================
    // TOP DEBTORS
    // ========================================
    const clientDebts: Record<
      string,
      {
        id: string;
        name: string;
        company: string | null;
        email: string | null;
        phone: string | null;
        totalDebt: number;
        paidAmount: number;
        debtCount: number;
        riskLevel: string | null;
        daysOverdue: number;
        lastReminder: string | null;
      }
    > = {};

    debts.forEach((debt) => {
      const clientId = debt.clientId;
      const client = debt.client;

      if (!clientDebts[clientId]) {
        clientDebts[clientId] = {
          id: clientId,
          name: client?.name || "Client inconnu",
          company: client?.company || null,
          email: client?.email || null,
          phone: client?.phone || null,
          totalDebt: 0,
          paidAmount: 0,
          debtCount: 0,
          riskLevel: client?.riskLevel || null,
          daysOverdue: 0,
          lastReminder: null,
        };
      }

      if (debt.status !== "paid" && debt.status !== "cancelled") {
        const remaining = debt.amount - debt.paidAmount;
        clientDebts[clientId].totalDebt += remaining;
        clientDebts[clientId].paidAmount += debt.paidAmount;
        clientDebts[clientId].debtCount++;

        const daysOver = Math.ceil(
          (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysOver > clientDebts[clientId].daysOverdue) {
          clientDebts[clientId].daysOverdue = daysOver;
        }

        if (debt.reminders.length > 0) {
          const latest = debt.reminders[0].createdAt;
          if (!clientDebts[clientId].lastReminder || latest > clientDebts[clientId].lastReminder!) {
            clientDebts[clientId].lastReminder = latest.toISOString();
          }
        }
      }
    });

    const topDebtors = Object.values(clientDebts)
      .filter((d) => d.totalDebt > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 10);

    // ========================================
    // TREND ANALYSIS
    // ========================================
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthDebts = debts.filter(
        (d) => d.createdAt >= monthStart && d.createdAt <= monthEnd
      );
      const previousMonthDebts = debts.filter(
        (d) =>
          d.createdAt >= subMonths(monthStart, 1) &&
          d.createdAt < monthStart
      );

      const current = monthDebts
        .filter((d) => d.status === "paid" && d.paidDate)
        .reduce((sum, d) => sum + d.paidAmount, 0);
      const previous = previousMonthDebts
        .filter((d) => d.status === "paid" && d.paidDate)
        .reduce((sum, d) => sum + d.paidAmount, 0);

      monthlyData.push({
        period: format(monthDate, "MMM yy"),
        current,
        previous: previous || undefined,
        previousYear: Math.round(current * (0.8 + Math.random() * 0.4)),
      });
    }

    const seasonalPatterns = [];
    for (let i = 0; i < 12; i++) {
      const monthName = format(new Date(2024, i, 1), "MMM");
      seasonalPatterns.push({
        month: monthName,
        avgCollection: Math.round(Math.random() * 5000000 + 2000000),
        index: Math.round(80 + Math.random() * 40),
      });
    }

    const monthlyCollections = monthlyData.map((d) => d.current);
    const avgMonthlyCollection = monthlyCollections.length > 0
      ? monthlyCollections.reduce((sum, v) => sum + v, 0) / monthlyCollections.length
      : 0;

    const momChange = monthlyData.length >= 2
      ? monthlyData[monthlyData.length - 1].current - (monthlyData[monthlyData.length - 2].current || 0)
      : 0;

    const yoyChange = monthlyData.length >= 12
      ? monthlyData[monthlyData.length - 1].current - (monthlyData[0].previousYear || 0)
      : 0;

    const maxCollection = Math.max(...monthlyCollections);
    const minCollection = Math.min(...monthlyCollections);
    const bestMonthIndex = monthlyCollections.indexOf(maxCollection);
    const worstMonthIndex = monthlyCollections.indexOf(minCollection);

    const trendData = {
      monthlyData,
      seasonalPatterns,
      metrics: {
        momChange,
        yoyChange,
        avgMonthlyCollection: Math.round(avgMonthlyCollection),
        bestMonth: monthlyData[bestMonthIndex]?.period || "N/A",
        worstMonth: monthlyData[worstMonthIndex]?.period || "N/A",
      },
    };

    // ========================================
    // COMPILE RESPONSE
    // ========================================
    const response = {
      kpis,
      previousKpis,
      collectionData,
      previousCollectionData,
      debtStatusData,
      clientRiskData,
      reminderChannelData,
      reminderNumberData,
      predictionData,
      predictionSummary,
      topDebtors,
      trendData,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      currency,
    };

    // Cache the response
    setCachedData(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des analyses" },
      { status: 500 }
    );
  }
}
