// =====================================================
// RELANCEPRO AFRICA - PDF Export API Endpoint
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  exportToPDF,
  getExportFilename,
  getMimeType,
  type ExportType,
  type ExportOptions,
} from "@/lib/services/export";
import { isInDemoMode } from "@/lib/demo";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { type, filters, locale, currency, companyName, dateRange } = body as {
      type: ExportType;
      filters?: Record<string, unknown>;
      locale?: "fr" | "en";
      currency?: string;
      companyName?: string;
      dateRange?: { start: string; end: string };
    };

    if (!type || !["debts", "clients", "reminders"].includes(type)) {
      return NextResponse.json(
        { error: "Type d'export invalide. Utilisez: debts, clients, ou reminders" },
        { status: 400 }
      );
    }

    // Get user profile for additional options
    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { 
        companyName: true, 
        preferredCurrency: true, 
        preferredLanguage: true,
        subscriptionStatus: true,
        demoExpiresAt: true,
      },
    });

    // Check if user is in demo mode
    const isDemoUser = profile ? isInDemoMode(profile) : false;

    // Prepare export options (include demo flag for watermark)
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
      isDemo: isDemoUser,
    };

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

    // Generate PDF
    const pdfBuffer = await exportToPDF(data, type, exportOptions);

    // Return PDF file
    const filename = getExportFilename(type, "pdf");

    // Add demo prefix to filename if in demo mode
    const finalFilename = isDemoUser ? `demo_${filename}` : filename;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": getMimeType("pdf"),
        "Content-Disposition": `attachment; filename="${finalFilename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}
