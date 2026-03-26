import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { format, type, filters } = body;

    // Get data based on type
    let data: unknown[] = [];

    switch (type) {
      case "debts":
        data = await db.debt.findMany({
          where: {
            profileId: session.user.id,
            ...filters,
          },
          include: {
            client: {
              select: { name: true, email: true, phone: true, company: true },
            },
          },
          orderBy: { dueDate: "desc" },
        });
        break;

      case "clients":
        data = await db.client.findMany({
          where: {
            profileId: session.user.id,
            ...filters,
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      case "reminders":
        data = await db.reminder.findMany({
          where: {
            profileId: session.user.id,
            ...filters,
          },
          include: {
            client: { select: { name: true } },
            debt: { select: { reference: true, amount: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      default:
        return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    // Generate export based on format
    if (format === "json") {
      return NextResponse.json({ data, exportedAt: new Date().toISOString() });
    }

    if (format === "csv") {
      const csv = generateCSV(data, type);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="export_${type}_${Date.now()}.csv"`,
        },
      });
    }

    // PDF will be handled by the frontend
    return NextResponse.json({
      data,
      format,
      type,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}

function generateCSV(data: unknown[], type: string): string {
  if (data.length === 0) return "";

  const headers: string[] = [];
  const rows: string[][] = [];

  switch (type) {
    case "debts":
      headers.push("Référence", "Client", "Montant", "Payé", "Reste", "Échéance", "Statut");
      data.forEach((item: any) => {
        rows.push([
          item.reference || "",
          item.client?.name || "",
          item.amount.toString(),
          item.paidAmount.toString(),
          (item.amount - item.paidAmount).toString(),
          new Date(item.dueDate).toLocaleDateString("fr-FR"),
          item.status,
        ]);
      });
      break;

    case "clients":
      headers.push("Nom", "Email", "Téléphone", "Entreprise", "Statut");
      data.forEach((item: any) => {
        rows.push([
          item.name,
          item.email || "",
          item.phone || "",
          item.company || "",
          item.status,
        ]);
      });
      break;

    case "reminders":
      headers.push("Type", "Client", "Message", "Statut", "Date");
      data.forEach((item: any) => {
        rows.push([
          item.type,
          item.client?.name || "",
          item.message?.substring(0, 100) || "",
          item.status,
          new Date(item.createdAt).toLocaleDateString("fr-FR"),
        ]);
      });
      break;
  }

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
  ].join("\n");

  return csvContent;
}
