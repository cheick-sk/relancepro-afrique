import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  getCollectionRate,
  getDebtAging,
  getClientRiskDistribution,
  getReminderEffectiveness,
  getMonthlyTrends,
  getTopDebtors,
  getLast7DaysTrend,
} from "@/lib/services/analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const profileId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const chartType = searchParams.get("type") || "all";
    const period = parseInt(searchParams.get("period") || "12", 10);

    // If specific chart type requested
    if (chartType !== "all") {
      switch (chartType) {
        case "collection-rate":
          return NextResponse.json(await getCollectionRate(profileId, period));
        case "debt-aging":
          return NextResponse.json(await getDebtAging(profileId));
        case "risk-distribution":
          return NextResponse.json(await getClientRiskDistribution(profileId));
        case "reminder-effectiveness":
          return NextResponse.json(await getReminderEffectiveness(profileId));
        case "monthly-trends":
          return NextResponse.json(await getMonthlyTrends(profileId, period));
        case "top-debtors":
          return NextResponse.json(await getTopDebtors(profileId));
        case "last-7-days":
          return NextResponse.json(await getLast7DaysTrend(profileId));
        default:
          return NextResponse.json({ error: "Type de graphique inconnu" }, { status: 400 });
      }
    }

    // Return all chart data
    const [
      collectionRate,
      debtAging,
      riskDistribution,
      reminderEffectiveness,
      monthlyTrends,
      topDebtors,
      last7DaysTrend,
    ] = await Promise.all([
      getCollectionRate(profileId, period),
      getDebtAging(profileId),
      getClientRiskDistribution(profileId),
      getReminderEffectiveness(profileId),
      getMonthlyTrends(profileId, period),
      getTopDebtors(profileId),
      getLast7DaysTrend(profileId),
    ]);

    return NextResponse.json({
      collectionRate,
      debtAging,
      riskDistribution,
      reminderEffectiveness,
      monthlyTrends,
      topDebtors,
      last7DaysTrend,
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données des graphiques" },
      { status: 500 }
    );
  }
}
