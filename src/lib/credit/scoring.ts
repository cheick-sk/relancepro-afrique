// Credit scoring utilities

import { db } from "@/lib/db"

export async function calculateCreditScore(clientId: string): Promise<number> {
  return 50
}

export async function updateClientCreditScore(clientId: string, score: number): Promise<void> {
  await db.client.update({
    where: { id: clientId },
    data: { creditScore: score },
  }).catch(() => {})
}

export function getRatingFromScore(score: number): string {
  if (score >= 80) return "A"
  if (score >= 60) return "B"
  if (score >= 40) return "C"
  if (score >= 20) return "D"
  return "E"
}
