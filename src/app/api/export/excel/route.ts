// =====================================================
// RELANCEPRO AFRICA - Excel Export API Endpoint
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  exportToExcel,
  exportAllToExcel,
  getExportFilename,
  getMimeType,
  type ExportType,
  type ExportOptions,
} from "@/lib/services/export";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { type, filters, locale, currency, companyName, dateRange, exportAll } = body as {
      type: ExportType | "all";
      filters?: Record<string, unknown>;
      locale?: "fr" | "en";
      currency?: string;
      companyName?: string;
      dateRange?: { start: string; end: string };
      exportAll?: boolean;
    };

    // Get user profile for additional options
    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { companyName: true, preferredCurrency: true, preferredLanguage: true },
    });

    // Prepare export options
    const exportOptions: ExportOptions = {
      locale: locale || (profile?.preferredLanguage as "fr" | "en") || "fr",
      currency: currency || profile?.preferredCurrency || "GNF",
      companyName: companyName || profile?.companyName || undefined,
      dateRange: dateRange
        ? {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end),
          }
        : undefined,
      filters,
    };

    // If exporting all data types in one file
    if (exportAll || type === "all") {
      const [debts, clients, reminders] = await Promise.all([
        db.debt.findMany({
          where: {
            profileId: session.user.id,
            ...(dateRange && {
              dueDate: {
                gte: new Date(dateRange.start),
                lte: new Date(dateRange.end),
              },
            }),
          },
          include: {
            client: {
              select: { name: true, email: true, phone: true, company: true },
            },
          },
          orderBy: { dueDate: "desc" },
        }),
        db.client.findMany({
          where: { profileId: session.user.id },
          orderBy: { createdAt: "desc" },
        }),
        db.reminder.findMany({
          where: {
            profileId: session.user.id,
            ...(dateRange && {
              createdAt: {
                gte: new Date(dateRange.start),
                lte: new Date(dateRange.end),
              },
            }),
          },
          include: {
            client: { select: { name: true } },
            debt: { select: { reference: true, amount: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const excelBuffer = await exportAllToExcel(
        { debts, clients, reminders },
        exportOptions
      );

      const filename = `relancepro_export_complet_${new Date().toISOString().split("T")[0]}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": getMimeType("excel"),
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": excelBuffer.length.toString(),
          "Cache-Control": "no-cache",
        },
      });
    }

    // Validate type for single export
    if (!type || !["debts", "clients", "reminders"].includes(type)) {
      return NextResponse.json(
        { error: "Type d'export invalide. Utilisez: debts, clients, reminders, ou all" },
        { status: 400 }
      );
    }

    // Fetch data based on type
    let data: Record<string, unknown[]> = {};

    switch (type) {
      case "debts": {
        const debts = await db.debt.findMany({
          where: {
            profileId: session.user.id,
            ...(filters?.status && { status: filters.status as string }),
            ...(filters?.clientId && { clientId: filters.clientId as string }),
            ...(dateRange && {
              dueDate: {
                gte: new Date(dateRange.start),
                lte: new Date(dateRange.end),
              },
            }),
          },
          include: {
            client: {
              select: { name: true, email: true, phone: true, company: true },
            },
          },
          orderBy: { dueDate: "desc" },
        });
        data.debts = debts;
        break;
      }

      case "clients": {
        const clients = await db.client.findMany({
          where: {
            profileId: session.user.id,
            ...(filters?.status && { status: filters.status as string }),
          },
          orderBy: { createdAt: "desc" },
        });
        data.clients = clients;
        break;
      }

      case "reminders": {
        const reminders = await db.reminder.findMany({
          where: {
            profileId: session.user.id,
            ...(filters?.type && { type: filters.type as string }),
            ...(filters?.status && { status: filters.status as string }),
            ...(dateRange && {
              createdAt: {
                gte: new Date(dateRange.start),
                lte: new Date(dateRange.end),
              },
            }),
          },
          include: {
            client: { select: { name: true } },
            debt: { select: { reference: true, amount: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        data.reminders = reminders;
        break;
      }
    }

    // Generate Excel
    const excelBuffer = await exportToExcel(data, type, exportOptions);

    // Return Excel file
    const filename = getExportFilename(type, "excel");

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": getMimeType("excel"),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Excel Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du fichier Excel" },
      { status: 500 }
    );
  }
}
