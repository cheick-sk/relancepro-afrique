// Librairie de stratégie de recouvrement - RelancePro Africa
// Utilise z-ai-web-dev-sdk pour générer des stratégies optimisées

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { formatCurrencyAmount } from '@/lib/config';
import type { RiskLevel } from './risk-analysis';
import type { ContactChannel, PaymentPattern } from './behavioral-analysis';

// =====================================================
// TYPES
// =====================================================

export interface CollectionStrategy {
  id: string;
  name: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  actions: CollectionAction[];
  expectedRecovery: number; // Montant estimé récupéré
  estimatedTimeframe: string;
  successProbability: number;
  totalDebt: number;
  debtCount: number;
}

export interface CollectionAction {
  order: number;
  type: 'reminder' | 'call' | 'visit' | 'legal' | 'negotiation' | 'escalation';
  channel?: ContactChannel;
  description: string;
  timing: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  debtId?: string;
  clientId?: string;
  expectedOutcome: string;
  estimatedCost?: number;
}

export interface ReminderSequence {
  reminders: ReminderStep[];
  optimalGap: number; // jours entre les relances
  channels: ContactChannel[];
  tones: ('formal' | 'friendly' | 'urgent')[];
}

export interface ReminderStep {
  step: number;
  daysAfterDue: number;
  channel: ContactChannel;
  tone: 'formal' | 'friendly' | 'urgent';
  template: string;
  expectedResponseRate: number;
}

export interface NegotiationTerms {
  originalAmount: number;
  proposedSettlement: number;
  paymentPlan?: {
    installments: number;
    amountPerInstallment: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    startDate: Date;
  };
  discountPercentage?: number;
  deadline: Date;
  reasoning: string;
}

export interface EscalationRecommendation {
  shouldEscalate: boolean;
  level: 'internal' | 'external' | 'legal';
  reason: string;
  prerequisites: string[];
  estimatedCost: number;
  expectedOutcome: string;
  timeframe: string;
}

export interface DebtWithClientForStrategy {
  id: string;
  clientId: string;
  reference: string | null;
  amount: number;
  currency: string;
  dueDate: Date;
  status: string;
  paidAmount: number;
  reminderCount: number;
  lastReminderAt: Date | null;
  paymentProbability: number | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    riskScore: number | null;
    riskLevel: string | null;
    paymentPattern: string | null;
    preferredContactChannel: string | null;
    optimalContactTime: string | null;
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
// GENERATE COLLECTION STRATEGY
// =====================================================

export async function generateCollectionStrategy(
  debts: DebtWithClientForStrategy[],
  profileId: string
): Promise<CollectionStrategy> {
  const zai = await getZAI();
  
  // Calculate totals
  const totalDebt = debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  const now = new Date();
  
  // Categorize debts
  const overdueDebts = debts.filter(d => {
    const dueDate = new Date(d.dueDate);
    return dueDate < now && d.status !== 'paid';
  });
  
  const criticalDebts = overdueDebts.filter(d => {
    const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 60 || d.paymentProbability !== null && d.paymentProbability < 30;
  });
  
  const highValueDebts = debts.filter(d => d.amount > 500000);
  
  // Determine overall priority
  let priority: CollectionStrategy['priority'] = 'medium';
  if (criticalDebts.length > 3 || totalDebt > 5000000) {
    priority = 'urgent';
  } else if (criticalDebts.length > 0 || totalDebt > 2000000) {
    priority = 'high';
  } else if (overdueDebts.length === 0) {
    priority = 'low';
  }
  
  // Generate actions
  const actions: CollectionAction[] = [];
  let actionOrder = 1;
  
  // Use AI for strategy generation
  try {
    const prompt = `Génère une stratégie de recouvrement optimisée pour ce portefeuille de créances.

RÉSUMÉ:
- Créances totales: ${debts.length}
- Créances en retard: ${overdueDebts.length}
- Créances critiques: ${criticalDebts.length}
- Montant total dû: ${formatCurrencyAmount(totalDebt, 'GNF')}
- Priorité suggérée: ${priority}

CRÉANCES PRIORITAIRES:
${overdueDebts.slice(0, 5).map(d => {
  const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
  return `- ${d.client.name}: ${formatCurrencyAmount(d.amount - d.paidAmount, d.currency)} (${daysOverdue}j retard, ${d.reminderCount} relances, prob: ${d.paymentProbability || '?' }%)`;
}).join('\n')}

Contexte Afrique de l'Ouest:
- Taux de recouvrement moyen: 60-70%
- Délai moyen de paiement: 15-45 jours après échéance
- WhatsApp très efficace (taux d'ouverture 70%+)
- Appels téléphoniques efficaces pour montants élevés

Génère une stratégie en JSON:
{
  "name": "Nom de la stratégie",
  "description": "Description courte",
  "priority": "urgent|high|medium|low",
  "actions": [
    {
      "order": 1,
      "type": "reminder|call|visit|legal|negotiation|escalation",
      "channel": "email|whatsapp|sms",
      "description": "Description de l'action",
      "timing": "Quand exécuter",
      "priority": "urgent|high|medium|low",
      "expectedOutcome": "Résultat attendu"
    }
  ],
  "expectedRecovery": <montant estimé>,
  "estimatedTimeframe": "délai estimé",
  "successProbability": <0-100>
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en stratégie de recouvrement de créances pour le marché africain. Réponds en JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        id: `strategy-${Date.now()}`,
        name: parsed.name || 'Stratégie de recouvrement',
        description: parsed.description || 'Stratégie générée par IA',
        priority: parsed.priority || priority,
        actions: (parsed.actions || []).map((a: CollectionAction, i: number) => ({
          ...a,
          order: a.order || i + 1
        })),
        expectedRecovery: parsed.expectedRecovery || totalDebt * 0.6,
        estimatedTimeframe: parsed.estimatedTimeframe || '30-60 jours',
        successProbability: parsed.successProbability || 60,
        totalDebt,
        debtCount: debts.length
      };
    }
  } catch (error) {
    console.error('Strategy generation error:', error);
  }
  
  // Fallback: generate rule-based strategy
  return generateFallbackStrategy(debts, totalDebt, priority);
}

// =====================================================
// OPTIMIZE REMINDER SEQUENCE
// =====================================================

export async function optimizeReminderSequence(clientId: string): Promise<ReminderSequence> {
  const zai = await getZAI();
  
  // Get client data
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      debts: {
        where: { status: { not: 'paid' } },
        take: 5
      }
    }
  });
  
  if (!client) {
    return getDefaultReminderSequence();
  }
  
  // Get payment pattern
  let paymentPattern: PaymentPattern | null = null;
  if (client.paymentPattern) {
    try {
      paymentPattern = JSON.parse(client.paymentPattern);
    } catch {
      // Use default
    }
  }
  
  // Determine preferred channel
  const preferredChannel = (client.preferredContactChannel as ContactChannel) || 'email';
  
  // Use AI to optimize sequence
  try {
    const prompt = `Optimise la séquence de relances pour ce client.

CLIENT:
- Nom: ${client.name}
- Entreprise: ${client.company || 'Particulier'}
- Canal préféré: ${preferredChannel}
- Score de risque: ${client.riskScore || 'Non calculé'}
- Niveau de risque: ${client.riskLevel || 'Non déterminé'}

PATTERN DE PAIEMENT:
${paymentPattern ? `- Type: ${paymentPattern.type}
- Délai moyen: ${paymentPattern.averageDelay} jours
- Consistance: ${paymentPattern.consistency}
- Tendance: ${paymentPattern.trend}` : 'Non disponible'}

CRÉANCES EN COURS: ${client.debts.length}

Contexte Afrique de l'Ouest:
- 1ère relance: 3-7 jours après échéance
- 2ème relance: 7-14 jours après
- 3ème relance: 14-21 jours après
- Ton adapté selon le type de client

Génère une séquence en JSON:
{
  "reminders": [
    {
      "step": 1,
      "daysAfterDue": 3,
      "channel": "email|whatsapp|sms",
      "tone": "formal|friendly|urgent",
      "template": "contenu suggéré",
      "expectedResponseRate": <0-100>
    }
  ],
  "optimalGap": <jours entre relances>,
  "channels": ["email", "whatsapp"],
  "tones": ["formal", "friendly", "urgent"]
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en optimisation de relances. Réponds en JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 600
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        reminders: parsed.reminders || getDefaultReminderSequence().reminders,
        optimalGap: parsed.optimalGap || 7,
        channels: parsed.channels || [preferredChannel],
        tones: parsed.tones || ['formal', 'friendly', 'urgent']
      };
    }
  } catch (error) {
    console.error('Sequence optimization error:', error);
  }
  
  // Fallback sequence based on client data
  return {
    reminders: [
      {
        step: 1,
        daysAfterDue: paymentPattern?.averageDelay && paymentPattern.averageDelay > 14 ? 3 : 5,
        channel: preferredChannel,
        tone: client.company ? 'formal' : 'friendly',
        template: 'Premier rappel - paiement en attente',
        expectedResponseRate: 45
      },
      {
        step: 2,
        daysAfterDue: paymentPattern?.averageDelay && paymentPattern.averageDelay > 14 ? 10 : 14,
        channel: preferredChannel,
        tone: 'formal',
        template: 'Deuxième rappel - échéance dépassée',
        expectedResponseRate: 30
      },
      {
        step: 3,
        daysAfterDue: paymentPattern?.averageDelay && paymentPattern.averageDelay > 14 ? 21 : 30,
        channel: 'whatsapp',
        tone: 'urgent',
        template: 'Dernière relance avant recouvrement',
        expectedResponseRate: 20
      }
    ],
    optimalGap: 7,
    channels: [preferredChannel, 'whatsapp'],
    tones: ['formal', 'friendly', 'urgent']
  };
}

// =====================================================
// SUGGEST NEGOTIATION TERMS
// =====================================================

export async function suggestNegotiationTerms(debt: DebtWithClientForStrategy): Promise<NegotiationTerms> {
  const zai = await getZAI();
  
  const remainingAmount = debt.amount - debt.paidAmount;
  const now = new Date();
  const daysOverdue = Math.ceil((now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24));
  
  // Use AI for negotiation terms
  try {
    const prompt = `Propose des conditions de négociation pour cette créance.

CRÉANCE:
- Montant initial: ${formatCurrencyAmount(debt.amount, debt.currency)}
- Déjà payé: ${formatCurrencyAmount(debt.paidAmount, debt.currency)}
- Reste à payer: ${formatCurrencyAmount(remainingAmount, debt.currency)}
- Jours de retard: ${daysOverdue}
- Relances envoyées: ${debt.reminderCount}
- Probabilité de paiement: ${debt.paymentProbability || 'Non calculée'}%

CLIENT:
- Nom: ${debt.client.name}
- Entreprise: ${debt.client.company || 'Particulier'}
- Score de risque: ${debt.client.riskScore || 'Non calculé'}

Contexte Afrique de l'Ouest:
- Remise acceptable: 5-15% pour règlement immédiat
- Échéanciers courants: 2-4 mensualités
- Acompte initial souvent demandé: 20-30%

Propose en JSON:
{
  "originalAmount": ${remainingAmount},
  "proposedSettlement": <montant proposé>,
  "paymentPlan": {
    "installments": <nombre>,
    "amountPerInstallment": <montant>,
    "frequency": "weekly|biweekly|monthly",
    "startDate": "date ISO"
  },
  "discountPercentage": <0-20>,
  "deadline": "date ISO pour accepter",
  "reasoning": "justification de la proposition"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en négociation de créances. Réponds en JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 400
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        originalAmount: remainingAmount,
        proposedSettlement: parsed.proposedSettlement || remainingAmount * 0.9,
        paymentPlan: parsed.paymentPlan ? {
          installments: parsed.paymentPlan.installments,
          amountPerInstallment: parsed.paymentPlan.amountPerInstallment,
          frequency: parsed.paymentPlan.frequency,
          startDate: new Date(parsed.paymentPlan.startDate)
        } : undefined,
        discountPercentage: parsed.discountPercentage,
        deadline: new Date(parsed.deadline || Date.now() + 7 * 24 * 60 * 60 * 1000),
        reasoning: parsed.reasoning || 'Proposition basée sur le profil du client'
      };
    }
  } catch (error) {
    console.error('Negotiation terms error:', error);
  }
  
  // Fallback negotiation terms
  const discount = daysOverdue > 60 ? 10 : daysOverdue > 30 ? 5 : 0;
  
  return {
    originalAmount: remainingAmount,
    proposedSettlement: remainingAmount * (1 - discount / 100),
    paymentPlan: remainingAmount > 500000 ? {
      installments: 3,
      amountPerInstallment: (remainingAmount * (1 - discount / 100)) / 3,
      frequency: 'monthly',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    } : undefined,
    discountPercentage: discount,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    reasoning: discount > 0 
      ? `Remise de ${discount}% proposée pour inciter au règlement rapide`
      : 'Pas de remise proposée - échéancier disponible'
  };
}

// =====================================================
// ESCALATION RECOMMENDATION
// =====================================================

export async function escalationRecommendation(debt: DebtWithClientForStrategy): Promise<EscalationRecommendation> {
  const zai = await getZAI();
  
  const now = new Date();
  const daysOverdue = Math.ceil((now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24));
  const remainingAmount = debt.amount - debt.paidAmount;
  
  // Quick rule-based check
  if (debt.reminderCount < 3) {
    return {
      shouldEscalate: false,
      level: 'internal',
      reason: 'Pas assez de relances envoyées',
      prerequisites: ['Envoyer au moins 3 relances'],
      estimatedCost: 0,
      expectedOutcome: 'Continuer les relances standard',
      timeframe: 'N/A'
    };
  }
  
  // Use AI for detailed recommendation
  try {
    const prompt = `Recommande une escalade pour cette créance.

CRÉANCE:
- Montant: ${formatCurrencyAmount(remainingAmount, debt.currency)}
- Jours de retard: ${daysOverdue}
- Relances: ${debt.reminderCount}
- Probabilité de paiement: ${debt.paymentProbability || 'Non calculée'}%

CLIENT:
- Nom: ${debt.client.name}
- Score de risque: ${debt.client.riskScore || 'Non calculé'}
- Niveau de risque: ${debt.client.riskLevel || 'Non déterminé'}

Critères d'escalade Afrique de l'Ouest:
- Interne: relances internes échouées
- Externe: > 60 jours, > 3 relances
- Légal: > 90 jours, montant élevé, client injoignable

Réponds en JSON:
{
  "shouldEscalate": true|false,
  "level": "internal|external|legal",
  "reason": "raison",
  "prerequisites": ["condition1", "condition2"],
  "estimatedCost": <montant estimé>,
  "expectedOutcome": "résultat attendu",
  "timeframe": "délai estimé"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en recouvrement de créances. Réponds en JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        shouldEscalate: parsed.shouldEscalate ?? (daysOverdue > 60 && debt.reminderCount >= 3),
        level: parsed.level || (daysOverdue > 90 ? 'legal' : daysOverdue > 60 ? 'external' : 'internal'),
        reason: parsed.reason || 'Basé sur le profil de risque',
        prerequisites: parsed.prerequisites || [],
        estimatedCost: parsed.estimatedCost || remainingAmount * 0.1,
        expectedOutcome: parsed.expectedOutcome || 'Récupération partielle',
        timeframe: parsed.timeframe || '30-60 jours'
      };
    }
  } catch (error) {
    console.error('Escalation recommendation error:', error);
  }
  
  // Fallback logic
  if (daysOverdue > 90 && debt.reminderCount >= 3 && remainingAmount > 1000000) {
    return {
      shouldEscalate: true,
      level: 'legal',
      reason: 'Retard critique avec plusieurs relances sans réponse',
      prerequisites: ['Documentation complète', 'Preuves de relances'],
      estimatedCost: remainingAmount * 0.15,
      expectedOutcome: 'Procédure judiciaire ou recouvrement forcé',
      timeframe: '60-90 jours'
    };
  }
  
  if (daysOverdue > 60 && debt.reminderCount >= 3) {
    return {
      shouldEscalate: true,
      level: 'external',
      reason: 'Relances internes inefficaces',
      prerequisites: ['Accord du client', 'Dossier complet'],
      estimatedCost: remainingAmount * 0.1,
      expectedOutcome: 'Recouvrement professionnel',
      timeframe: '30-45 jours'
    };
  }
  
  return {
    shouldEscalate: false,
    level: 'internal',
    reason: 'Poursuivre les relances internes',
    prerequisites: [],
    estimatedCost: 0,
    expectedOutcome: 'Réponse client attendue',
    timeframe: '7-14 jours'
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getDefaultReminderSequence(): ReminderSequence {
  return {
    reminders: [
      {
        step: 1,
        daysAfterDue: 5,
        channel: 'email',
        tone: 'friendly',
        template: 'Premier rappel amical',
        expectedResponseRate: 45
      },
      {
        step: 2,
        daysAfterDue: 14,
        channel: 'whatsapp',
        tone: 'formal',
        template: 'Deuxième rappel',
        expectedResponseRate: 30
      },
      {
        step: 3,
        daysAfterDue: 30,
        channel: 'whatsapp',
        tone: 'urgent',
        template: 'Dernière relance',
        expectedResponseRate: 15
      }
    ],
    optimalGap: 7,
    channels: ['email', 'whatsapp'],
    tones: ['formal', 'friendly', 'urgent']
  };
}

function generateFallbackStrategy(
  debts: DebtWithClientForStrategy[],
  totalDebt: number,
  priority: CollectionStrategy['priority']
): CollectionStrategy {
  const now = new Date();
  const actions: CollectionAction[] = [];
  let actionOrder = 1;
  
  // Get overdue debts sorted by priority
  const overdueDebts = debts
    .filter(d => {
      const dueDate = new Date(d.dueDate);
      return dueDate < now && d.status !== 'paid';
    })
    .sort((a, b) => {
      // Sort by days overdue descending
      const daysA = Math.ceil((now.getTime() - new Date(a.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const daysB = Math.ceil((now.getTime() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return daysB - daysA;
    });
  
  // Add urgent actions for critical debts
  const criticalDebts = overdueDebts.filter(d => {
    const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 60;
  });
  
  for (const debt of criticalDebts.slice(0, 3)) {
    actions.push({
      order: actionOrder++,
      type: 'call',
      channel: 'whatsapp',
      description: `Appeler ${debt.client.name} pour ${formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency)}`,
      timing: 'Immédiat',
      priority: 'urgent',
      debtId: debt.id,
      clientId: debt.clientId,
      expectedOutcome: 'Engagement de paiement'
    });
  }
  
  // Add batch reminder action
  if (overdueDebts.length > 3) {
    actions.push({
      order: actionOrder++,
      type: 'reminder',
      channel: 'whatsapp',
      description: `Envoyer des relances groupées aux ${overdueDebts.length} clients en retard`,
      timing: 'Dans les 24h',
      priority: 'high',
      expectedOutcome: 'Taux de réponse 30-40%'
    });
  }
  
  // Add negotiation actions for partial payments
  const partialPayments = overdueDebts.filter(d => d.paidAmount > 0);
  if (partialPayments.length > 0) {
    actions.push({
      order: actionOrder++,
      type: 'negotiation',
      description: `Proposer des échéanciers aux ${partialPayments.length} clients avec paiements partiels`,
      timing: 'Cette semaine',
      priority: 'medium',
      expectedOutcome: 'Finalisation des paiements'
    });
  }
  
  // Add escalation for very old debts
  const veryOldDebts = overdueDebts.filter(d => {
    const daysOverdue = Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 90 && d.reminderCount >= 3;
  });
  
  if (veryOldDebts.length > 0) {
    actions.push({
      order: actionOrder++,
      type: 'escalation',
      description: `Transférer ${veryOldDebts.length} dossiers au recouvrement externe`,
      timing: 'Sous 7 jours',
      priority: 'high',
      expectedOutcome: 'Récupération partielle'
    });
  }
  
  return {
    id: `strategy-${Date.now()}`,
    name: 'Stratégie de recouvrement optimisée',
    description: `Plan d'action pour ${debts.length} créances totalisant ${formatCurrencyAmount(totalDebt, 'GNF')}`,
    priority,
    actions,
    expectedRecovery: totalDebt * 0.6,
    estimatedTimeframe: '30-60 jours',
    successProbability: 60,
    totalDebt,
    debtCount: debts.length
  };
}

// =====================================================
// GET STRATEGY FOR CLIENT
// =====================================================

export async function getStrategyForClient(clientId: string): Promise<CollectionAction[]> {
  const debts = await db.debt.findMany({
    where: { 
      clientId,
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
    return [];
  }
  
  const debtWithClient: DebtWithClientForStrategy[] = debts.map(d => ({
    ...d,
    client: d.client
  }));
  
  const strategy = await generateCollectionStrategy(debtWithClient, debts[0].profileId);
  
  return strategy.actions.map(action => ({
    ...action,
    clientId
  }));
}
