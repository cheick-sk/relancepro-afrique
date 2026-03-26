import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  getDashboardStats,
  getCollectionRate,
  getDebtAging,
  getClientRiskDistribution,
  getReminderEffectiveness,
  getMonthlyTrends,
  getTopDebtors,
} from "@/lib/services/analytics";
import jsPDF from "jspdf";
import "jspdf-autotable";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const profileId = session.user.id;
    const body = await request.json();
    const format = body.format || "pdf";
    const period = parseInt(body.period || "12", 10);

    // Gather all analytics data
    const [stats, collectionRate, debtAging, riskDistribution, reminderEffectiveness, monthlyTrends, topDebtors] =
      await Promise.all([
        getDashboardStats(profileId),
        getCollectionRate(profileId, period),
        getDebtAging(profileId),
        getClientRiskDistribution(profileId),
        getReminderEffectiveness(profileId),
        getMonthlyTrends(profileId, period),
        getTopDebtors(profileId),
      ]);

    if (format === "excel" || format === "csv") {
      // Generate CSV format
      const csvRows: string[] = [];
      
      // Header
      csvRows.push("Rapport Analytics RelancePro Africa");
      csvRows.push(`Date: ${new Date().toLocaleDateString("fr-FR")}`);
      csvRows.push("");

      // KPIs
      csvRows.push("=== INDICATEURS CLÉS ===");
      csvRows.push(`Total Créances,${stats.totalDebts}`);
      csvRows.push(`Montant Total,${stats.totalAmount}`);
      csvRows.push(`Montant Récupéré,${stats.paidAmount}`);
      csvRows.push(`Montant en Attente,${stats.pendingAmount}`);
      csvRows.push(`Montant en Retard,${stats.overdueAmount}`);
      csvRows.push(`Taux de Recouvrement,${stats.recoveryRate}%`);
      csvRows.push(`Prédiction IA Moyenne,${stats.avgPaymentProbability}%`);
      csvRows.push("");

      // Aging
      csvRows.push("=== RÉPARTITION PAR ANCIENNETÉ ===");
      csvRows.push("Tranche,Montant,Nombre,Pourcentage");
      debtAging.forEach((item) => {
        csvRows.push(`${item.bucket},${item.amount},${item.count},${item.percentage}%`);
      });
      csvRows.push("");

      // Risk Distribution
      csvRows.push("=== DISTRIBUTION DES RISQUES ===");
      csvRows.push("Niveau,Clients,Montant,Pourcentage");
      riskDistribution.forEach((item) => {
        csvRows.push(`${item.level},${item.count},${item.amount},${item.percentage}%`);
      });
      csvRows.push("");

      // Top Debtors
      csvRows.push("=== TOP DÉBITEURS ===");
      csvRows.push("Nom,Entreprise,Dette Totale,Payé,Nombre de Créances,Niveau de Risque");
      topDebtors.forEach((debtor) => {
        csvRows.push(`${debtor.name},${debtor.company || "-"},${debtor.totalDebt},${debtor.paidAmount},${debtor.debtCount},${debtor.riskLevel || "-"}`);
      });

      const csvContent = csvRows.join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="analytics_report_${Date.now()}.csv"`,
        },
      });
    }

    // PDF format
    const doc = new jsPDF() as jsPDF & { autoTable: (options: Record<string, unknown>) => void };
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(234, 88, 12); // Orange color
    doc.text("RelancePro Africa", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Rapport Analytics", pageWidth / 2, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, pageWidth / 2, 38, { align: "center" });

    // KPIs Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Indicateurs Clés de Performance", 14, 55);

    doc.autoTable({
      startY: 60,
      head: [["Indicateur", "Valeur"]],
      body: [
        ["Total Créances", stats.totalDebts.toString()],
        ["Montant Total", `${stats.totalAmount.toLocaleString("fr-FR")} GNF`],
        ["Montant Récupéré", `${stats.paidAmount.toLocaleString("fr-FR")} GNF`],
        ["Montant en Attente", `${stats.pendingAmount.toLocaleString("fr-FR")} GNF`],
        ["Montant en Retard", `${stats.overdueAmount.toLocaleString("fr-FR")} GNF`],
        ["Taux de Recouvrement", `${stats.recoveryRate}%`],
        ["Prédiction IA Moyenne", `${stats.avgPaymentProbability}%`],
        ["Nombre de Clients", stats.clientCount.toString()],
        ["Relances Envoyées", stats.reminderCount.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 },
    });

    // Debt Aging Section
    const agingStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Répartition par Ancienneté", 14, agingStartY);

    doc.autoTable({
      startY: agingStartY + 5,
      head: [["Tranche", "Montant", "Nombre", "%"]],
      body: debtAging.map((item) => [
        item.bucket,
        `${item.amount.toLocaleString("fr-FR")} GNF`,
        item.count.toString(),
        `${item.percentage}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 },
    });

    // Risk Distribution Section
    const riskStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Distribution des Risques", 14, riskStartY);

    doc.autoTable({
      startY: riskStartY + 5,
      head: [["Niveau", "Clients", "Montant", "%"]],
      body: riskDistribution.map((item) => [
        item.level,
        item.count.toString(),
        `${item.amount.toLocaleString("fr-FR")} GNF`,
        `${item.percentage}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 },
    });

    // Top Debtors Section
    const debtorsStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Top Débiteurs", 14, debtorsStartY);

    doc.autoTable({
      startY: debtorsStartY + 5,
      head: [["Nom", "Entreprise", "Dette Totale", "Risque"]],
      body: topDebtors.slice(0, 5).map((debtor) => [
        debtor.name,
        debtor.company || "-",
        `${debtor.totalDebt.toLocaleString("fr-FR")} GNF`,
        debtor.riskLevel || "-",
      ]),
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 },
    });

    // Reminder Effectiveness
    const reminderStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Efficacité des Relances", 14, reminderStartY);

    doc.autoTable({
      startY: reminderStartY + 5,
      head: [["Canal", "Envoyées", "Délivrées", "Ouvertes", "Réponses", "Taux Succès"]],
      body: reminderEffectiveness.map((item) => [
        item.type,
        item.sent.toString(),
        item.delivered.toString(),
        item.opened.toString(),
        item.responded.toString(),
        `${item.successRate}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `RelancePro Africa - Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="analytics_report_${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export du rapport" },
      { status: 500 }
    );
  }
}
