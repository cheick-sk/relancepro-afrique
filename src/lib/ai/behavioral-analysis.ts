// Librairie d'analyse comportementale - RelancePro Africa
// Utilise z-ai-web-dev-sdk pour l'analyse des patterns de comportement

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// =====================================================
// TYPES
// =====================================================

export type ContactChannel = 'email' | 'whatsapp' | 'sms';

export interface PaymentPattern {
  type: 'early' | 'on_time' | 'late' | 'very_late' | 'non_payer';
  averageDelay: number; // jours après échéance
  consistency: 'consistent' | 'variable' | 'unpredictable';
  trend: 'improving' | 'stable' | 'worsening';
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  preferredPaymentMethod?: string;
  partialPaymentRate: number; // % of times partial payment was made
}

export interface PaymentPatternAnalysis {
  pattern: PaymentPattern;
  behaviors: BehaviorObservation[];
  predictions: PatternPrediction[];
  recommendations: string[];
}

export interface BehaviorObservation {
  type: 'response_time' | 'payment_timing' | 'channel_preference' | 'amount_pattern';
  description: string;
  frequency: 'always' | 'often' | 'sometimes' | 'rarely';
  lastObserved: Date;
}

export interface PatternPrediction {
  type: string;
  description: string;
  confidence: number;
  timeframe: string;
}

export interface AnomalyDetection {
  detected: boolean;
  anomalies: Anomaly[];
  severity: 'low' | 'medium' | 'high';
  requiresAttention: boolean;
}

export interface Anomaly {
  type: 'unusual_delay' | 'missing_response' | 'payment_drop' | 'communication_change' | 'amount_change';
  description: string;
  detectedAt: Date;
  deviation: number; // % from normal
  suggestedAction: string;
}

export interface OptimalContactTime {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (Sunday = 0)
  confidence: number;
  reasoning: string;
  responseRate: number;
}

export interface ChannelPreference {
  primary: ContactChannel;
  secondary: ContactChannel | null;
  responseRates: Record<ContactChannel, number>;
  reasoning: string;
  lastUpdated: Date;
}

export interface ClientActivity {
  reminders: Array<{
    type: string;
    sentAt: Date;
    status: string;
    responseReceived: boolean;
    respondedAt: Date | null;
  }>;
  payments: Array<{
    amount: number;
    paidAt: Date;
    method: string | null;
  }>;
  communications: Array<{
    channel: string;
    direction: 'inbound' | 'outbound';
    timestamp: Date;
  }>;
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
// ANALYZE PAYMENT PATTERNS
// =====================================================

export async function analyzePaymentPatterns(clientId: string): Promise<PaymentPatternAnalysis> {
  const zai = await getZAI();
  
  // Get client's payment history
  const debts = await db.debt.findMany({
    where: { clientId },
    select: {
      amount: true,
      paidAmount: true,
      dueDate: true,
      paidDate: true,
      status: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  const reminders = await db.reminder.findMany({
    where: { clientId },
    select: {
      type: true,
      sentAt: true,
      status: true,
      responseReceived: true,
      respondedAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  // Calculate base metrics
  const paidDebts = debts.filter(d => d.status === 'paid' && d.paidDate);
  const delays = paidDebts.map(d => {
    const dueDate = new Date(d.dueDate);
    const paidDate = new Date(d.paidDate!);
    return Math.ceil((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  });
  
  const avgDelay = delays.length > 0 
    ? delays.reduce((sum, d) => sum + d, 0) / delays.length 
    : 0;
  
  const partialPayments = debts.filter(d => d.paidAmount > 0 && d.paidAmount < d.amount);
  const partialRate = debts.length > 0 ? (partialPayments.length / debts.length) * 100 : 0;
  
  // Determine pattern type
  let patternType: PaymentPattern['type'];
  if (avgDelay < 0) {
    patternType = 'early';
  } else if (avgDelay <= 7) {
    patternType = 'on_time';
  } else if (avgDelay <= 30) {
    patternType = 'late';
  } else if (avgDelay <= 60) {
    patternType = 'very_late';
  } else {
    patternType = 'non_payer';
  }
  
  // Calculate consistency
  const delayVariance = delays.length > 1 
    ? delays.reduce((sum, d) => sum + Math.pow(d - avgDelay, 2), 0) / delays.length 
    : 0;
  
  let consistency: PaymentPattern['consistency'];
  if (delayVariance < 100) {
    consistency = 'consistent';
  } else if (delayVariance < 400) {
    consistency = 'variable';
  } else {
    consistency = 'unpredictable';
  }
  
  // Use AI for deeper analysis
  try {
    const prompt = `Analyse les patterns de paiement de ce client.

DONNÉES PAIEMENT:
- Créances totales: ${debts.length}
- Créances payées: ${paidDebts.length}
- Délai moyen: ${avgDelay.toFixed(0)} jours
- Variance des délais: ${delayVariance.toFixed(0)}
- Paiements partiels: ${partialRate.toFixed(0)}%

HISTORIQUE DÉTAILLÉ:
${paidDebts.slice(0, 10).map((d, i) => {
  const delay = delays[i] || 0;
  return `- ${new Date(d.paidDate!).toLocaleDateString('fr-FR')}: ${delay > 0 ? `+${delay}j` : `${delay}j`} (${d.paidAmount}/${d.amount})`;
}).join('\n')}

RÉPONSES AUX RELANCES:
- Total relances: ${reminders.length}
- Réponses reçues: ${reminders.filter(r => r.responseReceived).length}
- Taux de réponse: ${reminders.length > 0 ? ((reminders.filter(r => r.responseReceived).length / reminders.length) * 100).toFixed(0) : 0}%

Analyse en JSON:
{
  "pattern": {
    "type": "early|on_time|late|very_late|non_payer",
    "averageDelay": <nombre>,
    "consistency": "consistent|variable|unpredictable",
    "trend": "improving|stable|worsening",
    "paymentFrequency": "weekly|biweekly|monthly|irregular",
    "partialPaymentRate": <nombre>
  },
  "behaviors": [
    {
      "type": "response_time|payment_timing|channel_preference|amount_pattern",
      "description": "description",
      "frequency": "always|often|sometimes|rarely",
      "lastObserved": "date ISO"
    }
  ],
  "predictions": [
    {
      "type": "prochain_paiement|delai_estime",
      "description": "description",
      "confidence": <0-100>,
      "timeframe": "délai"
    }
  ],
  "recommendations": ["recommandation1", "recommandation2"]
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en analyse comportementale de paiement. Réponds en JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 700
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        pattern: {
          type: parsed.pattern?.type || patternType,
          averageDelay: parsed.pattern?.averageDelay || avgDelay,
          consistency: parsed.pattern?.consistency || consistency,
          trend: parsed.pattern?.trend || 'stable',
          paymentFrequency: parsed.pattern?.paymentFrequency || 'irregular',
          partialPaymentRate: parsed.pattern?.partialPaymentRate || partialRate
        },
        behaviors: (parsed.behaviors || []).map((b: BehaviorObservation) => ({
          ...b,
          lastObserved: new Date()
        })),
        predictions: parsed.predictions || [],
        recommendations: parsed.recommendations || []
      };
    }
  } catch (error) {
    console.error('Pattern analysis error:', error);
  }
  
  // Fallback result
  return {
    pattern: {
      type: patternType,
      averageDelay: avgDelay,
      consistency,
      trend: 'stable',
      paymentFrequency: 'irregular',
      partialPaymentRate: partialRate
    },
    behaviors: [],
    predictions: [],
    recommendations: generatePatternRecommendations(patternType, avgDelay, consistency)
  };
}

// =====================================================
// DETECT ANOMALIES
// =====================================================

export async function detectAnomalies(
  clientId: string,
  recentActivity: ClientActivity
): Promise<AnomalyDetection> {
  const zai = await getZAI();
  
  const anomalies: Anomaly[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';
  
  // Get historical data for comparison
  const historicalReminders = await db.reminder.findMany({
    where: { 
      clientId,
      createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    select: {
      status: true,
      responseReceived: true,
      respondedAt: true
    }
  });
  
  // Calculate baseline response rate
  const historicalResponseRate = historicalReminders.length > 0
    ? historicalReminders.filter(r => r.responseReceived).length / historicalReminders.length
    : 0.4; // Default 40%
  
  // Check recent response rate
  const recentResponses = recentActivity.reminders.filter(r => r.responseReceived);
  const recentResponseRate = recentActivity.reminders.length > 0
    ? recentResponses.length / recentActivity.reminders.length
    : 0;
  
  // Detect response rate drop
  if (historicalResponseRate > 0.2 && recentResponseRate < historicalResponseRate * 0.5) {
    anomalies.push({
      type: 'missing_response',
      description: `Baisse significative du taux de réponse (${(recentResponseRate * 100).toFixed(0)}% vs ${(historicalResponseRate * 100).toFixed(0)}% habituellement)`,
      detectedAt: new Date(),
      deviation: ((historicalResponseRate - recentResponseRate) / historicalResponseRate) * 100,
      suggestedAction: 'Vérifier les coordonnées et essayer un autre canal'
    });
    severity = 'medium';
  }
  
  // Check payment drop
  const recentPayments = recentActivity.payments.filter(p => 
    new Date(p.paidAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  const olderPayments = await db.clientPayment.findMany({
    where: {
      clientId,
      paidAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  });
  
  if (olderPayments.length > 2 && recentPayments.length === 0) {
    anomalies.push({
      type: 'payment_drop',
      description: 'Aucun paiement au cours des 30 derniers jours',
      detectedAt: new Date(),
      deviation: 100,
      suggestedAction: 'Contacter d\'urgence pour comprendre la situation'
    });
    severity = 'high';
  }
  
  // Use AI for advanced anomaly detection
  if (anomalies.length === 0) {
    try {
      const prompt = `Détecte les anomalies dans le comportement récent de ce client.

ACTIVITÉ RÉCENTE (30 jours):
- Relances envoyées: ${recentActivity.reminders.length}
- Réponses reçues: ${recentActivity.reminders.filter(r => r.responseReceived).length}
- Paiements: ${recentActivity.payments.length}
- Communications: ${recentActivity.communications.length}

HISTORIQUE (90 jours):
- Relances: ${historicalReminders.length}
- Taux de réponse historique: ${(historicalResponseRate * 100).toFixed(0)}%
- Paiements antérieurs: ${olderPayments.length}

Identifie toute anomalie en JSON:
{
  "anomalies": [
    {
      "type": "unusual_delay|missing_response|payment_drop|communication_change|amount_change",
      "description": "description",
      "severity": "low|medium|high",
      "suggestedAction": "action suggérée"
    }
  ]
}

Si aucune anomalie, retourne {"anomalies": []}`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Tu es un expert en détection d\'anomalies comportementales. Réponds en JSON.' },
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
        
        if (parsed.anomalies && parsed.anomalies.length > 0) {
          for (const a of parsed.anomalies) {
            anomalies.push({
              type: a.type,
              description: a.description,
              detectedAt: new Date(),
              deviation: 50,
              suggestedAction: a.suggestedAction
            });
            if (a.severity === 'high') severity = 'high';
            else if (a.severity === 'medium' && severity !== 'high') severity = 'medium';
          }
        }
      }
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }
  }
  
  return {
    detected: anomalies.length > 0,
    anomalies,
    severity,
    requiresAttention: severity === 'high' || anomalies.length > 1
  };
}

// =====================================================
// GET OPTIMAL REMINDER TIME
// =====================================================

export async function getOptimalReminderTime(clientId: string): Promise<OptimalContactTime> {
  const zai = await getZAI();
  
  // Get historical response times
  const reminders = await db.reminder.findMany({
    where: { 
      clientId,
      responseReceived: true,
      respondedAt: { not: null }
    },
    select: {
      sentAt: true,
      respondedAt: true
    }
  });
  
  if (reminders.length < 3) {
    // Not enough data, return default optimal time
    return {
      hour: 9,
      dayOfWeek: 2, // Tuesday
      confidence: 30,
      reasoning: 'Données insuffisantes. Heure optimale estimée basée sur les patterns régionaux.',
      responseRate: 35
    };
  }
  
  // Calculate response times by hour and day
  const hourResponses: Record<number, number[]> = {};
  const dayResponses: Record<number, number[]> = {};
  
  for (const reminder of reminders) {
    const sentAt = new Date(reminder.sentAt);
    const respondedAt = new Date(reminder.respondedAt!);
    const responseTime = (respondedAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60); // hours
    
    const hour = sentAt.getHours();
    const day = sentAt.getDay();
    
    if (!hourResponses[hour]) hourResponses[hour] = [];
    hourResponses[hour].push(responseTime);
    
    if (!dayResponses[day]) dayResponses[day] = [];
    dayResponses[day].push(responseTime);
  }
  
  // Find best hour (lowest average response time)
  let bestHour = 9;
  let bestHourResponseTime = Infinity;
  
  for (const [hour, times] of Object.entries(hourResponses)) {
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    if (avgTime < bestHourResponseTime) {
      bestHourResponseTime = avgTime;
      bestHour = parseInt(hour);
    }
  }
  
  // Find best day
  let bestDay = 2; // Tuesday
  let bestDayResponseTime = Infinity;
  
  for (const [day, times] of Object.entries(dayResponses)) {
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    if (avgTime < bestDayResponseTime) {
      bestDayResponseTime = avgTime;
      bestDay = parseInt(day);
    }
  }
  
  // Use AI to refine
  try {
    const prompt = `Détermine l'heure optimale pour contacter ce client.

DONNÉES:
- Réponses analysées: ${reminders.length}
- Meilleure heure: ${bestHour}h
- Meilleur jour: ${['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][bestDay]}
- Temps de réponse moyen: ${bestHourResponseTime.toFixed(1)}h

Patterns régionaux Afrique de l'Ouest:
- Meilleures heures: 9h-11h, 14h-16h
- Meilleurs jours: Mardi, Mercredi, Jeudi
- À éviter: Vendredi après-midi, Weekends

Réponds en JSON:
{
  "hour": <0-23>,
  "dayOfWeek": <0-6>,
  "confidence": <0-100>,
  "reasoning": "explication courte",
  "responseRate": <taux de réponse estimé>
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en optimisation de communications. Réponds en JSON.' },
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
      
      return {
        hour: parsed.hour || bestHour,
        dayOfWeek: parsed.dayOfWeek || bestDay,
        confidence: parsed.confidence || 60,
        reasoning: parsed.reasoning || 'Basé sur l\'historique de réponse',
        responseRate: parsed.responseRate || 40
      };
    }
  } catch (error) {
    console.error('Optimal time error:', error);
  }
  
  const confidence = Math.min(90, 40 + reminders.length * 5);
  
  return {
    hour: bestHour,
    dayOfWeek: bestDay,
    confidence,
    reasoning: 'Basé sur les temps de réponse historiques',
    responseRate: Math.round(100 / (bestHourResponseTime + 1))
  };
}

// =====================================================
// GET PREFERRED CHANNEL
// =====================================================

export async function getPreferredChannel(clientId: string): Promise<ChannelPreference> {
  const zai = await getZAI();
  
  // Get response rates by channel
  const reminders = await db.reminder.findMany({
    where: { clientId },
    select: {
      type: true,
      status: true,
      responseReceived: true
    }
  });
  
  const channelStats: Record<ContactChannel, { sent: number; responded: number }> = {
    email: { sent: 0, responded: 0 },
    whatsapp: { sent: 0, responded: 0 },
    sms: { sent: 0, responded: 0 }
  };
  
  for (const reminder of reminders) {
    const channel = reminder.type as ContactChannel;
    if (channelStats[channel]) {
      channelStats[channel].sent++;
      if (reminder.responseReceived) {
        channelStats[channel].responded++;
      }
    }
  }
  
  // Calculate response rates
  const responseRates: Record<ContactChannel, number> = {
    email: channelStats.email.sent > 0 
      ? (channelStats.email.responded / channelStats.email.sent) * 100 
      : 0,
    whatsapp: channelStats.whatsapp.sent > 0 
      ? (channelStats.whatsapp.responded / channelStats.whatsapp.sent) * 100 
      : 0,
    sms: channelStats.sms.sent > 0 
      ? (channelStats.sms.responded / channelStats.sms.sent) * 100 
      : 0
  };
  
  // Determine primary channel
  let primary: ContactChannel = 'email';
  let bestRate = 0;
  
  for (const [channel, rate] of Object.entries(responseRates)) {
    if (rate > bestRate) {
      bestRate = rate;
      primary = channel as ContactChannel;
    }
  }
  
  // Determine secondary
  let secondary: ContactChannel | null = null;
  let secondRate = 0;
  
  for (const [channel, rate] of Object.entries(responseRates)) {
    if (channel !== primary && rate > secondRate) {
      secondRate = rate;
      secondary = channel as ContactChannel;
    }
  }
  
  // If no data, use AI to predict based on client profile
  if (reminders.length < 5) {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { email: true, phone: true, company: true }
    });
    
    if (client) {
      // Prefer WhatsApp if phone available (popular in Africa)
      if (client.phone && !client.email) {
        primary = 'whatsapp';
        secondary = 'sms';
      } else if (client.phone && client.email) {
        primary = 'whatsapp';
        secondary = 'email';
      }
    }
  }
  
  // Use AI to refine preference
  try {
    const prompt = `Détermine le canal de contact préféré pour ce client.

STATISTIQUES PAR CANAL:
- Email: ${channelStats.email.sent} envoyés, ${responseRates.email.toFixed(0)}% de réponse
- WhatsApp: ${channelStats.whatsapp.sent} envoyés, ${responseRates.whatsapp.toFixed(0)}% de réponse
- SMS: ${channelStats.sms.sent} envoyés, ${responseRates.sms.toFixed(0)}% de réponse

Contexte Afrique de l'Ouest:
- WhatsApp: Très populaire (60-70% de préférence)
- Email: Utilisé pour affaires formelles (20-30%)
- SMS: Moins utilisé mais efficace (10-15%)

Réponds en JSON:
{
  "primary": "email|whatsapp|sms",
  "secondary": "email|whatsapp|sms|null",
  "reasoning": "explication courte"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en communication client. Réponds en JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        primary: parsed.primary || primary,
        secondary: parsed.secondary || secondary,
        responseRates,
        reasoning: parsed.reasoning || 'Basé sur les taux de réponse',
        lastUpdated: new Date()
      };
    }
  } catch (error) {
    console.error('Channel preference error:', error);
  }
  
  return {
    primary,
    secondary,
    responseRates,
    reasoning: 'Basé sur l\'historique des relances',
    lastUpdated: new Date()
  };
}

// =====================================================
// UPDATE CLIENT BEHAVIORAL DATA
// =====================================================

export async function updateClientBehavioralData(
  clientId: string,
  pattern: PaymentPattern,
  preferredChannel: ContactChannel,
  optimalTime: string
): Promise<void> {
  try {
    await db.client.update({
      where: { id: clientId },
      data: {
        paymentPattern: JSON.stringify(pattern),
        preferredContactChannel: preferredChannel,
        optimalContactTime: optimalTime
      }
    });
  } catch (error) {
    console.error('Error updating behavioral data:', error);
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function generatePatternRecommendations(
  patternType: PaymentPattern['type'],
  avgDelay: number,
  consistency: PaymentPattern['consistency']
): string[] {
  const recommendations: string[] = [];
  
  switch (patternType) {
    case 'early':
      recommendations.push('Ce client paie souvent en avance - valoriser cette relation');
      recommendations.push('Proposer des conditions préférentielles');
      break;
    case 'on_time':
      recommendations.push('Client fiable - maintenir le suivi standard');
      break;
    case 'late':
      recommendations.push('Envoyer les relances plus tôt');
      recommendations.push('Proposer des échéanciers de paiement');
      break;
    case 'very_late':
      recommendations.push('Intensifier les relances');
      recommendations.push('Contacter par téléphone');
      recommendations.push('Envisager des mesures de recouvrement');
      break;
    case 'non_payer':
      recommendations.push('Risque de perte - action immédiate requise');
      recommendations.push('Transférer au recouvrement externe');
      break;
  }
  
  if (consistency === 'unpredictable') {
    recommendations.push('Comportement variable - surveiller de près');
  }
  
  return recommendations;
}
