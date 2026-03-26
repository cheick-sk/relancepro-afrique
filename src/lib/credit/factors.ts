export interface CreditFactor {
  id: string;
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  description: string;
}

export const CREDIT_RATINGS = [
  { min: 800, max: 850, label: 'Excellent', color: 'green', description: 'Risque très faible' },
  { min: 700, max: 799, label: 'Très bon', color: 'emerald', description: 'Risque faible' },
  { min: 600, max: 699, label: 'Bon', color: 'blue', description: 'Risque modéré' },
  { min: 500, max: 599, label: 'Moyen', color: 'yellow', description: 'Risque significatif' },
  { min: 300, max: 499, label: 'Faible', color: 'orange', description: 'Risque élevé' },
  { min: 0, max: 299, label: 'Très faible', color: 'red', description: 'Risque très élevé' },
];

export type CreditRating = typeof CREDIT_RATINGS[number];

export function getRatingFromScore(score: number): CreditRating {
  return CREDIT_RATINGS.find(r => score >= r.min && score <= r.max) || CREDIT_RATINGS[5];
}

export function getScoreZone(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score >= 700) return 'green';
  if (score >= 500) return 'yellow';
  if (score >= 300) return 'orange';
  return 'red';
}

export function getImpactColor(impact: 'positive' | 'negative' | 'neutral'): string {
  switch (impact) {
    case 'positive': return 'text-green-500';
    case 'negative': return 'text-red-500';
    case 'neutral': return 'text-gray-500';
  }
}

export const CREDIT_LIMIT_MULTIPLIERS: Record<string, number> = {
  excellent: 1.5,
  'très bon': 1.3,
  bon: 1.0,
  moyen: 0.7,
  faible: 0.5,
  'très faible': 0.3,
};

export function calculateCreditLimit(baseAmount: number, score: number): number {
  const rating = getRatingFromScore(score);
  const multiplier = CREDIT_LIMIT_MULTIPLIERS[rating.label.toLowerCase()] || 0.5;
  return Math.round(baseAmount * multiplier);
}
