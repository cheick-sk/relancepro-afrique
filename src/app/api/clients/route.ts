import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { checkDemoLimits } from "@/lib/demo";
import { cacheOrFetch, CacheKeys, CacheTTL, invalidateUserCache } from "@/lib/cache";
import { logClientAction, AuditAction } from "@/lib/audit/logger";

// GET - Liste des clients avec cache
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const noCache = searchParams.get("noCache") === "true";

    // Si des filtres sont appliqués, ne pas utiliser le cache
    const useCache = !status && !search && !noCache;

    const fetchClients = async () => {
      const where: Record<string, unknown> = {
        profileId: session.user.id,
      };

      if (status && status !== "all") {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ];
      }

      const clients = await db.client.findMany({
        where,
        include: {
          _count: {
            select: { debts: true },
          },
          debts: {
            where: { status: { in: ["pending", "partial"] } },
            select: { amount: true, paidAmount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculer le total des dettes par client
      return clients.map((client) => {
        const totalDebt = client.debts.reduce((sum, d) => sum + d.amount, 0);
        const totalPaid = client.debts.reduce((sum, d) => sum + d.paidAmount, 0);
        return {
          ...client,
          debts: undefined,
          debtCount: client._count.debts,
          totalDebt,
          totalPaid,
          balance: totalDebt - totalPaid,
        };
      });
    };

    // Utiliser le cache si pas de filtres
    let clients;
    if (useCache) {
      clients = await cacheOrFetch(
        CacheKeys.clientsList(session.user.id),
        fetchClients,
        CacheTTL.SHORT // 2 minutes
      );
    } else {
      clients = await fetchClients();
    }

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des clients" },
      { status: 500 }
    );
  }
}

// POST - Créer un client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Check demo limits before creating client
    const demoCheck = await checkDemoLimits(session.user.id, "create_client");
    if (!demoCheck.allowed) {
      return NextResponse.json(
        {
          error: demoCheck.reason || "Limite atteinte",
          limitType: "clients",
          currentUsage: demoCheck.currentUsage,
          limit: demoCheck.limit,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, company, address, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Le nom du client est obligatoire" },
        { status: 400 }
      );
    }

    // Vérifier si un client avec le même email existe déjà
    if (email) {
      const existing = await db.client.findFirst({
        where: {
          profileId: session.user.id,
          email,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Un client avec cet email existe déjà" },
          { status: 400 }
        );
      }
    }

    const client = await db.client.create({
      data: {
        profileId: session.user.id,
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
      },
    });

    // Invalider le cache des clients
    await invalidateUserCache(session.user.id);

    // Log audit action
    await logClientAction(AuditAction.CLIENT_CREATED, client.id, {
      profileId: session.user.id,
      clientName: client.name,
      clientEmail: client.email,
      newValues: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du client" },
      { status: 500 }
    );
  }
}
