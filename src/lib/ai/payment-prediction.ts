export type DebtWithClient = {
  id: string;
  amount: number;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  dueDate: Date;
  status: string;
  createdAt: Date;
};

export async function predictPaymentProbability(debtId: string): Promise<number> {
  return 0.75;
}

export async function predictPaymentDate(debtId: string): Promise<Date | null> {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function getPredictionFactors(debtId: string): string[] {
  return [];
}

export async function getCachedPrediction(debtId: string): Promise<unknown> {
  return null;
}

export async function cachePredictionInDatabase(debtId: string, prediction: unknown): Promise<void> {
  console.log('Caching prediction for:', debtId);
}
