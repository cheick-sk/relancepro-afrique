// Analytics calculation utilities for RelancePro Africa
import { differenceInDays, differenceInMonths, format, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isEqual, startOfDay, endOfDay } from "date-fns";

// Types
export interface Debt {
  id: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: Date | string;
  issueDate?: Date | string | null;
  paidDate?: Date | string | null;
  createdAt: Date | string;
  currency: string;
  paymentProbability?: number | null;
  predictedPayDate?: Date | string | null;
  reminderCount: number;
}

export interface AgingBucket {
  range: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  recovered: number;
  pending: number;
  rate: number;
}

export interface RiskDistribution {
  level: string;
  label: string;
  count: number;
  amount: number;
  color: string;
}

/**
 * Calculate recovery rate from debts
 */
export function calculateRecoveryRate(debts: Debt[]): number {
  if (!debts || debts.length === 0) return 0;
  
  const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0);
  const paidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  
  if (totalAmount === 0) return 0;
  return Math.round((paidAmount / totalAmount) * 100);
}

/**
 * Calculate average payment time in days
 */
export function calculateAveragePaymentTime(debts: Debt[]): number {
  const paidDebts = debts.filter(d => 
    d.status === "paid" && d.paidDate
  );
  
  if (paidDebts.length === 0) return 0;
  
  const totalDays = paidDebts.reduce((sum, debt) => {
    const issueDate = debt.issueDate 
      ? new Date(debt.issueDate) 
      : new Date(debt.createdAt);
    const paidDate = new Date(debt.paidDate!);
    return sum + differenceInDays(paidDate, issueDate);
  }, 0);
  
  return Math.round(totalDays / paidDebts.length);
}

/**
 * Calculate aging buckets for overdue debts
 */
export function calculateAgingBuckets(debts: Debt[]): AgingBucket[] {
  const now = new Date();
  
  const buckets: AgingBucket[] = [
    { range: "0-7", label: "0-7 jours", count: 0, amount: 0, percentage: 0, color: "#22c55e" },
    { range: "8-14", label: "8-14 jours", count: 0, amount: 0, percentage: 0, color: "#84cc16" },
    { range: "15-30", label: "15-30 jours", count: 0, amount: 0, percentage: 0, color: "#f59e0b" },
    { range: "31-60", label: "31-60 jours", count: 0, amount: 0, percentage: 0, color: "#f97316" },
    { range: "60+", label: "Plus de 60 jours", count: 0, amount: 0, percentage: 0, color: "#ef4444" },
  ];
  
  const activeDebts = debts.filter(d => 
    d.status !== "paid" && d.status !== "cancelled"
  );
  
  const totalAmount = activeDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  
  activeDebts.forEach(debt => {
    const dueDate = new Date(debt.dueDate);
    const daysOverdue = differenceInDays(now, dueDate);
    
    if (daysOverdue <= 0) return; // Not overdue yet
    
    const remainingAmount = debt.amount - debt.paidAmount;
    
    if (daysOverdue <= 7) {
      buckets[0].count++;
      buckets[0].amount += remainingAmount;
    } else if (daysOverdue <= 14) {
      buckets[1].count++;
      buckets[1].amount += remainingAmount;
    } else if (daysOverdue <= 30) {
      buckets[2].count++;
      buckets[2].amount += remainingAmount;
    } else if (daysOverdue <= 60) {
      buckets[3].count++;
      buckets[3].amount += remainingAmount;
    } else {
      buckets[4].count++;
      buckets[4].amount += remainingAmount;
    }
  });
  
  // Calculate percentages
  buckets.forEach(bucket => {
    bucket.percentage = totalAmount > 0 
      ? Math.round((bucket.amount / totalAmount) * 100) 
      : 0;
  });
  
  return buckets;
}

/**
 * Calculate monthly trend data
 */
export function calculateMonthlyTrend(debts: Debt[], months: number = 12): MonthlyTrend[] {
  const now = new Date();
  const trends: MonthlyTrend[] = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const monthDebts = debts.filter(d => {
      const createdAt = new Date(d.createdAt);
      return (createdAt >= monthStart && createdAt <= monthEnd);
    });
    
    const total = monthDebts.reduce((sum, d) => sum + d.amount, 0);
    const recovered = monthDebts
      .filter(d => d.paidDate && (() => {
        const paidDate = new Date(d.paidDate!);
        return paidDate >= monthStart && paidDate <= monthEnd;
      })())
      .reduce((sum, d) => sum + d.paidAmount, 0);
    const pending = total - recovered;
    const rate = total > 0 ? Math.round((recovered / total) * 100) : 0;
    
    trends.push({
      month: format(monthDate, "MMM yy"),
      total,
      recovered,
      pending,
      rate,
    });
  }
  
  return trends;
}

/**
 * Calculate client risk distribution
 */
export function calculateRiskDistribution(
  clients: Array<{ riskLevel?: string | null; id: string }>,
  debts: Debt[]
): RiskDistribution[] {
  const distributions: RiskDistribution[] = [
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
  
  debts.forEach(debt => {
    const clientId = (debt as Debt & { clientId?: string }).clientId;
    if (!clientId) return;
    
    const riskLevel = clientRiskMap.get(clientId) || "unknown";
    const remainingAmount = debt.amount - debt.paidAmount;
    
    const dist = distributions.find(d => d.level === riskLevel);
    if (dist) {
      dist.count++;
      dist.amount += remainingAmount;
    }
  });
  
  return distributions.filter(d => d.count > 0);
}

/**
 * Calculate revenue data grouped by period
 */
export function calculateRevenueByPeriod(
  debts: Debt[],
  groupBy: "day" | "week" | "month" = "month",
  startDate: Date,
  endDate: Date
): Array<{ period: string; revenue: number; count: number }> {
  const revenueMap = new Map<string, { revenue: number; count: number }>();
  
  // Filter paid debts within date range
  const paidDebts = debts.filter(d => {
    if (d.status !== "paid" || !d.paidDate) return false;
    const paidDate = new Date(d.paidDate);
    return paidDate >= startDate && paidDate <= endDate;
  });
  
  paidDebts.forEach(debt => {
    const paidDate = new Date(debt.paidDate!);
    let periodKey: string;
    
    switch (groupBy) {
      case "day":
        periodKey = format(paidDate, "dd MMM yyyy");
        break;
      case "week":
        periodKey = `Semaine du ${format(paidDate, "dd MMM")}`;
        break;
      case "month":
      default:
        periodKey = format(paidDate, "MMM yyyy");
        break;
    }
    
    const existing = revenueMap.get(periodKey) || { revenue: 0, count: 0 };
    existing.revenue += debt.paidAmount;
    existing.count++;
    revenueMap.set(periodKey, existing);
  });
  
  return Array.from(revenueMap.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Calculate debt status distribution
 */
export function calculateDebtStatusDistribution(debts: Debt[]): Array<{
  status: string;
  label: string;
  count: number;
  amount: number;
  color: string;
}> {
  const statuses = [
    { status: "pending", label: "En attente", count: 0, amount: 0, color: "#f59e0b" },
    { status: "paid", label: "Payées", count: 0, amount: 0, color: "#22c55e" },
    { status: "partial", label: "Partielles", count: 0, amount: 0, color: "#3b82f6" },
    { status: "disputed", label: "Contestées", count: 0, amount: 0, color: "#f97316" },
    { status: "cancelled", label: "Annulées", count: 0, amount: 0, color: "#6b7280" },
  ];
  
  debts.forEach(debt => {
    const status = statuses.find(s => s.status === debt.status);
    if (status) {
      status.count++;
      status.amount += debt.amount - debt.paidAmount;
    }
  });
  
  return statuses.filter(s => s.count > 0);
}

/**
 * Calculate reminder statistics
 */
export function calculateReminderStats(
  reminders: Array<{
    type: string;
    status: string;
    responseReceived?: boolean;
    sentAt?: Date | string | null;
    createdAt: Date | string;
  }>
): {
  byType: Array<{ type: string; count: number; successRate: number }>;
  byStatus: Array<{ status: string; count: number }>;
  overallSuccessRate: number;
  responseRate: number;
} {
  const typeMap = new Map<string, { sent: number; success: number }>();
  const statusMap = new Map<string, number>();
  let totalSent = 0;
  let totalSuccess = 0;
  let totalResponses = 0;
  
  reminders.forEach(reminder => {
    // By type
    const type = reminder.type || "email";
    const typeData = typeMap.get(type) || { sent: 0, success: 0 };
    typeData.sent++;
    if (reminder.status === "sent" || reminder.status === "delivered") {
      typeData.success++;
    }
    typeMap.set(type, typeData);
    
    // By status
    const statusCount = statusMap.get(reminder.status) || 0;
    statusMap.set(reminder.status, statusCount + 1);
    
    // Totals
    totalSent++;
    if (reminder.status === "sent" || reminder.status === "delivered") {
      totalSuccess++;
    }
    if (reminder.responseReceived) {
      totalResponses++;
    }
  });
  
  const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    count: data.sent,
    successRate: data.sent > 0 ? Math.round((data.success / data.sent) * 100) : 0,
  }));
  
  const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));
  
  return {
    byType,
    byStatus,
    overallSuccessRate: totalSent > 0 ? Math.round((totalSuccess / totalSent) * 100) : 0,
    responseRate: totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0,
  };
}

/**
 * Format currency for display (GNF default)
 */
export function formatCurrency(amount: number, currency: string = "GNF"): string {
  if (currency === "GNF") {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)} Md GNF`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} M GNF`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)} K GNF`;
    }
    return new Intl.NumberFormat("fr-GN", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " GNF";
  }
  
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): {
  value: number;
  direction: "up" | "down" | "neutral";
} {
  if (previous === 0) {
    return { value: 0, direction: "neutral" };
  }
  
  const change = ((current - previous) / previous) * 100;
  
  return {
    value: Math.abs(Math.round(change)),
    direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  };
}

/**
 * Calculate days until due or days overdue
 */
export function calculateDaysStatus(dueDate: Date | string): {
  days: number;
  status: "overdue" | "due-soon" | "normal";
} {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = differenceInDays(due, now);
  
  if (diffDays < 0) {
    return { days: Math.abs(diffDays), status: "overdue" };
  }
  if (diffDays <= 7) {
    return { days: diffDays, status: "due-soon" };
  }
  return { days: diffDays, status: "normal" };
}
