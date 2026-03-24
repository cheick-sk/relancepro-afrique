import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { cacheOrFetch, CacheKeys, CacheTTL } from "@/lib/cache";

// GET - Get all users (admin only) with cache
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const fetchStats = async () => {
      // Get all profiles with counts
      const profiles = await db.profile.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          createdAt: true,
          _count: {
            select: {
              clients: true,
              debts: true,
              reminders: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get stats
      const stats = {
        totalUsers: await db.profile.count(),
        activeUsers: await db.profile.count({
          where: { subscriptionStatus: "active" },
        }),
        totalDebts: await db.debt.count(),
        totalAmount: await db.debt.aggregate({
          _sum: { amount: true },
        }),
        totalPaid: await db.debt.aggregate({
          _sum: { paidAmount: true },
        }),
        totalReminders: await db.reminder.count(),
      };

      return { profiles, stats };
    };

    // Utiliser le cache pour les stats admin (5 min TTL)
    const data = await cacheOrFetch(
      CacheKeys.adminStats(),
      fetchStats,
      CacheTTL.MEDIUM
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
