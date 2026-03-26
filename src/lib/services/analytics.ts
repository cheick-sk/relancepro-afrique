import { db } from "@/lib/db";

// Types for analytics data
export interface DashboardStats {
  totalDebts: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  clientCount: number;
  reminderCount: number;
  recoveryRate: number;
  avgPaymentProbability: number;
}

export interface CollectionRateData {
  date: string;
  rate: number;
  recovered: number;
  total: number;
}

export interface DebtAgingData {
  bucket: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface RiskDistributionData {
  level: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ReminderEffectivenessData {
  type: string;
  sent: number;
  delivered: number;
  opened: number;
  responded: number;
  successRate: number;
}

export interface MonthlyTrendData {
  month: string;
  totalDebts: number;
  paidDebts: number;
  newDebts: number;
  recovered: number;
  reminders: number;
}

export interface TopDebtorData {
  id: string;
  name: string;
  company: string | null;
  totalDebt: number;
  paidAmount: number;
  debtCount: number;
  riskLevel: string | null;
}

/**
 * Get main dashboard statistics
 */
export async function getDashboardStats(profileId: string): Promise<DashboardStats> {
  const debts = await db.debt.findMany({
    where: { profileId },
    include: {
      client: { select: { id: true } },
    },
  });

  const reminders = await db.reminder.findMany({
    where: { profileId },
    select: { id: true },
  });

  const clients = await db.client.findMany({
    where: { profileId },
    select: { id: true },
  });

  const now = new Date();
  
  const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0);
  const paidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const pendingAmount = debts
    .filter((d) => d.status !== "paid" && d.status !== "cancelled")
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  
  const overdueDebts = debts.filter((d) => {
    if (d.status === "paid" || d.status === "cancelled") return false;
    return new Date(d.dueDate) < now;
  });
  const overdueAmount = overdueDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  // Calculate average payment probability from AI predictions
  const debtsWithProbability = debts.filter((d) => d.paymentProbability !== null);
  const avgPaymentProbability = debtsWithProbability.length > 0
    ? debtsWithProbability.reduce((sum, d) => sum + (d.paymentProbability || 0), 0) / debtsWithProbability.length
    : 0;

  return {
    totalDebts: debts.length,
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    clientCount: clients.length,
    reminderCount: reminders.length,
    recoveryRate: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0,
    avgPaymentProbability: Math.round(avgPaymentProbability),
  };
}

/**
 * Get collection rate over time
 */
export async function getCollectionRate(
  profileId: string,
  periodMonths: number = 12
): Promise<CollectionRateData[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);

  const debts = await db.debt.findMany({
    where: {
      profileId,
      createdAt: { gte: startDate },
    },
    select: {
      amount: true,
      paidAmount: true,
      paidDate: true,
      dueDate: true,
      createdAt: true,
      status: true,
    },
  });

  const result: CollectionRateData[] = [];
  
  for (let i = 0; i < periodMonths; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    
    let totalForMonth = 0;
    let recoveredForMonth = 0;

    debts.forEach((debt) => {
      const debtMonth = `${new Date(debt.createdAt).getFullYear()}-${String(new Date(debt.createdAt).getMonth() + 1).padStart(2, "0")}`;
      if (debtMonth === monthKey) {
        totalForMonth += debt.amount;
        if (debt.status === "paid" && debt.paidDate) {
          const paidMonth = `${new Date(debt.paidDate).getFullYear()}-${String(new Date(debt.paidDate).getMonth() + 1).padStart(2, "0")}`;
          if (paidMonth === monthKey) {
            recoveredForMonth += debt.paidAmount;
          }
        }
      }
    });

    result.push({
      date: monthDate.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      rate: totalForMonth > 0 ? Math.round((recoveredForMonth / totalForMonth) * 100) : 0,
      recovered: recoveredForMonth,
      total: totalForMonth,
    });
  }

  return result.reverse();
}

/**
 * Get debt aging buckets
 */
export async function getDebtAging(profileId: string): Promise<DebtAgingData[]> {
  const now = new Date();
  
  const debts = await db.debt.findMany({
    where: {
      profileId,
      status: { notIn: ["paid", "cancelled"] },
    },
    select: {
      amount: true,
      paidAmount: true,
      dueDate: true,
    },
  });

  const buckets = {
    "0-30 jours": { amount: 0, count: 0 },
    "31-60 jours": { amount: 0, count: 0 },
    "61-90 jours": { amount: 0, count: 0 },
    "90+ jours": { amount: 0, count: 0 },
  };

  let totalAmount = 0;

  debts.forEach((debt) => {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const remainingAmount = debt.amount - debt.paidAmount;
    totalAmount += remainingAmount;

    if (daysOverdue <= 30) {
      buckets["0-30 jours"].amount += remainingAmount;
      buckets["0-30 jours"].count++;
    } else if (daysOverdue <= 60) {
      buckets["31-60 jours"].amount += remainingAmount;
      buckets["31-60 jours"].count++;
    } else if (daysOverdue <= 90) {
      buckets["61-90 jours"].amount += remainingAmount;
      buckets["61-90 jours"].count++;
    } else {
      buckets["90+ jours"].amount += remainingAmount;
      buckets["90+ jours"].count++;
    }
  });

  return Object.entries(buckets).map(([bucket, data]) => ({
    bucket,
    amount: data.amount,
    count: data.count,
    percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
  }));
}

/**
 * Get client risk distribution
 */
export async function getClientRiskDistribution(profileId: string): Promise<RiskDistributionData[]> {
  const clients = await db.client.findMany({
    where: { profileId },
    select: {
      id: true,
      riskLevel: true,
      debts: {
        where: { status: { notIn: ["paid", "cancelled"] } },
        select: { amount: true, paidAmount: true },
      },
    },
  });

  const riskGroups: Record<string, { count: number; amount: number }> = {
    low: { count: 0, amount: 0 },
    medium: { count: 0, amount: 0 },
    high: { count: 0, amount: 0 },
    undefined: { count: 0, amount: 0 },
  };

  clients.forEach((client) => {
    const totalDebt = client.debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    const level = client.riskLevel || "undefined";
    
    riskGroups[level].count++;
    riskGroups[level].amount += totalDebt;
  });

  const totalClients = clients.length;
  
  const labels: Record<string, string> = {
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
    undefined: "Non évalué",
  };

  return Object.entries(riskGroups)
    .filter(([, data]) => data.count > 0)
    .map(([level, data]) => ({
      level: labels[level],
      count: data.count,
      amount: data.amount,
      percentage: totalClients > 0 ? Math.round((data.count / totalClients) * 100) : 0,
    }));
}

/**
 * Get reminder effectiveness by channel
 */
export async function getReminderEffectiveness(profileId: string): Promise<ReminderEffectivenessData[]> {
  const reminders = await db.reminder.findMany({
    where: { profileId },
    select: {
      type: true,
      status: true,
      responseReceived: true,
    },
  });

  const byType: Record<string, { sent: number; delivered: number; opened: number; responded: number }> = {
    email: { sent: 0, delivered: 0, opened: 0, responded: 0 },
    whatsapp: { sent: 0, delivered: 0, opened: 0, responded: 0 },
  };

  reminders.forEach((reminder) => {
    if (reminder.type === "email" || reminder.type === "whatsapp") {
      byType[reminder.type].sent++;
      if (reminder.status === "delivered" || reminder.status === "opened") {
        byType[reminder.type].delivered++;
      }
      if (reminder.status === "opened") {
        byType[reminder.type].opened++;
      }
      if (reminder.responseReceived) {
        byType[reminder.type].responded++;
      }
    }
  });

  return Object.entries(byType).map(([type, data]) => ({
    type: type === "email" ? "Email" : "WhatsApp",
    sent: data.sent,
    delivered: data.delivered,
    opened: data.opened,
    responded: data.responded,
    successRate: data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0,
  }));
}

/**
 * Get monthly trends for charts
 */
export async function getMonthlyTrends(profileId: string, months: number = 12): Promise<MonthlyTrendData[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const debts = await db.debt.findMany({
    where: {
      profileId,
      createdAt: { gte: startDate },
    },
    select: {
      amount: true,
      paidAmount: true,
      paidDate: true,
      status: true,
      createdAt: true,
    },
  });

  const reminders = await db.reminder.findMany({
    where: {
      profileId,
      createdAt: { gte: startDate },
    },
    select: {
      createdAt: true,
    },
  });

  const result: MonthlyTrendData[] = [];

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    let newDebts = 0;
    let totalDebts = 0;
    let paidDebts = 0;
    let recovered = 0;
    let remindersCount = 0;

    debts.forEach((debt) => {
      const debtMonth = `${new Date(debt.createdAt).getFullYear()}-${String(new Date(debt.createdAt).getMonth() + 1).padStart(2, "0")}`;
      
      if (debtMonth === monthKey) {
        newDebts++;
        totalDebts += debt.amount;
      }

      if (debt.status === "paid" && debt.paidDate) {
        const paidMonth = `${new Date(debt.paidDate).getFullYear()}-${String(new Date(debt.paidDate).getMonth() + 1).padStart(2, "0")}`;
        if (paidMonth === monthKey) {
          paidDebts++;
          recovered += debt.paidAmount;
        }
      }
    });

    reminders.forEach((reminder) => {
      const reminderMonth = `${new Date(reminder.createdAt).getFullYear()}-${String(new Date(reminder.createdAt).getMonth() + 1).padStart(2, "0")}`;
      if (reminderMonth === monthKey) {
        remindersCount++;
      }
    });

    result.push({
      month: monthDate.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      totalDebts,
      paidDebts,
      newDebts,
      recovered,
      reminders: remindersCount,
    });
  }

  return result.reverse();
}

/**
 * Get top debtors by debt amount
 */
export async function getTopDebtors(profileId: string, limit: number = 10): Promise<TopDebtorData[]> {
  const clients = await db.client.findMany({
    where: { profileId },
    select: {
      id: true,
      name: true,
      company: true,
      riskLevel: true,
      debts: {
        where: { status: { notIn: ["paid", "cancelled"] } },
        select: {
          amount: true,
          paidAmount: true,
        },
      },
    },
  });

  const debtors = clients
    .map((client) => ({
      id: client.id,
      name: client.name,
      company: client.company,
      totalDebt: client.debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0),
      paidAmount: client.debts.reduce((sum, d) => sum + d.paidAmount, 0),
      debtCount: client.debts.length,
      riskLevel: client.riskLevel,
    }))
    .filter((d) => d.totalDebt > 0)
    .sort((a, b) => b.totalDebt - a.totalDebt)
    .slice(0, limit);

  return debtors;
}

/**
 * Get last 7 days collection trend for mini-chart
 */
export async function getLast7DaysTrend(profileId: string): Promise<{ date: string; amount: number }[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const debts = await db.debt.findMany({
    where: {
      profileId,
      status: "paid",
      paidDate: { gte: startDate },
    },
    select: {
      paidAmount: true,
      paidDate: true,
    },
  });

  const result: { date: string; amount: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    let dailyAmount = 0;
    debts.forEach((debt) => {
      if (debt.paidDate) {
        const paidDateKey = `${new Date(debt.paidDate).getFullYear()}-${String(new Date(debt.paidDate).getMonth() + 1).padStart(2, "0")}-${String(new Date(debt.paidDate).getDate()).padStart(2, "0")}`;
        if (paidDateKey === dateKey) {
          dailyAmount += debt.paidAmount;
        }
      }
    });

    result.push({
      date: date.toLocaleDateString("fr-FR", { weekday: "short" }),
      amount: dailyAmount,
    });
  }

  return result;
}
