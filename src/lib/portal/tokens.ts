// Portal token management

import { db } from "@/lib/db"
import crypto from "crypto"

export function generatePortalToken(clientId: string): string {
  return crypto.randomBytes(32).toString("base64url")
}

export async function validatePortalToken(token: string): Promise<{ clientId: string } | null> {
  const portalToken = await db.portalToken.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  })
  
  if (!portalToken) return null
  
  return { clientId: portalToken.clientId }
}

export async function getClientTokens(clientId: string) {
  return db.portalToken.findMany({ where: { clientId } })
}

export async function revokePortalToken(tokenId: string) {
  await db.portalToken.delete({ where: { id: tokenId } })
}
