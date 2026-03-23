// Librairie de prédiction de paiement - RelancePro Africa
// Utilise z-ai-web-dev-sdk pour les prédictions IA avancées

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { formatCurrencyAmount, getDefaultCurrency } from '@/lib/config';

// =====================================================
// TYPES
// =====================================================

export interface PredictionModel {
  weights: {
    amountWeight: number;
    daysOverdueWeight: number;
    historyWeight: number;
    reminderWeight: number;
    clientScoreWeight: number;
  };
  thresholds: {
    highProbability: number;
    mediumProbability: number;
    urgentDays: number;
    criticalDays: number;
  };
}

export interface PredictionResult {
  probability: number; // 0-100
  confidence: 'low' | 'medium' | 'high';
  factors: PredictionFactor[];
  recommendation: string;
  predictedDate: Date | null;
}

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface DebtWithClient {
  id: string;
  clientId: string;
  profileId: string;
  reference: string | null;
  description: string | null;
  amount: number;
  currency: string;
  dueDate: Date;
  status: string;
  paidAmount: number;
  paidDate: Date | null;
  reminderCount: number;
  lastReminderAt: Date | null;
  nextReminderAt: Date | null;
  paymentProbability: number | null;
  predictedPayDate: Date | null;
  predictionFactors: string | null;
  lastPredictionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    status: string;
    riskScore: number | null;
    riskLevel: string | null;
    paymentPattern: string | null;
  };
}

// =====================================================
// ZAI INSTANCE
// =====================================================

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// =====================================================
// TRAIN PREDICTION MODEL
// =====================================================

export async function trainPredictionModel(debts: DebtWithClient[]): Promise<PredictionModel> {
  const zai = await getZAI();
  
  // Analyze historical data patterns
  const paidDebts = debts.filter(d => d.status === 'paid');
  const pendingDebts = debts.filter(d => d.status === 'pending' || d.status === 'partial');
  
  // Calculate average metrics for paid vs unpaid
  const avgDaysToPayment = paidDebts.length > 0 
    ? paidDebts.reduce((sum, d) => {
        const days = d.paidDate 
          ? Math.ceil((new Date(d.paidDate).getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return sum + days;
      }, 0) / paidDebts.length
    : 0;
  
  const avgRemindersForPaid = paidDebts.length > 0
    ? paidDebts.reduce((sum, d) => sum + d.reminderCount, 0) / paidDebts.length
    : 0;
  
  // Default weights based on African market research
  const defaultModel: PredictionModel = {
    weights: {
      amountWeight: 0.15,
      daysOverdueWeight: 0.25,
      historyWeight: 0.25,
      reminderWeight: 0.15,
      clientScoreWeight: 0.20
    },
    thresholds: {
      highProbability: 70,
      mediumProbability: 40,
      urgentDays: 30,
      criticalDays: 60
    }
  };
  
  // Use AI to refine model based on data
  if (debts.length >= 10) {
    try {
      const prompt = `Analyse ces données historiques de recouvrement de créances en Afrique de l'Ouest et propose des poids optimaux pour un modèle de prédiction.

DONNÉES:
- Total créances: ${debts.length}
- Créances payées: ${paidDebts.length}
- Créances en cours: ${pendingDebts.length}
- Délai moyen de paiement: ${avgDaysToPayment.toFixed(1)} jours après échéance
- Nombre moyen de relances pour paiement: ${avgRemindersForPaid.toFixed(1)}

Contexte Afrique de l'Ouest:
- Délai de paiement moyen: 15-45 jours après échéance
- Taux de réponse aux relances: 35-45%
- Taux de recouvrement moyen: 60-70%

Propose des poids optimaux (somme = 1.0) pour:
1. amountWeight - Impact du montant
2. daysOverdueWeight - Impact du retard
3. historyWeight - Impact de l'historique client
4. reminderWeight - Impact des relances envoyées
5. clientScoreWeight - Impact du score de risque

Réponds en JSON:
{
  "weights": {
    "amountWeight": <nombre>,
    "daysOverdueWeight": <nombre>,
    "historyWeight": <nombre>,
    "reminderWeight": <nombre>,
    "clientScoreWeight": <nombre>
  },
  "thresholds": {
    "highProbability": <nombre>,
    "mediumProbability": <nombre>,
    "urgentDays": <nombre>,
    "criticalDays": <nombre>
  }
}`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Tu es un expert en analyse de données financières pour le marché africain.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 400
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        const parsed = JSON.parse(jsonStr.trim());
        
        if (parsed.weights && parsed.thresholds) {
          // Validate and normalize weights
          const weights = parsed.weights;
          const total = Object.values(weights).reduce((sum: number, w) => sum + w, 0) as number;
          
          return {
            weights: {
              amountWeight: weights.amountWeight / total,
              daysOverdueWeight: weights.daysOverdueWeight / total,
              historyWeight: weights.historyWeight / total,
              reminderWeight: weights.reminderWeight / total,
              clientScoreWeight: weights.clientScoreWeight / total
            },
            thresholds: parsed.thresholds
          };
        }
      }
    } catch (error) {
      console.error('Model training error:', error);
    }
  }
  
  return defaultModel;
}

// =====================================================
// PREDICT PAYMENT PROBABILITY
// =====================================================

export async function predictPaymentProbability(
  debt: DebtWithClient,
  client: DebtWithClient['client'],
  model?: PredictionModel
): Promise<PredictionResult> {
  const zai = await getZAI();
  const factors: PredictionFactor[] = [];
  
  // Calculate days overdue
  const now = new Date();
  const dueDate = new Date(debt.dueDate);
  const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Get client payment history
  const clientHistory = await getClientPaymentHistory(client.id);
  
  // Use AI for prediction
  try {
    const prompt = `Prédis la probabilité de paiement pour cette créance et explique les facteurs.

CRÉANCE:
- Référence: ${debt.reference || 'N/A'}
- Montant dû: ${formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency)}
- Montant total: ${formatCurrencyAmount(debt.amount, debt.currency)}
- Déjà payé: ${formatCurrencyAmount(debt.paidAmount, debt.currency)} (${((debt.paidAmount / debt.amount) * 100).toFixed(1)}%)
- Date d'échéance: ${dueDate.toLocaleDateString('fr-FR')}
- Jours de retard: ${daysOverdue}
- Relances envoyées: ${debt.reminderCount}
- Dernière relance: ${debt.lastReminderAt ? new Date(debt.lastReminderAt).toLocaleDateString('fr-FR') : 'Aucune'}

CLIENT:
- Nom: ${client.name}
- Entreprise: ${client.company || 'Particulier'}
- Email: ${client.email || 'Non fourni'}
- Téléphone: ${client.phone || 'Non fourni'}
- Statut: ${client.status}
- Score de risque: ${client.riskScore || 'Non calculé'}
- Niveau de risque: ${client.riskLevel || 'Non déterminé'}

HISTORIQUE PAIEMENT:
- Taux de paiement: ${clientHistory.paymentRate.toFixed(1)}%
- Délai moyen: ${clientHistory.avgPaymentDelay.toFixed(0)} jours
- Créances payées: ${clientHistory.paidCount}/${clientHistory.totalCount}

Réponds en JSON:
{
  "probability": <nombre 0-100>,
  "confidence": "low|medium|high",
  "factors": [
    {
      "name": "nom du facteur",
      "impact": "positive|negative|neutral",
      "weight": <nombre 0-1>,
      "description": "explication courte"
    }
  ],
  "recommendation": "recommandation actionnable",
  "predictedDays": <nombre de jours estimés pour paiement>
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'Tu es un expert en analyse de risque de crédit et recouvrement de créances en Afrique de l\'Ouest. Réponds toujours en JSON valide.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      const predictedDate = parsed.predictedDays 
        ? new Date(Date.now() + parsed.predictedDays * 24 * 60 * 60 * 1000)
        : null;
      
      return {
        probability: Math.max(0, Math.min(100, parsed.probability || 50)),
        confidence: parsed.confidence || 'medium',
        factors: parsed.factors || [],
        recommendation: parsed.recommendation || '',
        predictedDate
      };
    }
  } catch (error) {
    console.error('Prediction error:', error);
  }
  
  // Fallback to rule-based prediction
  return calculateRuleBasedPrediction(debt, client, daysOverdue, clientHistory);
}

// =====================================================
// PREDICT PAYMENT DATE
// =====================================================

export async function predictPaymentDate(debt: DebtWithClient): Promise<Date | null> {
  const zai = await getZAI();
  
  const now = new Date();
  const dueDate = new Date(debt.dueDate);
  const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // If already paid, return paid date
  if (debt.status === 'paid' && debt.paidDate) {
    return new Date(debt.paidDate);
  }
  
  // Use AI prediction
  try {
    const prompt = `Estime la date de paiement pour cette créance basée sur les patterns africains.

CRÉANCE:
- Montant restant: ${formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency)}
- Jours de retard: ${daysOverdue}
- Relances: ${debt.reminderCount}
- Statut: ${debt.status}

Patterns typiques Afrique de l'Ouest:
- Délai après 1ère relance: 7-14 jours
- Délai après 2ème relance: 14-21 jours
- Délai après 3ème relance: 21-30 jours
- Probabilité de paiement diminue de 5% par semaine après 60 jours

Donne une estimation en JSON:
{
  "estimatedDays": <nombre de jours à partir d'aujourd'hui>,
  "confidence": "low|medium|high",
  "reasoning": "explication courte"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en recouvrement de créances. Réponds en JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      if (parsed.estimatedDays) {
        return new Date(Date.now() + parsed.estimatedDays * 24 * 60 * 60 * 1000);
      }
    }
  } catch (error) {
    console.error('Date prediction error:', error);
  }
  
  // Fallback estimation
  return estimateFallbackDate(debt, daysOverdue);
}

// =====================================================
// GET PREDICTION FACTORS
// =====================================================

export async function getPredictionFactors(debt: DebtWithClient): Promise<PredictionFactor[]> {
  const zai = await getZAI();
  
  const now = new Date();
  const dueDate = new Date(debt.dueDate);
  const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  const factors: PredictionFactor[] = [];
  
  // Amount factor
  if (debt.amount > 1000000) {
    factors.push({
      name: 'Montant élevé',
      impact: 'negative',
      weight: 0.2,
      description: 'Les créances importantes sont souvent plus difficiles à recouvrer rapidement'
    });
  } else if (debt.amount < 100000) {
    factors.push({
      name: 'Montant modéré',
      impact: 'positive',
      weight: 0.15,
      description: 'Les petits montants sont généralement payés plus facilement'
    });
  }
  
  // Days overdue factor
  if (daysOverdue > 60) {
    factors.push({
      name: 'Retard critique',
      impact: 'negative',
      weight: 0.25,
      description: `${daysOverdue} jours de retard - risque de non-recouvrement élevé`
    });
  } else if (daysOverdue > 30) {
    factors.push({
      name: 'Retard significatif',
      impact: 'negative',
      weight: 0.15,
      description: `${daysOverdue} jours de retard - attention requise`
    });
  }
  
  // Partial payment factor
  const paidPercentage = (debt.paidAmount / debt.amount) * 100;
  if (paidPercentage > 50) {
    factors.push({
      name: 'Paiement partiel important',
      impact: 'positive',
      weight: 0.2,
      description: `${paidPercentage.toFixed(0)}% déjà payé - bonne intention de paiement`
    });
  } else if (paidPercentage > 0) {
    factors.push({
      name: 'Paiement partiel',
      impact: 'positive',
      weight: 0.1,
      description: 'Un acompte a été versé'
    });
  }
  
  // Reminder factor
  if (debt.reminderCount >= 3) {
    factors.push({
      name: 'Relances multiples',
      impact: 'negative',
      weight: 0.15,
      description: `${debt.reminderCount} relances sans résultat - client non réactif`
    });
  } else if (debt.reminderCount > 0) {
    factors.push({
      name: 'Relances envoyées',
      impact: 'neutral',
      weight: 0.05,
      description: `${debt.reminderCount} relance(s) envoyée(s)`
    });
  }
  
  // Client risk factor
  if (debt.client.riskLevel === 'high') {
    factors.push({
      name: 'Client à risque',
      impact: 'negative',
      weight: 0.2,
      description: 'Ce client a un historique de paiement difficile'
    });
  } else if (debt.client.riskLevel === 'low') {
    factors.push({
      name: 'Client fiable',
      impact: 'positive',
      weight: 0.15,
      description: 'Ce client a un bon historique de paiement'
    });
  }
  
  // Contact availability
  if (!debt.client.email && !debt.client.phone) {
    factors.push({
      name: 'Contact manquant',
      impact: 'negative',
      weight: 0.2,
      description: 'Aucun moyen de contact disponible'
    });
  } else if (debt.client.email && debt.client.phone) {
    factors.push({
      name: 'Contacts disponibles',
      impact: 'positive',
      weight: 0.1,
      description: 'Email et téléphone disponibles pour les relances'
    });
  }
  
  return factors;
}

// =====================================================
// CACHE PREDICTIONS IN DATABASE
// =====================================================

export async function cachePredictionInDatabase(
  debtId: string,
  prediction: PredictionResult
): Promise<void> {
  try {
    await db.debt.update({
      where: { id: debtId },
      data: {
        paymentProbability: prediction.probability,
        predictedPayDate: prediction.predictedDate,
        predictionFactors: JSON.stringify(prediction.factors),
        lastPredictionAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error caching prediction:', error);
  }
}

export async function getCachedPrediction(debtId: string): Promise<PredictionResult | null> {
  try {
    const debt = await db.debt.findUnique({
      where: { id: debtId },
      select: {
        paymentProbability: true,
        predictedPayDate: true,
        predictionFactors: true,
        lastPredictionAt: true
      }
    });
    
    if (!debt || !debt.paymentProbability || !debt.lastPredictionAt) {
      return null;
    }
    
    // Check if prediction is fresh (< 24 hours)
    const hoursSincePrediction = (Date.now() - new Date(debt.lastPredictionAt).getTime()) / (1000 * 60 * 60);
    if (hoursSincePrediction > 24) {
      return null; // Stale prediction
    }
    
    return {
      probability: debt.paymentProbability,
      confidence: 'medium',
      factors: debt.predictionFactors ? JSON.parse(debt.predictionFactors) : [],
      recommendation: '',
      predictedDate: debt.predictedPayDate
    };
  } catch (error) {
    console.error('Error getting cached prediction:', error);
    return null;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getClientPaymentHistory(clientId: string) {
  const debts = await db.debt.findMany({
    where: { clientId },
    select: {
      status: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      paidDate: true
    }
  });
  
  const paidDebts = debts.filter(d => d.status === 'paid');
  const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0);
  const paidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  
  const avgPaymentDelay = paidDebts.length > 0
    ? paidDebts.reduce((sum, d) => {
        if (d.paidDate && d.dueDate) {
          return sum + Math.ceil((new Date(d.paidDate).getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0) / paidDebts.length
    : 30;
  
  return {
    totalCount: debts.length,
    paidCount: paidDebts.length,
    paymentRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
    avgPaymentDelay
  };
}

function calculateRuleBasedPrediction(
  debt: DebtWithClient,
  client: DebtWithClient['client'],
  daysOverdue: number,
  history: { paymentRate: number; avgPaymentDelay: number; paidCount: number; totalCount: number }
): PredictionResult {
  let probability = 70;
  const factors: PredictionFactor[] = [];
  
  // Days overdue impact
  if (daysOverdue > 90) {
    probability -= 40;
    factors.push({ name: 'Retard critique', impact: 'negative', weight: 0.3, description: 'Plus de 90 jours de retard' });
  } else if (daysOverdue > 60) {
    probability -= 25;
    factors.push({ name: 'Retard important', impact: 'negative', weight: 0.2, description: 'Plus de 60 jours de retard' });
  } else if (daysOverdue > 30) {
    probability -= 15;
    factors.push({ name: 'Retard modéré', impact: 'negative', weight: 0.15, description: 'Plus de 30 jours de retard' });
  }
  
  // Payment history impact
  if (history.paymentRate > 80) {
    probability += 15;
    factors.push({ name: 'Excellent historique', impact: 'positive', weight: 0.2, description: 'Taux de paiement supérieur à 80%' });
  } else if (history.paymentRate < 30) {
    probability -= 20;
    factors.push({ name: 'Historique faible', impact: 'negative', weight: 0.2, description: 'Taux de paiement inférieur à 30%' });
  }
  
  // Partial payment impact
  const paidPercentage = (debt.paidAmount / debt.amount) * 100;
  if (paidPercentage > 50) {
    probability += 20;
    factors.push({ name: 'Paiement partiel', impact: 'positive', weight: 0.15, description: 'Plus de 50% déjà payé' });
  } else if (paidPercentage > 0) {
    probability += 10;
    factors.push({ name: 'Acompte versé', impact: 'positive', weight: 0.1, description: 'Paiement partiel effectué' });
  }
  
  // Reminder impact
  if (debt.reminderCount >= 3) {
    probability -= 15;
    factors.push({ name: 'Relances sans effet', impact: 'negative', weight: 0.1, description: '3 relances sans paiement complet' });
  }
  
  // Client risk impact
  if (client.riskLevel === 'high') {
    probability -= 15;
    factors.push({ name: 'Client risqué', impact: 'negative', weight: 0.15, description: 'Niveau de risque élevé' });
  } else if (client.riskLevel === 'low') {
    probability += 10;
    factors.push({ name: 'Client fiable', impact: 'positive', weight: 0.1, description: 'Faible niveau de risque' });
  }
  
  probability = Math.max(5, Math.min(95, probability));
  
  const predictedDays = Math.ceil(14 + (100 - probability) * 0.5);
  const predictedDate = new Date(Date.now() + predictedDays * 24 * 60 * 60 * 1000);
  
  return {
    probability,
    confidence: probability > 70 || probability < 30 ? 'high' : 'medium',
    factors,
    recommendation: probability > 60 
      ? 'Continuer les relances standard. Paiement probable.'
      : probability > 30 
      ? 'Intensifier les relances. Envisager une négociation.'
      : 'Risque élevé. Envisager le recouvrement externe.',
    predictedDate
  };
}

function estimateFallbackDate(debt: DebtWithClient, daysOverdue: number): Date | null {
  // Base estimation on status and history
  if (debt.status === 'paid') {
    return debt.paidDate ? new Date(debt.paidDate) : null;
  }
  
  let estimatedDays = 14; // Base estimate
  
  // Adjust for days overdue
  if (daysOverdue > 60) {
    estimatedDays += 30;
  } else if (daysOverdue > 30) {
    estimatedDays += 14;
  }
  
  // Adjust for reminders
  if (debt.reminderCount === 0) {
    estimatedDays += 7;
  } else if (debt.reminderCount >= 3) {
    estimatedDays += 21;
  }
  
  // Adjust for partial payment
  const paidPercentage = (debt.paidAmount / debt.amount) * 100;
  if (paidPercentage > 50) {
    estimatedDays -= 7;
  }
  
  return new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);
}

// =====================================================
// BATCH PREDICTION
// =====================================================

export async function batchPredictPayments(
  debts: DebtWithClient[],
  useCache: boolean = true
): Promise<Map<string, PredictionResult>> {
  const results = new Map<string, PredictionResult>();
  
  for (const debt of debts) {
    // Check cache first
    if (useCache) {
      const cached = await getCachedPrediction(debt.id);
      if (cached) {
        results.set(debt.id, cached);
        continue;
      }
    }
    
    // Generate new prediction
    const prediction = await predictPaymentProbability(debt, debt.client);
    
    // Cache the result
    await cachePredictionInDatabase(debt.id, prediction);
    
    results.set(debt.id, prediction);
  }
  
  return results;
}
