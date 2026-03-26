// API Route pour la stratégie de recouvrement - RelancePro Africa
// GET: Récupérer la stratégie de recouvrement

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  generateCollectionStrategy,
  optimizeReminderSequence,
  suggestNegotiationTerms,
  escalationRecommendation,
  getStrategyForClient,
  type DebtWithClientForStrategy
} from '@/lib/ai/collection-strategy';

// =====================================================
// GET - Récupérer la stratégie
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const debtId = searchParams.get('debtId');
    const type = searchParams.get('type') || 'strategy'; // strategy, sequence, negotiation, escalation

    // Get strategy for specific client
    if (clientId && type === 'strategy') {
      const actions = await getStrategyForClient(clientId);
      return NextResponse.json({
        clientId,
        actions,
        timestamp: new Date().toISOString()
      });
    }

    // Get reminder sequence for client
    if (clientId && type === 'sequence') {
      const sequence = await optimizeReminderSequence(clientId);
      return NextResponse.json({
        clientId,
        sequence,
        timestamp: new Date().toISOString()
      });
    }

    // Get negotiation terms for specific debt
    if (debtId && type === 'negotiation') {
      const debt = await db.debt.findUnique({
        where: { id: debtId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true,
              riskScore: true,
              riskLevel: true,
              paymentPattern: true,
              preferredContactChannel: true,
              optimalContactTime: true
            }
          }
        }
      });

      if (!debt || debt.profileId !== session.user.id) {
        return NextResponse.json({ error: 'Créance non trouvée' }, { status: 404 });
      }

      const debtWithClient: DebtWithClientForStrategy = {
        ...debt,
        client: debt.client
      };

      const terms = await suggestNegotiationTerms(debtWithClient);
      return NextResponse.json({
        debtId,
        terms,
        timestamp: new Date().toISOString()
      });
    }

    // Get escalation recommendation for specific debt
    if (debtId && type === 'escalation') {
      const debt = await db.debt.findUnique({
        where: { id: debtId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true,
              riskScore: true,
              riskLevel: true,
              paymentPattern: true,
              preferredContactChannel: true,
              optimalContactTime: true
            }
          }
        }
      });

      if (!debt || debt.profileId !== session.user.id) {
        return NextResponse.json({ error: 'Créance non trouvée' }, { status: 404 });
      }

      const debtWithClient: DebtWithClientForStrategy = {
        ...debt,
        client: debt.client
      };

      const recommendation = await escalationRecommendation(debtWithClient);
      return NextResponse.json({
        debtId,
        recommendation,
        timestamp: new Date().toISOString()
      });
    }

    // Get overall strategy for all debts
    const debts = await db.debt.findMany({
      where: {
        profileId: session.user.id,
        status: { not: 'paid' }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            riskScore: true,
            riskLevel: true,
            paymentPattern: true,
            preferredContactChannel: true,
            optimalContactTime: true
          }
        }
      }
    });

    if (debts.length === 0) {
      return NextResponse.json({
        strategy: null,
        message: 'Aucune créance en cours'
      });
    }

    const debtsWithClient: DebtWithClientForStrategy[] = debts.map(d => ({
      ...d,
      client: d.client
    }));

    const strategy = await generateCollectionStrategy(debtsWithClient, session.user.id);

    // Calculate summary stats
    const totalDebt = debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    const now = new Date();
    const overdueDebts = debts.filter(d => new Date(d.dueDate) < now);
    const criticalDebts = overdueDebts.filter(d => {
      const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue > 60;
    });

    return NextResponse.json({
      strategy,
      summary: {
        totalDebts: debts.length,
        overdueDebts: overdueDebts.length,
        criticalDebts: criticalDebts.length,
        totalAmount: totalDebt,
        expectedRecovery: strategy.expectedRecovery
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Strategy API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la stratégie' },
      { status: 500 }
    );
  }
}
