import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const profileId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "12"; // months

    // Récupérer toutes les créances avec leurs relations
    const debts = await db.debt.findMany({
      where: { profileId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        reminders: {
          select: {
            id: true,
            status: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Récupérer les relances
    const reminders = await db.reminder.findMany({
      where: { profileId },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        sentAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculer les statistiques
    const now = new Date();

    // Fonction pour obtenir le mois/année d'une date
    const getMonthYear = (date: Date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    // Évolution des créances par mois
    const debtsByMonth: Record<string, { total: number; paid: number; pending: number }> = {};
    for (let i = 0; i < parseInt(period); i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthYear(date);
      debtsByMonth[key] = { total: 0, paid: 0, pending: 0 };
    }

    debts.forEach((debt) => {
      const monthKey = getMonthYear(debt.createdAt);
      if (debtsByMonth[monthKey]) {
        debtsByMonth[monthKey].total += debt.amount;
        if (debt.status === "paid") {
          debtsByMonth[monthKey].paid += debt.amount;
        } else {
          debtsByMonth[monthKey].pending += debt.amount - debt.paidAmount;
        }
      }
    });

    // Taux de recouvrement par mois
    const recoveryRateByMonth: Record<string, { recovered: number; total: number; rate: number }> = {};
    for (let i = 0; i < parseInt(period); i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthYear(date);
      recoveryRateByMonth[key] = { recovered: 0, total: 0, rate: 0 };
    }

    debts.forEach((debt) => {
      if (debt.paidDate) {
        const monthKey = getMonthYear(debt.paidDate);
        if (recoveryRateByMonth[monthKey]) {
          recoveryRateByMonth[monthKey].recovered += debt.paidAmount;
        }
      }
      const monthKey = getMonthYear(debt.dueDate);
      if (recoveryRateByMonth[monthKey]) {
        recoveryRateByMonth[monthKey].total += debt.amount;
      }
    });

    Object.keys(recoveryRateByMonth).forEach((key) => {
      const data = recoveryRateByMonth[key];
      data.rate = data.total > 0 ? Math.round((data.recovered / data.total) * 100) : 0;
    });

    // Répartition par statut
    const statusDistribution = {
      pending: 0,
      paid: 0,
      partial: 0,
      disputed: 0,
      cancelled: 0,
    };

    debts.forEach((debt) => {
      statusDistribution[debt.status as keyof typeof statusDistribution]++;
    });

    // Top 10 clients avec plus de dettes
    const clientDebts: Record<string, { name: string; total: number; paid: number; count: number }> = {};
    debts.forEach((debt) => {
      const clientId = debt.clientId;
      const client = debt.client as { name: string };
      if (!clientDebts[clientId]) {
        clientDebts[clientId] = {
          name: client?.name || "Client inconnu",
          total: 0,
          paid: 0,
          count: 0,
        };
      }
      clientDebts[clientId].total += debt.amount - debt.paidAmount;
      clientDebts[clientId].paid += debt.paidAmount;
      clientDebts[clientId].count++;
    });

    const topDebtors = Object.entries(clientDebts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // KPIs
    const pendingAmount = debts
      .filter((d) => d.status !== "paid" && d.status !== "cancelled")
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Créances critiques (>30 jours)
    const criticalDebts = debts.filter((debt) => {
      if (debt.status === "paid" || debt.status === "cancelled") return false;
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue > 30;
    });

    // Clients à risque (plusieurs créances en retard)
    const clientOverdueDebts: Record<string, { name: string; count: number; amount: number }> = {};
    debts.forEach((debt) => {
      if (debt.status === "paid" || debt.status === "cancelled") return;
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOverdue > 0) {
        const clientId = debt.clientId;
        const client = debt.client as { name: string };
        if (!clientOverdueDebts[clientId]) {
          clientOverdueDebts[clientId] = {
            name: client?.name || "Client inconnu",
            count: 0,
            amount: 0,
          };
        }
        clientOverdueDebts[clientId].count++;
        clientOverdueDebts[clientId].amount += debt.amount - debt.paidAmount;
      }
    });

    const riskClients = Object.entries(clientOverdueDebts)
      .filter(([, data]) => data.count >= 2)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // Relances à envoyer aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const remindersToSend = debts.filter((debt) => {
      if (debt.status === "paid" || debt.status === "cancelled") return false;
      if (!debt.nextReminderAt) return false;
      const nextReminder = new Date(debt.nextReminderAt);
      return nextReminder >= today && nextReminder < tomorrow;
    });

    // Montant récupéré ce mois
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const recoveredThisMonth = debts
      .filter((d) => d.paidDate && new Date(d.paidDate) >= thisMonthStart)
      .reduce((sum, d) => sum + d.paidAmount, 0);

    // Taux de succès des relances
    const sentReminders = reminders.filter((r) => r.status === "sent" || r.status === "delivered" || r.status === "opened");
    const successRate = reminders.length > 0 ? Math.round((sentReminders.length / reminders.length) * 100) : 0;

    // Nombre moyen de jours de retard
    const overdueDebts = debts.filter((debt) => {
      if (debt.status === "paid" || debt.status === "cancelled") return false;
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue > 0;
    });
    const avgDaysOverdue = overdueDebts.length > 0
      ? Math.round(
          overdueDebts.reduce((sum, debt) => {
            const daysOverdue = Math.ceil(
              (now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + daysOverdue;
          }, 0) / overdueDebts.length
        )
      : 0;

    // Formater les données pour les graphiques
    const chartData = {
      debtsEvolution: Object.entries(debtsByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
          total: data.total,
          paid: data.paid,
          pending: data.pending,
        })),
      recoveryRate: Object.entries(recoveryRateByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
          rate: data.rate,
          recovered: data.recovered,
        })),
      statusDistribution: [
        { name: "En attente", value: statusDistribution.pending, color: "#f59e0b" },
        { name: "Payées", value: statusDistribution.paid, color: "#22c55e" },
        { name: "Partielles", value: statusDistribution.partial, color: "#3b82f6" },
        { name: "Contestées", value: statusDistribution.disputed, color: "#f97316" },
        { name: "Annulées", value: statusDistribution.cancelled, color: "#6b7280" },
      ],
      topDebtors: topDebtors.map((d) => ({
        name: d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name,
        fullName: d.name,
        amount: d.total,
        paid: d.paid,
        count: d.count,
      })),
    };

    const kpis = {
      totalPending: pendingAmount,
      recoveredThisMonth,
      successRate,
      avgDaysOverdue,
      totalDebts: debts.length,
      totalClients: Object.keys(clientDebts).length,
      overdueCount: overdueDebts.length,
    };

    const alerts = {
      criticalDebts: criticalDebts.map((d) => ({
        id: d.id,
        clientName: (d.client as { name: string })?.name || "Client inconnu",
        amount: d.amount - d.paidAmount,
        currency: d.currency,
        daysOverdue: Math.ceil(
          (now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
        reference: d.reference,
      })),
      riskClients: riskClients.slice(0, 5),
      remindersToSend: remindersToSend.map((d) => ({
        id: d.id,
        clientName: (d.client as { name: string })?.name || "Client inconnu",
        amount: d.amount - d.paidAmount,
        currency: d.currency,
        reference: d.reference,
      })),
    };

    return NextResponse.json({
      chartData,
      kpis,
      alerts,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des analyses" },
      { status: 500 }
    );
  }
}
