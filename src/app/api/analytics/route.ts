import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { subDays, subMonths, startOfDay, endOfDay, differenceInDays, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const profileId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    // Date range parameters
    const fromDateStr = searchParams.get("from");
    const toDateStr = searchParams.get("to");
    
    let fromDate: Date;
    let toDate: Date;
    
    if (fromDateStr && toDateStr) {
      fromDate = new Date(fromDateStr);
      toDate = new Date(toDateStr);
    } else {
      // Default: last 30 days
      fromDate = subDays(new Date(), 30);
      toDate = new Date();
    }
    
    // Calculate previous period for trends
    const periodDuration = differenceInDays(toDate, fromDate);
    const previousFromDate = subDays(fromDate, periodDuration);
    const previousToDate = subDays(fromDate, 1);

    // Fetch all debts with their relations
    const debts = await db.debt.findMany({
      where: { profileId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            phone: true,
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch reminders
    const reminders = await db.reminder.findMany({
      where: { profileId },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        sentAt: true,
        responseReceived: true,
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
        company: true,
        riskScore: true,
        riskLevel: true,
      },
    });

    const now = new Date();

    // =====================================================
    // SUMMARY STATS WITH TRENDS
    // =====================================================
    
    // Current period amounts
    const currentDebts = debts.filter(d => 
      new Date(d.createdAt) >= fromDate && new Date(d.createdAt) <= toDate
    );
    
    const previousDebts = debts.filter(d => 
      new Date(d.createdAt) >= previousFromDate && new Date(d.createdAt) <= previousToDate
    );

    const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0);
    const paidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0);
    const pendingAmount = debts
      .filter((d) => d.status !== "paid" && d.status !== "cancelled")
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Previous period amounts
    const previousTotalAmount = previousDebts.reduce((sum, d) => sum + d.amount, 0);
    const previousPaidAmount = previousDebts
      .filter(d => d.paidDate && new Date(d.paidDate) >= previousFromDate && new Date(d.paidDate) <= previousToDate)
      .reduce((sum, d) => sum + d.paidAmount, 0);
    const previousPendingAmount = previousDebts
      .filter((d) => d.status !== "paid" && d.status !== "cancelled")
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Sparkline data (last 7 days)
    const sparklineData: {
      amounts: number[];
      recovered: number[];
      pending: number[];
      reminders: number[];
    } = {
      amounts: [],
      recovered: [],
      pending: [],
      reminders: [],
    };

    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(subDays(now, i));
      const dayEnd = endOfDay(subDays(now, i));
      
      const dayDebts = debts.filter(d => {
        const date = new Date(d.createdAt);
        return date >= dayStart && date <= dayEnd;
      });
      
      sparklineData.amounts.push(dayDebts.reduce((sum, d) => sum + d.amount, 0));
      sparklineData.recovered.push(
        dayDebts.filter(d => d.paidDate && new Date(d.paidDate) >= dayStart && new Date(d.paidDate) <= dayEnd)
          .reduce((sum, d) => sum + d.paidAmount, 0)
      );
      sparklineData.pending.push(
        dayDebts.filter(d => d.status !== "paid").reduce((sum, d) => sum + (d.amount - d.paidAmount), 0)
      );
      sparklineData.reminders.push(
        reminders.filter(r => {
          const date = new Date(r.sentAt || r.createdAt);
          return date >= dayStart && date <= dayEnd;
        }).length
      );
    }

    // =====================================================
    // RECOVERY CHART DATA
    // =====================================================
    
    const getMonthYear = (date: Date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const recoveryByMonth: Record<string, { month: string; recovered: number; total: number; rate: number }> = {};
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = getMonthYear(date);
      recoveryByMonth[key] = {
        month: format(date, "MMM yy", { locale: undefined }),
        recovered: 0,
        total: 0,
        rate: 0,
      };
    }

    debts.forEach((debt) => {
      // Total by creation month
      const createdMonth = getMonthYear(debt.createdAt);
      if (recoveryByMonth[createdMonth]) {
        recoveryByMonth[createdMonth].total += debt.amount;
      }
      
      // Recovered by paid date
      if (debt.paidDate) {
        const paidMonth = getMonthYear(debt.paidDate);
        if (recoveryByMonth[paidMonth]) {
          recoveryByMonth[paidMonth].recovered += debt.paidAmount;
        }
      }
    });

    // Calculate rates
    Object.keys(recoveryByMonth).forEach((key) => {
      const data = recoveryByMonth[key];
      data.rate = data.total > 0 ? Math.round((data.recovered / data.total) * 100) : 0;
    });

    const recoveryChartData = Object.values(recoveryByMonth);

    // =====================================================
    // DEBT STATUS DISTRIBUTION
    // =====================================================
    
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
        statusDistribution[status].amount += debt.amount - debt.paidAmount;
      }
    });

    const debtStatusData = [
      { name: "En attente", value: statusDistribution.pending.count, amount: statusDistribution.pending.amount, color: "#f59e0b" },
      { name: "Payées", value: statusDistribution.paid.count, amount: statusDistribution.paid.amount, color: "#22c55e" },
      { name: "Partielles", value: statusDistribution.partial.count, amount: statusDistribution.partial.amount, color: "#3b82f6" },
      { name: "Contestées", value: statusDistribution.disputed.count, amount: statusDistribution.disputed.amount, color: "#f97316" },
      { name: "Annulées", value: statusDistribution.cancelled.count, amount: statusDistribution.cancelled.amount, color: "#6b7280" },
    ];

    // =====================================================
    // TOP DEBTORS
    // =====================================================
    
    const clientDebts: Record<string, {
      id: string;
      name: string;
      total: number;
      paid: number;
      count: number;
      riskScore?: number;
      riskLevel?: string;
    }> = {};

    debts.forEach((debt) => {
      const clientId = debt.clientId;
      const client = debt.client as { name: string; id: string; riskScore?: number; riskLevel?: string } | null;
      
      if (!clientDebts[clientId]) {
        clientDebts[clientId] = {
          id: clientId,
          name: client?.name || "Client inconnu",
          total: 0,
          paid: 0,
          count: 0,
          riskScore: client?.riskScore,
          riskLevel: client?.riskLevel,
        };
      }
      clientDebts[clientId].total += debt.amount - debt.paidAmount;
      clientDebts[clientId].paid += debt.paidAmount;
      clientDebts[clientId].count++;
    });

    const topDebtors = Object.values(clientDebts)
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(d => ({
        id: d.id,
        name: d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name,
        fullName: d.name,
        amount: d.total,
        paid: d.paid,
        count: d.count,
        riskScore: d.riskScore,
        riskLevel: d.riskLevel as "low" | "medium" | "high" | undefined,
      }));

    // =====================================================
    // REMINDERS CHART DATA
    // =====================================================
    
    const remindersByDay: Record<string, { date: string; email: number; whatsapp: number; total: number; responses: number }> = {};

    // Initialize last 14 days
    for (let i = 13; i >= 0; i--) {
      const day = subDays(now, i);
      const key = format(day, "dd MMM");
      remindersByDay[key] = {
        date: key,
        email: 0,
        whatsapp: 0,
        total: 0,
        responses: 0,
      };
    }

    reminders.forEach((reminder) => {
      const date = new Date(reminder.sentAt || reminder.createdAt);
      const key = format(date, "dd MMM");
      
      if (remindersByDay[key]) {
        remindersByDay[key].total++;
        if (reminder.type === "email") {
          remindersByDay[key].email++;
        } else if (reminder.type === "whatsapp") {
          remindersByDay[key].whatsapp++;
        }
        if (reminder.responseReceived) {
          remindersByDay[key].responses++;
        }
      }
    });

    const remindersChartData = Object.values(remindersByDay).map(d => ({
      ...d,
      responseRate: d.total > 0 ? Math.round((d.responses / d.total) * 100) : 0,
    }));

    // =====================================================
    // PAYMENT PREDICTIONS (AI-simulated)
    // =====================================================
    
    const paymentPredictions = debts
      .filter(d => d.status !== "paid" && d.status !== "cancelled")
      .slice(0, 10)
      .map(debt => {
        // Simulate AI prediction based on various factors
        const client = debt.client as { name: string } | null;
        const daysOverdue = Math.ceil((now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        const reminderCount = debt.reminderCount;
        
        // Simple prediction algorithm (in real app, this would be AI)
        let baseProbability = 70;
        
        // Adjust based on days overdue
        if (daysOverdue > 60) baseProbability -= 30;
        else if (daysOverdue > 30) baseProbability -= 20;
        else if (daysOverdue > 14) baseProbability -= 10;
        
        // Adjust based on reminder count
        if (reminderCount >= 3) baseProbability -= 15;
        else if (reminderCount >= 2) baseProbability -= 5;
        
        // Add some randomness
        const probability = Math.max(5, Math.min(95, baseProbability + Math.floor(Math.random() * 20) - 10));
        
        // Determine risk level
        let riskLevel: "very_low" | "low" | "medium" | "high" | "very_high";
        if (probability >= 80) riskLevel = "very_high";
        else if (probability >= 60) riskLevel = "high";
        else if (probability >= 40) riskLevel = "medium";
        else if (probability >= 20) riskLevel = "low";
        else riskLevel = "very_low";

        // Predict payment date
        const predictedDays = Math.round(30 + (100 - probability) * 0.5);
        const predictedDate = format(subDays(now, -predictedDays), "dd MMM yyyy");

        return {
          id: debt.id,
          reference: debt.reference || `#${debt.id.slice(0, 8)}`,
          clientName: client?.name || "Client inconnu",
          amount: debt.amount - debt.paidAmount,
          probability,
          riskLevel,
          predictedDate,
        };
      })
      .sort((a, b) => b.probability - a.probability);

    // =====================================================
    // KPIs
    // =====================================================
    
    // Recovery rate
    const recoveryRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
    const previousRecoveryRate = previousTotalAmount > 0 
      ? Math.round((previousPaidAmount / previousTotalAmount) * 100) 
      : 0;

    // Average payment delay
    const paidDebts = debts.filter(d => d.status === "paid" && d.paidDate);
    const avgPaymentDelay = paidDebts.length > 0
      ? Math.round(
          paidDebts.reduce((sum, debt) => {
            const issueDate = debt.issueDate ? new Date(debt.issueDate) : new Date(debt.createdAt || Date.now());
            const paidDate = new Date(debt.paidDate!);
            return sum + differenceInDays(paidDate, issueDate);
          }, 0) / paidDebts.length
        )
      : 0;

    // Response rate
    const remindersWithResponse = reminders.filter(r => r.responseReceived);
    const responseRate = reminders.length > 0 
      ? Math.round((remindersWithResponse.length / reminders.length) * 100) 
      : 0;

    // Average debt amount
    const avgDebtAmount = debts.length > 0 
      ? Math.round(totalAmount / debts.length) 
      : 0;

    // Active clients (with pending debts)
    const activeClients = new Set(
      debts.filter(d => d.status !== "paid" && d.status !== "cancelled").map(d => d.clientId)
    ).size;

    // ROI (simplified calculation)
    // Assume subscription saves 2 hours per week at $50/hour
    const hoursSavedPerMonth = 8;
    const hourlyRate = 50; // in GNF equivalent
    const subscriptionCost = 15000; // starter plan in GNF
    const timeValue = hoursSavedPerMonth * hourlyRate * 4; // per month
    const roiPercentage = subscriptionCost > 0 
      ? Math.round(((timeValue - subscriptionCost) / subscriptionCost) * 100) 
      : 0;

    // Overdue count
    const overdueDebts = debts.filter((debt) => {
      if (debt.status === "paid" || debt.status === "cancelled") return false;
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue > 0;
    });

    // =====================================================
    // ALERTS
    // =====================================================
    
    const criticalDebts = overdueDebts.filter(debt => {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue > 30;
    }).slice(0, 5).map(d => ({
      id: d.id,
      clientName: (d.client as { name: string })?.name || "Client inconnu",
      amount: d.amount - d.paidAmount,
      currency: d.currency,
      daysOverdue: Math.ceil(
        (now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
      reference: d.reference,
    }));

    // =====================================================
    // AGING BUCKETS
    // =====================================================
    
    const agingBuckets = [
      { range: "0-7", label: "0-7 jours", count: 0, amount: 0, percentage: 0, color: "#22c55e" },
      { range: "8-14", label: "8-14 jours", count: 0, amount: 0, percentage: 0, color: "#84cc16" },
      { range: "15-30", label: "15-30 jours", count: 0, amount: 0, percentage: 0, color: "#f59e0b" },
      { range: "31-60", label: "31-60 jours", count: 0, amount: 0, percentage: 0, color: "#f97316" },
      { range: "60+", label: "Plus de 60 jours", count: 0, amount: 0, percentage: 0, color: "#ef4444" },
    ];
    
    const activeDebts = debts.filter(d => d.status !== "paid" && d.status !== "cancelled");
    const totalActiveAmount = activeDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    
    activeDebts.forEach(debt => {
      const daysOverdue = Math.ceil((now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const remainingAmount = debt.amount - debt.paidAmount;
      
      if (daysOverdue > 0) {
        if (daysOverdue <= 7) {
          agingBuckets[0].count++;
          agingBuckets[0].amount += remainingAmount;
        } else if (daysOverdue <= 14) {
          agingBuckets[1].count++;
          agingBuckets[1].amount += remainingAmount;
        } else if (daysOverdue <= 30) {
          agingBuckets[2].count++;
          agingBuckets[2].amount += remainingAmount;
        } else if (daysOverdue <= 60) {
          agingBuckets[3].count++;
          agingBuckets[3].amount += remainingAmount;
        } else {
          agingBuckets[4].count++;
          agingBuckets[4].amount += remainingAmount;
        }
      }
    });
    
    // Calculate percentages
    agingBuckets.forEach(bucket => {
      bucket.percentage = totalActiveAmount > 0 
        ? Math.round((bucket.amount / totalActiveAmount) * 100) 
        : 0;
    });

    // =====================================================
    // RISK DISTRIBUTION
    // =====================================================
    
    const riskDistribution = [
      { level: "high", label: "Risque élevé", count: 0, amount: 0, color: "#ef4444" },
      { level: "medium", label: "Risque moyen", count: 0, amount: 0, color: "#f59e0b" },
      { level: "low", label: "Risque faible", count: 0, amount: 0, color: "#22c55e" },
      { level: "unknown", label: "Non évalué", count: 0, amount: 0, color: "#6b7280" },
    ];
    
    // Map client risk levels
    const clientRiskMap = new Map<string, string>();
    clients.forEach(client => {
      clientRiskMap.set(client.id, client.riskLevel || "unknown");
    });
    
    activeDebts.forEach(debt => {
      const riskLevel = clientRiskMap.get(debt.clientId) || "unknown";
      const remainingAmount = debt.amount - debt.paidAmount;
      
      const dist = riskDistribution.find(d => d.level === riskLevel);
      if (dist) {
        dist.count++;
        dist.amount += remainingAmount;
      }
    });

    // =====================================================
    // REVENUE BY PERIOD
    // =====================================================
    
    const revenueByPeriod = recoveryChartData.map(item => ({
      period: item.month,
      revenue: item.recovered,
      count: undefined,
    }));

    // =====================================================
    // BUILD RESPONSE
    // =====================================================

    const response = {
      // Summary stats
      summary: {
        totalAmount,
        paidAmount,
        pendingAmount,
        reminderCount: reminders.length,
        previousTotalAmount,
        previousPaidAmount,
        previousPendingAmount,
        previousReminderCount: reminders.filter(r => 
          new Date(r.createdAt) >= previousFromDate && new Date(r.createdAt) <= previousToDate
        ).length,
        sparklineData,
      },
      
      // Chart data
      charts: {
        recovery: recoveryChartData,
        debtStatus: debtStatusData,
        reminders: remindersChartData,
        topDebtors,
        paymentPredictions,
      },
      
      // KPIs
      kpis: {
        recoveryRate,
        previousRecoveryRate,
        avgPaymentDelay,
        responseRate,
        avgDebtAmount,
        activeClients,
        roiPercentage,
        totalDebts: debts.length,
        totalClients: clients.length,
        overdueCount: overdueDebts.length,
      },
      
      // Alerts
      alerts: {
        criticalDebts,
        overdueCount: overdueDebts.length,
        overdueAmount: overdueDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0),
      },
      
      // New data for advanced analytics
      aging: agingBuckets,
      riskDistribution: riskDistribution.filter(d => d.count > 0),
      revenueByPeriod,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des analyses" },
      { status: 500 }
    );
  }
}
