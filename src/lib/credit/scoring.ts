export async function calculateCreditScore(clientId: string): Promise<number> {
  return 700; // Default good score
}

export async function updateClientCreditScore(clientId: string, score: number): Promise<void> {
  console.log('Updating credit score for client:', clientId, score);
}
