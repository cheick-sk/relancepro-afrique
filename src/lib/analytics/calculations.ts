/**
 * Analytics Calculations Utility
 * Provides functions for calculating various analytics metrics
 */

// Types
interface DebtData {
  id: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: Date | string;
  paidDate?: Date | string | null;
  createdAt: Date | string;
  paymentProbability?: number | null;
  predictedPayDate?: Date | string | null;
}

interface ReminderData {
  id: string;
  type: string;
  status: string;
  responseReceived: boolean;
  sentAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  createdAt: Date | string;
}

interface ClientData {
  id: string;
  riskLevel?: string | null;
  riskScore?: number | null;
  debts: Array<{
    amount: number;
    paidAmount: number;
    status: string;
  }>;
}

interface PaymentPrediction {
  month: string;
  predicted: number;
  confidence: number;
}

/**
 * Calculate recovery rate - percentage of recovered amount
 */
export function calculateRecoveryRate(debts: DebtData[]): number {
  if (!debts || debts.length === 0) return 0;
  
  const totalAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);
  if (totalAmount === 0) return 0;
  
  const paidAmount = debts.reduce((sum, debt) => sum + debt.paidAmount, 0);
  
  return Math.round((paidAmount / totalAmount) * 100);
}

/**
 * Calculate average payment time in days
 */
export function calculateAveragePaymentTime(debts: DebtData[]): number {
  const paidDebts = debts.filter(
    (debt) => debt.status === "paid" && debt.paidDate && debt.dueDate
  );
  
  if (paidDebts.length === 0) return 0;
  
  const totalDays = paidDebts.reduce((sum, debt) => {
    const paidDate = new Date(debt.paidDate!);
    const dueDate = new Date(debt.dueDate);
    const diffDays = Math.floor(
      (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + diffDays;
  }, 0);
  
  return Math.round(totalDays / paidDebts.length);
}

/**
 * Calculate reminder success rate - percentage of successful reminders
 * A reminder is considered successful if it was delivered AND got a response
 */
export function calculateReminderSuccessRate(reminders: ReminderData[]): number {
  if (!reminders || reminders.length === 0) return 0;
  
  const successfulReminders = reminders.filter(
    (reminder) =>
      (reminder.status === "delivered" || reminder.status === "opened") &&
      reminder.responseReceived
  );
  
  return Math.round((successfulReminders.length / reminders.length) * 100);
}

/**
 * Calculate delivery rate for reminders
 */
export function calculateDeliveryRate(reminders: ReminderData[]): number {
  if (!reminders || reminders.length === 0) return 0;
  
  const deliveredReminders = reminders.filter(
    (reminder) =>
      reminder.status === "delivered" ||
      reminder.status === "opened" ||
      reminder.deliveredAt !== null
  );
  
  return Math.round((deliveredReminders.length / reminders.length) * 100);
}

/**
 * Predict monthly revenue based on payment probabilities and due dates
 */
export function predictMonthlyRevenue(debts: DebtData[]): PaymentPrediction[] {
  const now = new Date();
  const predictions: PaymentPrediction[] = [];
  
  // Filter pending debts with payment predictions
  const pendingDebts = debts.filter(
    (debt) =>
      debt.status !== "paid" &&
      debt.status !== "cancelled" &&
      debt.paymentProbability !== null &&
      debt.paymentProbability > 0
  );
  
  // Group by month for next 6 months
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = monthDate.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    
    let predictedAmount = 0;
    let totalProbability = 0;
    let count = 0;
    
    pendingDebts.forEach((debt) => {
      const dueDate = new Date(debt.dueDate);
      const predictedDate = debt.predictedPayDate ? new Date(debt.predictedPayDate) : null;
      
      // Check if debt is predicted/expected to be paid in this month
      const expectedPayMonth = predictedDate || dueDate;
      const expectedMonth = `${expectedPayMonth.getFullYear()}-${String(expectedPayMonth.getMonth() + 1).padStart(2, "0")}`;
      const currentMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      
      if (expectedMonth === currentMonth) {
        const remainingAmount = debt.amount - debt.paidAmount;
        const probability = (debt.paymentProbability || 0) / 100;
        predictedAmount += remainingAmount * probability;
        totalProbability += probability;
        count++;
      }
    });
    
    predictions.push({
      month: monthKey,
      predicted: Math.round(predictedAmount),
      confidence: count > 0 ? Math.round((totalProbability / count) * 100) : 0,
    });
  }
  
  return predictions;
}

/**
 * Calculate client risk distribution
 */
export function calculateClientRiskDistribution(clients: ClientData[]): {
  level: string;
  count: number;
  amount: number;
  percentage: number;
}[] {
  if (!clients || clients.length === 0) return [];
  
  const riskGroups: Record<string, { count: number; amount: number }> = {
    low: { count: 0, amount: 0 },
    medium: { count: 0, amount: 0 },
    high: { count: 0, amount: 0 },
    undefined: { count: 0, amount: 0 },
  };
  
  clients.forEach((client) => {
    const totalDebt = client.debts
      .filter((d) => d.status !== "paid" && d.status !== "cancelled")
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    
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
 * Calculate debt status distribution
 */
export function calculateDebtStatusDistribution(debts: DebtData[]): {
  status: string;
  count: number;
  amount: number;
  percentage: number;
}[] {
  if (!debts || debts.length === 0) return [];
  
  const statusGroups: Record<string, { count: number; amount: number }> = {
    pending: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    partial: { count: 0, amount: 0 },
    disputed: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
  };
  
  debts.forEach((debt) => {
    const status = debt.status || "pending";
    if (statusGroups[status]) {
      statusGroups[status].count++;
      statusGroups[status].amount += debt.amount;
    }
  });
  
  const totalDebts = debts.length;
  
  const labels: Record<string, string> = {
    pending: "En attente",
    paid: "Payée",
    partial: "Partiel",
    disputed: "Contestée",
    cancelled: "Annulée",
  };
  
  return Object.entries(statusGroups)
    .filter(([, data]) => data.count > 0)
    .map(([status, data]) => ({
      status: labels[status] || status,
      count: data.count,
      amount: data.amount,
      percentage: totalDebts > 0 ? Math.round((data.count / totalDebts) * 100) : 0,
    }));
}

/**
 * Calculate revenue by month
 */
export function calculateRevenueByMonth(
  debts: DebtData[],
  months: number = 12
): { month: string; revenue: number; predicted?: number }[] {
  const now = new Date();
  const result: { month: string; revenue: number; predicted?: number }[] = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = monthDate.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
    
    let revenue = 0;
    
    debts.forEach((debt) => {
      if (debt.paidDate) {
        const paidDate = new Date(debt.paidDate);
        if (paidDate >= monthStart && paidDate <= monthEnd) {
          revenue += debt.paidAmount;
        }
      }
    });
    
    result.push({
      month: monthKey,
      revenue,
    });
  }
  
  return result;
}

/**
 * Calculate payment trend (daily/weekly)
 */
export function calculatePaymentTrend(
  debts: DebtData[],
  days: number = 30
): { date: string; amount: number; count: number }[] {
  const now = new Date();
  const result: { date: string; amount: number; count: number }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    let dailyAmount = 0;
    let dailyCount = 0;
    
    debts.forEach((debt) => {
      if (debt.paidDate && debt.status === "paid") {
        const paidDate = new Date(debt.paidDate);
        if (paidDate >= dayStart && paidDate <= dayEnd) {
          dailyAmount += debt.paidAmount;
          dailyCount++;
        }
      }
    });
    
    result.push({
      date: dateKey,
      amount: dailyAmount,
      count: dailyCount,
    });
  }
  
  return result;
}

/**
 * Calculate reminder trend over time
 */
export function calculateReminderTrend(
  reminders: ReminderData[],
  months: number = 6
): { month: string; sent: number; successful: number; rate: number }[] {
  const now = new Date();
  const result: { month: string; sent: number; successful: number; rate: number }[] = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = monthDate.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
    
    let sent = 0;
    let successful = 0;
    
    reminders.forEach((reminder) => {
      const createdAt = new Date(reminder.createdAt);
      if (createdAt >= monthStart && createdAt <= monthEnd) {
        sent++;
        if (reminder.responseReceived) {
          successful++;
        }
      }
    });
    
    result.push({
      month: monthKey,
      sent,
      successful,
      rate: sent > 0 ? Math.round((successful / sent) * 100) : 0,
    });
  }
  
  return result;
}

/**
 * Calculate overdue amount
 */
export function calculateOverdueAmount(debts: DebtData[]): number {
  const now = new Date();
  
  return debts
    .filter((debt) => {
      if (debt.status === "paid" || debt.status === "cancelled") return false;
      return new Date(debt.dueDate) < now;
    })
    .reduce((sum, debt) => sum + (debt.amount - debt.paidAmount), 0);
}

/**
 * Calculate total pending amount
 */
export function calculatePendingAmount(debts: DebtData[]): number {
  return debts
    .filter((debt) => debt.status !== "paid" && debt.status !== "cancelled")
    .reduce((sum, debt) => sum + (debt.amount - debt.paidAmount), 0);
}

/**
 * Calculate average debt age in days
 */
export function calculateAverageDebtAge(debts: DebtData[]): number {
  const now = new Date();
  const activeDebts = debts.filter(
    (debt) => debt.status !== "paid" && debt.status !== "cancelled"
  );
  
  if (activeDebts.length === 0) return 0;
  
  const totalAge = activeDebts.reduce((sum, debt) => {
    const createdAt = new Date(debt.createdAt);
    const age = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + age;
  }, 0);
  
  return Math.round(totalAge / activeDebts.length);
}

/**
 * Calculate sparkline data for KPI cards
 */
export function calculateSparklineData(
  data: { date: string; amount: number }[],
  maxPoints: number = 7
): { value: number }[] {
  const points = data.slice(-maxPoints);
  return points.map((p) => ({ value: p.amount }));
}
