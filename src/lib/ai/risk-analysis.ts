// Librairie d'analyse de risque - RelancePro Africa
// Utilise z-ai-web-dev-sdk pour l'analyse de risque avancée

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { formatCurrencyAmount } from '@/lib/config';

// =====================================================
// TYPES
// =====================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskAnalysisResult {
  score: number; // 0-100
  level: RiskLevel;
  factors: RiskFactor[];
  insights: string[];
  recommendations: string[];
  trend: 'improving' | 'stable' | 'worsening';
  trendData?: RiskTrendPoint[];
}

export interface RiskFactor {
  category: 'payment' | 'communication' | 'history' | 'external';
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  description: string;
  weight: number;
}

export interface RiskTrendPoint {
  date: Date;
  score: number;
  level: RiskLevel;
}

export interface RiskMitigationSuggestion {
  priority: 'high' | 'medium' | 'low';
  action: string;
  description: string;
  expectedImpact: string;
  timeframe: string;
}

export interface ClientWithDebts {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  riskScore: number | null;
  riskLevel: string | null;
  paymentPattern: string | null;
  debts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    paidAmount: number;
    dueDate: Date;
    paidDate: Date | null;
    reminderCount: number;
    lastReminderAt: Date | null;
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
// ANALYZE CLIENT RISK
// =====================================================

export async function analyzeClientRisk(
  client: ClientWithDebts,
  debts: ClientWithDebts['debts']
): Promise<RiskAnalysisResult> {
  const zai = await getZAI();
  
  // Calculate base metrics
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const paymentRate = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
  
  const now = new Date();
  const overdueDebts = debts.filter(d => {
    const dueDate = new Date(d.dueDate);
    return dueDate < now && d.status !== 'paid';
  });
  
  const avgDaysOverdue = overdueDebts.length > 0 
    ? overdueDebts.reduce((sum, d) => {
        return sum + Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / overdueDebts.length
    : 0;
  
  const totalReminders = debts.reduce((sum, d) => sum + d.reminderCount, 0);
  
  // Get trend data
  const trend = await calculateRiskTrend(client.id);
  
  // Use AI for comprehensive analysis
  try {
    const prompt = `Effectue une analyse de risque complète pour ce client.

CLIENT:
- Nom: ${client.name}
- Entreprise: ${client.company || 'Particulier'}
- Email: ${client.email || 'Non fourni'}
- Téléphone: ${client.phone || 'Non fourni'}
- Statut: ${client.status}

CRÉANCES:
- Nombre total: ${debts.length}
- En retard: ${overdueDebts.length}
- Montant total: ${formatCurrencyAmount(totalDebt, 'GNF')}
- Montant payé: ${formatCurrencyAmount(totalPaid, 'GNF')}
- Taux de paiement: ${paymentRate.toFixed(1)}%
- Relances totales: ${totalReminders}
- Retard moyen: ${avgDaysOverdue.toFixed(0)} jours

HISTORIQUE TENDANCE:
${trend.trendData ? trend.trendData.slice(-5).map(t => 
  `- ${new Date(t.date).toLocaleDateString('fr-FR')}: Score ${t.score} (${t.level})`
).join('\n') : 'Pas assez de données'}

Contexte Afrique de l'Ouest:
- Délai de paiement moyen: 15-45 jours
- Taux de recouvrement moyen: 60-70%
- Réponse aux relances: 35-45%

Fournis une analyse en JSON:
{
  "score": <nombre 0-100>,
  "level": "low|medium|high|critical",
  "factors": [
    {
      "category": "payment|communication|history|external",
      "name": "nom",
      "impact": "positive|negative|neutral",
      "severity": "low|medium|high",
      "description": "explication",
      "weight": <nombre 0-1>
    }
  ],
  "insights": ["analyse1", "analyse2"],
  "recommendations": ["recommandation1", "recommandation2"]
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'Tu es un expert en analyse de risque de crédit pour le marché africain. Réponds toujours en JSON valide.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        score: Math.max(0, Math.min(100, parsed.score || 50)),
        level: parsed.level || 'medium',
        factors: parsed.factors || [],
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        trend: trend.trend,
        trendData: trend.trendData
      };
    }
  } catch (error) {
    console.error('Risk analysis error:', error);
  }
  
  // Fallback to rule-based analysis
  return calculateRuleBasedRisk(client, debts, trend);
}

// =====================================================
// CALCULATE RISK TREND
// =====================================================

export async function calculateRiskTrend(clientId: string): Promise<{
  trend: 'improving' | 'stable' | 'worsening';
  trendData: RiskTrendPoint[];
}> {
  // Get historical risk data from audit logs or client updates
  const auditLogs = await db.auditLog.findMany({
    where: {
      entityType: 'Client',
      entityId: clientId,
      action: 'client_update'
    },
    select: {
      createdAt: true,
      oldValue: true,
      newValue: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  const trendData: RiskTrendPoint[] = [];
  
  // Extract risk scores from audit logs
  for (const log of auditLogs.reverse()) {
    try {
      const newValue = log.newValue ? JSON.parse(log.newValue) : null;
      if (newValue?.riskScore !== undefined) {
        trendData.push({
          date: log.createdAt,
          score: newValue.riskScore,
          level: scoreToLevel(newValue.riskScore)
        });
      }
    } catch {
      // Skip invalid entries
    }
  }
  
  // Add current state
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { riskScore: true }
  });
  
  if (client?.riskScore !== null && client?.riskScore !== undefined) {
    trendData.push({
      date: new Date(),
      score: client.riskScore,
      level: scoreToLevel(client.riskScore)
    });
  }
  
  // Determine trend
  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  
  if (trendData.length >= 2) {
    const recent = trendData.slice(-3);
    const avgRecent = recent.reduce((sum, t) => sum + t.score, 0) / recent.length;
    const older = trendData.slice(0, -3);
    
    if (older.length > 0) {
      const avgOlder = older.reduce((sum, t) => sum + t.score, 0) / older.length;
      const diff = avgOlder - avgRecent; // Lower score = better
      
      if (diff > 10) {
        trend = 'improving';
      } else if (diff < -10) {
        trend = 'worsening';
      }
    }
  }
  
  return { trend, trendData };
}

// =====================================================
// GET RISK MITIGATION SUGGESTIONS
// =====================================================

export async function getRiskMitigationSuggestions(
  riskLevel: RiskLevel,
  clientData?: ClientWithDebts
): Promise<RiskMitigationSuggestion[]> {
  const zai = await getZAI();
  
  // Predefined suggestions by risk level
  const suggestionsByLevel: Record<RiskLevel, RiskMitigationSuggestion[]> = {
    low: [
      {
        priority: 'low',
        action: 'Maintenir le suivi régulier',
        description: 'Le client présente un faible risque. Continuer les pratiques actuelles.',
        expectedImpact: 'Maintien du bon comportement de paiement',
        timeframe: 'Continu'
      },
      {
        priority: 'low',
        action: 'Proposer des facilités de paiement',
        description: 'Offrir des options de paiement flexibles pour fidéliser ce bon client.',
        expectedImpact: 'Renforcement de la relation commerciale',
        timeframe: 'Prochaine créance'
      }
    ],
    medium: [
      {
        priority: 'medium',
        action: 'Intensifier les relances',
        description: 'Augmenter la fréquence des relances et utiliser plusieurs canaux.',
        expectedImpact: 'Augmentation du taux de réponse de 20%',
        timeframe: 'Immédiat'
      },
      {
        priority: 'medium',
        action: 'Proposer un échéancier',
        description: 'Négocier un plan de paiement adapté aux capacités du client.',
        expectedImpact: 'Paiement progressif garanti',
        timeframe: 'Sous 7 jours'
      },
      {
        priority: 'low',
        action: 'Vérifier les coordonnées',
        description: 'S\'assurer que les contacts sont à jour.',
        expectedImpact: 'Amélioration du taux de contact',
        timeframe: 'Immédiat'
      }
    ],
    high: [
      {
        priority: 'high',
        action: 'Contacter par téléphone',
        description: 'Appel direct pour comprendre les difficultés et négocier.',
        expectedImpact: 'Obtention d\'un engagement de paiement',
        timeframe: 'Sous 48h'
      },
      {
        priority: 'high',
        action: 'Menacer de recouvrement externe',
        description: 'Informer le client des conséquences en cas de non-paiement.',
        expectedImpact: 'Prise de conscience du client',
        timeframe: 'Prochaine relance'
      },
      {
        priority: 'medium',
        action: 'Exiger un acompte',
        description: 'Pour les nouvelles créances, exiger un paiement anticipé.',
        expectedImpact: 'Réduction du risque futur',
        timeframe: 'Dès maintenant'
      }
    ],
    critical: [
      {
        priority: 'high',
        action: 'Transférer au recouvrement',
        description: 'Confier le dossier à un professionnel du recouvrement.',
        expectedImpact: 'Récupération partielle ou totale',
        timeframe: 'Sous 7 jours'
      },
      {
        priority: 'high',
        action: 'Envoyer une mise en demeure',
        description: 'Notification formelle avec menace de poursuites.',
        expectedImpact: 'Dernière chance de règlement amiable',
        timeframe: 'Immédiat'
      },
      {
        priority: 'high',
        action: 'Blacklister le client',
        description: 'Ne plus accorder de crédit à ce client.',
        expectedImpact: 'Protection contre les nouvelles créances douteuses',
        timeframe: 'Immédiat'
      }
    ]
  };
  
  // If we have client data, use AI to personalize suggestions
  if (clientData) {
    try {
      const prompt = `Génère des suggestions de mitigation de risque personnalisées pour ce client.

CLIENT: ${clientData.name}
NIVEAU DE RISQUE: ${riskLevel}
ENTREPRISE: ${clientData.company || 'Particulier'}
CRÉANCES: ${clientData.debts.length}
MONTANT TOTAL: ${formatCurrencyAmount(
  clientData.debts.reduce((sum, d) => sum + d.amount - d.paidAmount, 0), 
  'GNF'
)}

Génère 3-4 suggestions en JSON:
{
  "suggestions": [
    {
      "priority": "high|medium|low",
      "action": "action courte",
      "description": "description détaillée",
      "expectedImpact": "impact attendu",
      "timeframe": "délai"
    }
  ]
}`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Tu es un expert en recouvrement de créances en Afrique. Réponds en JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        const parsed = JSON.parse(jsonStr.trim());
        
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          return parsed.suggestions;
        }
      }
    } catch (error) {
      console.error('Mitigation suggestions error:', error);
    }
  }
  
  return suggestionsByLevel[riskLevel];
}

// =====================================================
// BATCH RISK ANALYSIS
// =====================================================

export async function batchRiskAnalysis(profileId: string): Promise<Map<string, RiskAnalysisResult>> {
  const results = new Map<string, RiskAnalysisResult>();
  
  // Get all clients with their debts
  const clients = await db.client.findMany({
    where: { profileId },
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
  
  for (const client of clients) {
    const result = await analyzeClientRisk(
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
    
    results.set(client.id, result);
    
    // Update client with new risk data
    await db.client.update({
      where: { id: client.id },
      data: {
        riskScore: result.score,
        riskLevel: result.level
      }
    });
  }
  
  return results;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function scoreToLevel(score: number): RiskLevel {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function calculateRuleBasedRisk(
  client: ClientWithDebts,
  debts: ClientWithDebts['debts'],
  trendData: { trend: 'improving' | 'stable' | 'worsening'; trendData: RiskTrendPoint[] }
): RiskAnalysisResult {
  let score = 0;
  const factors: RiskFactor[] = [];
  const insights: string[] = [];
  const recommendations: string[] = [];
  
  const now = new Date();
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const paymentRate = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
  
  const overdueDebts = debts.filter(d => {
    const dueDate = new Date(d.dueDate);
    return dueDate < now && d.status !== 'paid';
  });
  
  // Payment history factor
  if (paymentRate < 30) {
    score += 30;
    factors.push({
      category: 'payment',
      name: 'Taux de paiement très faible',
      impact: 'negative',
      severity: 'high',
      description: `Seulement ${paymentRate.toFixed(0)}% des créances ont été payées`,
      weight: 0.3
    });
  } else if (paymentRate < 60) {
    score += 15;
    factors.push({
      category: 'payment',
      name: 'Taux de paiement faible',
      impact: 'negative',
      severity: 'medium',
      description: `Taux de paiement de ${paymentRate.toFixed(0)}%`,
      weight: 0.2
    });
  } else if (paymentRate > 85) {
    factors.push({
      category: 'payment',
      name: 'Excellent historique',
      impact: 'positive',
      severity: 'low',
      description: `Taux de paiement de ${paymentRate.toFixed(0)}%`,
      weight: 0.1
    });
    insights.push('Ce client a un historique de paiement fiable');
  }
  
  // Overdue debts factor
  if (overdueDebts.length > 3) {
    score += 25;
    factors.push({
      category: 'payment',
      name: 'Créances multiples en retard',
      impact: 'negative',
      severity: 'high',
      description: `${overdueDebts.length} créances en retard`,
      weight: 0.25
    });
    recommendations.push('Envisager une action groupée sur toutes les créances');
  } else if (overdueDebts.length > 1) {
    score += 15;
    factors.push({
      category: 'payment',
      name: 'Plusieurs créances en retard',
      impact: 'negative',
      severity: 'medium',
      description: `${overdueDebts.length} créances en retard`,
      weight: 0.15
    });
  }
  
  // Average delay factor
  if (overdueDebts.length > 0) {
    const avgDelay = overdueDebts.reduce((sum, d) => {
      return sum + Math.ceil((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    }, 0) / overdueDebts.length;
    
    if (avgDelay > 60) {
      score += 20;
      factors.push({
        category: 'payment',
        name: 'Retard moyen élevé',
        impact: 'negative',
        severity: 'high',
        description: `Retard moyen de ${avgDelay.toFixed(0)} jours`,
        weight: 0.2
      });
    } else if (avgDelay > 30) {
      score += 10;
      factors.push({
        category: 'payment',
        name: 'Retard modéré',
        impact: 'negative',
        severity: 'medium',
        description: `Retard moyen de ${avgDelay.toFixed(0)} jours`,
        weight: 0.1
      });
    }
  }
  
  // Communication factor
  if (!client.email && !client.phone) {
    score += 25;
    factors.push({
      category: 'communication',
      name: 'Contact indisponible',
      impact: 'negative',
      severity: 'high',
      description: 'Aucun moyen de contact disponible',
      weight: 0.25
    });
    recommendations.push('Rechercher les coordonnées du client');
  } else if (client.email && client.phone) {
    factors.push({
      category: 'communication',
      name: 'Contacts disponibles',
      impact: 'positive',
      severity: 'low',
      description: 'Email et téléphone disponibles',
      weight: 0.05
    });
  }
  
  // Status factor
  if (client.status === 'blacklisted') {
    score += 40;
    factors.push({
      category: 'external',
      name: 'Client blacklisté',
      impact: 'negative',
      severity: 'high',
      description: 'Ce client est sur liste noire',
      weight: 0.4
    });
    insights.push('Ce client a été blacklisté - éviter les nouvelles créances');
  } else if (client.status === 'inactive') {
    score += 15;
    factors.push({
      category: 'external',
      name: 'Client inactif',
      impact: 'negative',
      severity: 'medium',
      description: 'Le client est marqué comme inactif',
      weight: 0.15
    });
    recommendations.push('Vérifier si le client est toujours en activité');
  }
  
  // Trend insight
  if (trendData.trend === 'worsening') {
    insights.push('La situation de ce client se dégrade');
    recommendations.push('Agir rapidement pour éviter une perte');
  } else if (trendData.trend === 'improving') {
    insights.push('La situation de ce client s\'améliore');
  }
  
  // Calculate level
  score = Math.min(100, score);
  const level = scoreToLevel(score);
  
  // Generate insights if none
  if (insights.length === 0) {
    if (level === 'low') {
      insights.push('Ce client présente un risque faible');
    } else if (level === 'medium') {
      insights.push('Ce client présente un risque modéré');
    } else {
      insights.push('Ce client présente un risque élevé');
    }
  }
  
  // Generate recommendations if none
  if (recommendations.length === 0) {
    if (level === 'high' || level === 'critical') {
      recommendations.push('Intensifier les actions de recouvrement');
      recommendations.push('Envisager un plan de paiement');
    } else if (level === 'medium') {
      recommendations.push('Suivre régulièrement les échéances');
    } else {
      recommendations.push('Maintenir le suivi habituel');
    }
  }
  
  return {
    score,
    level,
    factors,
    insights,
    recommendations,
    trend: trendData.trend,
    trendData: trendData.trendData
  };
}

// =====================================================
// UPDATE CLIENT RISK IN DATABASE
// =====================================================

export async function updateClientRiskInDatabase(
  clientId: string,
  result: RiskAnalysisResult
): Promise<void> {
  try {
    await db.client.update({
      where: { id: clientId },
      data: {
        riskScore: result.score,
        riskLevel: result.level
      }
    });
    
    // Log the update
    await db.auditLog.create({
      data: {
        userId: null,
        action: 'risk_analysis',
        entityType: 'Client',
        entityId: clientId,
        newValue: JSON.stringify({
          score: result.score,
          level: result.level,
          factors: result.factors,
          recommendations: result.recommendations
        }),
        status: 'success'
      }
    });
  } catch (error) {
    console.error('Error updating client risk:', error);
  }
}
