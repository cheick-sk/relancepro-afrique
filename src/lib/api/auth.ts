// API authentication and authorization utilities

import { NextRequest } from "next/server"
import { db } from "@/lib/db"

export type ApiScope = 
  | "read:clients"
  | "write:clients"
  | "read:debts"
  | "write:debts"
  | "read:reminders"
  | "write:reminders"
  | "read:analytics"
  | "admin"

interface ApiKeyData {
  id: string
  userId: string
  key: string
  scopes: ApiScope[]
  name: string
  lastUsed?: Date
  expiresAt?: Date
}

export async function validateApiKey(request: NextRequest): Promise<ApiKeyData | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  
  const key = authHeader.substring(7)
  
  const apiKey = await db.apiKey.findFirst({
    where: {
      key,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: { user: true },
  })
  
  if (!apiKey) return null
  
  // Update last used
  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  }).catch(() => {})
  
  return {
    id: apiKey.id,
    userId: apiKey.userId,
    key: apiKey.key,
    scopes: apiKey.scopes as ApiScope[],
    name: apiKey.name,
    lastUsed: apiKey.lastUsed,
    expiresAt: apiKey.expiresAt,
  }
}

export async function requireScope(request: NextRequest, scope: ApiScope): Promise<{ userId: string } | null> {
  const apiKey = await validateApiKey(request)
  if (!apiKey) return null
  
  if (!apiKey.scopes.includes(scope) && !apiKey.scopes.includes("admin")) {
    return null
  }
  
  return { userId: apiKey.userId }
}

export async function logApiUsage(apiKeyId: string, endpoint: string, method: string): Promise<void> {
  // Log API usage for analytics
  try {
    await db.apiUsageLog.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        timestamp: new Date(),
      },
    })
  } catch {
    // Ignore logging errors
  }
}

export async function createApiKey(userId: string, name: string, scopes: ApiScope[]): Promise<{ key: string; id: string }> {
  const key = `rpa_${Buffer.from(crypto.randomUUID()).toString("base64url").slice(0, 32)}`
  
  const apiKey = await db.apiKey.create({
    data: {
      userId,
      name,
      key,
      scopes,
    },
  })
  
  return { key, id: apiKey.id }
}

export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  try {
    await db.apiKey.delete({
      where: { id: keyId, userId },
    })
    return true
  } catch {
    return false
  }
}

export async function updateApiKeyScopes(userId: string, keyId: string, scopes: ApiScope[]): Promise<boolean> {
  try {
    await db.apiKey.update({
      where: { id: keyId, userId },
      data: { scopes },
    })
    return true
  } catch {
    return false
  }
}
