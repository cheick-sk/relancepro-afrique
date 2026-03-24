// API Route pour les prédictions IA - RelancePro Africa
// POST: Génère des prédictions pour les créances
// GET: Récupère les prédictions en cache

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  predictPaymentProbability,
  predictPaymentDate,
  getPredictionFactors,
  getCachedPrediction,
  cachePredictionInDatabase,
  type DebtWithClient
} from '@/lib/ai/payment-prediction';
import { analyzeClientRisk } from '@/lib/ai/risk-analysis';

// =====================================================
// POST - Générer des prédictions
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { debtIds, clientIds, forceRefresh = false } = body;

    const results: {
      debts: Record<string, unknown>[];
      clients: Record<string, unknown>[];
    } = {
      debts: [],
      clients: []
    };

    // Predict for debts
    if (debtIds && Array.isArray(debtIds)) {
      for (const debtId of debtIds) {
        // Check cache first
        if (!forceRefresh) {
          const cached = await getCachedPrediction(debtId);
          if (cached) {
            results.debts.push({
              debtId,
              cached: true,
              ...cached
            });
            continue;
          }
        }

        // Get debt with client data
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
                status: true,
                riskScore: true,
                riskLevel: true,
                paymentPattern: true
              }
            }
          }
        });

        if (!debt || debt.profileId !== session.user.id) {
          continue;
        }

        const debtWithClient: DebtWithClient = {
          ...debt,
          currency: debt.currency || 'GNF',
          client: debt.client
        };

        // Generate predictions
        const [probability, predictedDate, factors] = await Promise.all([
          predictPaymentProbability(debtWithClient, debt.client),
          predictPaymentDate(debtWithClient),
          getPredictionFactors(debtWithClient)
        ]);

        // Combine results
        const prediction = {
          debtId,
          probability: probability.probability,
          confidence: probability.confidence,
          factors: probability.factors.length > 0 ? probability.factors : factors,
          recommendation: probability.recommendation,
          predictedDate: probability.predictedDate || predictedDate
        };

        // Cache the prediction
        await cachePredictionInDatabase(debtId, {
          probability: prediction.probability,
          confidence: prediction.confidence,
          factors: prediction.factors,
          recommendation: prediction.recommendation,
          predictedDate: prediction.predictedDate
        });

        results.debts.push({
          debtId,
          cached: false,
          ...prediction
        });
      }
    }

    // Analyze risk for clients
    if (clientIds && Array.isArray(clientIds)) {
      for (const clientId of clientIds) {
        const client = await db.client.findUnique({
          where: { id: clientId },
          include: {
            debts: {
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                paidAmount: true,
                dueDate: true,
                paidDate: true,
                reminderCount: true,
                lastReminderAt: true
              }
            }
          }
        });

        if (!client || client.profileId !== session.user.id) {
          continue;
        }

        const riskAnalysis = await analyzeClientRisk(
          {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            status: client.status,
            riskScore: client.riskScore,
            riskLevel: client.riskLevel,
            paymentPattern: client.paymentPattern,
            debts: client.debts
          },
          client.debts
        );

        // Update client with new risk data
        await db.client.update({
          where: { id: clientId },
          data: {
            riskScore: riskAnalysis.score,
            riskLevel: riskAnalysis.level
          }
        });

        results.clients.push({
          clientId,
          ...riskAnalysis
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI prediction error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des prédictions' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET - Récupérer les prédictions en cache
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get('debtId');
    const clientId = searchParams.get('clientId');
    const all = searchParams.get('all') === 'true';

    // Get cached prediction for specific debt
    if (debtId) {
      const cached = await getCachedPrediction(debtId);
      
      if (!cached) {
        // Get debt to check ownership and generate new prediction
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
                status: true,
                riskScore: true,
                riskLevel: true,
                paymentPattern: true
              }
            }
          }
        });

        if (!debt || debt.profileId !== session.user.id) {
          return NextResponse.json({ error: 'Créance non trouvée' }, { status: 404 });
        }

        const debtWithClient: DebtWithClient = {
          ...debt,
          currency: debt.currency || 'GNF',
          client: debt.client
        };

        const prediction = await predictPaymentProbability(debtWithClient, debt.client);
        
        await cachePredictionInDatabase(debtId, prediction);
        
        return NextResponse.json({
          debtId,
          cached: false,
          ...prediction
        });
      }

      return NextResponse.json({
        debtId,
        cached: true,
        ...cached
      });
    }

    // Get risk analysis for specific client
    if (clientId) {
      const client = await db.client.findUnique({
        where: { id: clientId },
        include: {
          debts: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              paidAmount: true,
              dueDate: true,
              paidDate: true,
              reminderCount: true,
              lastReminderAt: true
            }
          }
        }
      });

      if (!client || client.profileId !== session.user.id) {
        return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
      }

      const riskAnalysis = await analyzeClientRisk(
        {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          company: client.company,
          status: client.status,
          riskScore: client.riskScore,
          riskLevel: client.riskLevel,
          paymentPattern: client.paymentPattern,
          debts: client.debts
        },
        client.debts
      );

      return NextResponse.json({
        clientId,
        ...riskAnalysis
      });
    }

    // Get all predictions for user's debts
    if (all) {
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
              status: true,
              riskScore: true,
              riskLevel: true,
              paymentPattern: true
            }
          }
        }
      });

      const predictions = await Promise.all(
        debts.map(async (debt) => {
          let cached = await getCachedPrediction(debt.id);
          
          if (!cached) {
            const debtWithClient: DebtWithClient = {
              ...debt,
              currency: debt.currency || 'GNF',
              client: debt.client
            };
            const prediction = await predictPaymentProbability(debtWithClient, debt.client);
            await cachePredictionInDatabase(debt.id, prediction);
            cached = prediction;
          }

          return {
            debtId: debt.id,
            reference: debt.reference,
            amount: debt.amount,
            paidAmount: debt.paidAmount,
            clientName: debt.client.name,
            ...cached
          };
        })
      );

      return NextResponse.json({
        predictions,
        total: predictions.length,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  } catch (error) {
    console.error('Get predictions error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des prédictions' },
      { status: 500 }
    );
  }
}
