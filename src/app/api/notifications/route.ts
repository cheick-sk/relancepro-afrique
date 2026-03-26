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

    // Get recent payments
    const recentPayments = await db.payment.count({
      where: { status: "success", paidAt: null },
    });

    const recentReminders = await db.reminder.count({
      where: {
        profileId: session.user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const overdueDebts = await db.debt.count({
      where: {
        profileId: session.user.id,
        status: { in: ["pending", "partial"] },
        dueDate: { lt: new Date() },
      },
    });

    return NextResponse.json({
      unread: {
        payments: recentPayments,
        reminders: recentReminders,
        overdue: overdueDebts,
      },
      total: recentPayments + recentReminders + overdueDebts,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
