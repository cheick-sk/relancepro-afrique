export interface PaymentPrediction {
  probability: number;
  expectedDate?: Date;
  confidence: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface ClientRisk {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: string[];
  suggestions: string[];
}

export interface AIStrategy {
  type: 'email' | 'sms' | 'whatsapp' | 'voice';
  timing: Date;
  tone: 'formal' | 'friendly' | 'urgent';
  messageTemplate: string;
}

export async function predictPaymentProbability(debtId: string): Promise<PaymentPrediction> {
  return {
    probability: 0.75,
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    confidence: 'medium',
    factors: ['Historique de paiement régulier', 'Montant modéré'],
  };
}

export async function predictPaymentDate(debtId: string): Promise<Date | null> {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function getPredictionFactors(debtId: string): string[] {
  return ['Historique client', 'Montant de la dette', 'Ancienneté'];
}

export async function analyzeClientRisk(clientId: string): Promise<ClientRisk> {
  return {
    score: 30,
    level: 'low',
    factors: ['Paiements réguliers'],
    suggestions: ['Maintenir le suivi actuel'],
  };
}

export function getRiskMitigationSuggestions(clientId: string): string[] {
  return ['Continuer le suivi régulier'];
}

export function suggestBestAction(debtId: string): string {
  return 'Envoyer une relance par SMS';
}

export function predictBestSendTime(clientId: string): Date {
  const now = new Date();
  now.setHours(10, 0, 0, 0); // 10 AM
  return now;
}

export function generateAIReminder(debtId: string, tone: string): string {
  return 'Bonjour, nous vous rappelons votre facture en attente.';
}

export async function generateCollectionStrategy(debtId: string): Promise<AIStrategy[]> {
  return [
    {
      type: 'email',
      timing: new Date(),
      tone: 'friendly',
      messageTemplate: 'Rappel amical',
    },
  ];
}

export function optimizeReminderSequence(debtId: string): AIStrategy[] {
  return [];
}

export function suggestNegotiationTerms(debtId: string): string[] {
  return ['Échelonnement du paiement', 'Remise pour paiement anticipé'];
}

export function escalationRecommendation(debtId: string): string {
  return 'Maintenir le suivi actuel';
}

export function getStrategyForClient(clientId: string): AIStrategy | null {
  return null;
}

export async function handleSupportChat(message: string, context: Record<string, unknown>): Promise<string> {
  return "Je suis là pour vous aider avec vos questions sur la gestion des créances.";
}
