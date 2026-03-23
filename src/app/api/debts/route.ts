import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { cacheOrFetch, CacheKeys, CacheTTL, invalidateUserCache } from "@/lib/cache";
import { notifyNewDebt } from "@/lib/push/service";
import { logDebtAction, AuditAction } from "@/lib/audit/logger";

// GET - Liste des créances avec cache
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const overdue = searchParams.get("overdue");
    const noCache = searchParams.get("noCache") === "true";

    // Si des filtres sont appliqués, ne pas utiliser le cache
    const useCache = !status && !overdue && !noCache;

    const fetchDebts = async () => {
      const where: Record<string, unknown> = {
        profileId: session.user.id,
      };

      if (status && status !== "all") {
        where.status = status;
      }

      if (overdue === "true") {
        where.status = { in: ["pending", "partial"] };
        where.dueDate = { lt: new Date() };
      }

      return db.debt.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
      });
    };

    // Utiliser le cache si pas de filtres
    let debts;
    if (useCache) {
      debts = await cacheOrFetch(
        CacheKeys.debtsList(session.user.id),
        fetchDebts,
        CacheTTL.SHORT // 2 minutes
      );
    } else {
      debts = await fetchDebts();
    }

    return NextResponse.json(debts);
  } catch (error) {
    console.error("Error fetching debts:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des créances" },
      { status: 500 }
    );
  }
}

// POST - Créer une créance
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, reference, description, amount, currency, dueDate } = body;

    if (!clientId || !amount || !dueDate) {
      return NextResponse.json(
        { error: "Client, montant et date d'échéance sont obligatoires" },
        { status: 400 }
      );
    }

    // Vérifier que le client appartient à l'utilisateur
    const client = await db.client.findFirst({
      where: { id: clientId, profileId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client non trouvé" },
        { status: 404 }
      );
    }

    const debt = await db.debt.create({
      data: {
        profileId: session.user.id,
        clientId,
        reference: reference || null,
        description: description || null,
        amount: parseFloat(amount),
        currency: currency || "XOF",
        dueDate: new Date(dueDate),
      },
      include: {
        client: true,
      },
    });

    // Invalider le cache des créances et clients
    await invalidateUserCache(session.user.id);

    // Log audit action
    await logDebtAction(AuditAction.DEBT_CREATED, debt.id, {
      profileId: session.user.id,
      clientId: client.id,
      amount: debt.amount,
      currency: debt.currency,
      reference: debt.reference,
      newValues: {
        reference: debt.reference,
        description: debt.description,
        amount: debt.amount,
        currency: debt.currency,
        dueDate: debt.dueDate,
        status: debt.status,
      },
    });

    // Send push notification for new debt
    notifyNewDebt(
      session.user.id,
      debt.id,
      client.name,
      debt.amount,
      debt.currency
    ).catch(err => console.error("Failed to send push notification:", err));

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error("Error creating debt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la créance" },
      { status: 500 }
    );
  }
}
