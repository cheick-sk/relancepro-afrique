// Portal API Route - Get client data by token
import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/portal/tokens";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    
    // Get client IP address
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                      request.headers.get("x-real-ip") ||
                      "unknown";

    // Validate token
    const tokenResult = await validatePortalToken(token, ipAddress);

    if (!tokenResult.valid) {
      return NextResponse.json(
        { error: tokenResult.error || "Invalid token" },
        { status: 401 }
      );
    }

    const { client, profile } = tokenResult;

    if (!client || !profile) {
      return NextResponse.json(
        { error: "Client data not found" },
        { status: 404 }
      );
    }

    // Get client's debts
    const debts = await db.debt.findMany({
      where: {
        clientId: client.id,
        status: {
          in: ["pending", "partial"],
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    // Get payment history (from ClientPayment)
    const paymentHistory = await db.clientPayment.findMany({
      where: {
        clientId: client.id,
        status: "success",
      },
      orderBy: {
        paidAt: "desc",
      },
      take: 20,
    });

    // Calculate totals
    const totalAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalPaid = debts.reduce((sum, debt) => sum + debt.paidAmount, 0);
    const totalOwed = totalAmount - totalPaid;

    // Get overdue debts
    const now = new Date();
    const overdueDebts = debts.filter((debt) => new Date(debt.dueDate) < now);
    const overdueAmount = overdueDebts.reduce(
      (sum, debt) => sum + (debt.amount - debt.paidAmount),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          company: client.company,
          address: client.address,
        },
        creditor: {
          name: profile.companyName || profile.email,
          phone: profile.phone,
          email: profile.email,
        },
        debts: debts.map((debt) => ({
          id: debt.id,
          reference: debt.reference,
          description: debt.description,
          amount: debt.amount,
          paidAmount: debt.paidAmount,
          balance: debt.amount - debt.paidAmount,
          currency: debt.currency,
          dueDate: debt.dueDate,
          issueDate: debt.issueDate,
          status: debt.status,
          isOverdue: new Date(debt.dueDate) < now,
        })),
        paymentHistory: paymentHistory.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt,
          paymentMethod: payment.paymentMethod,
          debtId: payment.debtId,
        })),
        summary: {
          totalDebts: debts.length,
          totalAmount,
          totalPaid,
          totalOwed,
          overdueCount: overdueDebts.length,
          overdueAmount,
        },
        token: {
          expiresAt: tokenResult.tokenData?.expiresAt,
          accessedCount: tokenResult.tokenData?.accessedCount,
        },
      },
    });
  } catch (error) {
    console.error("Portal API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
