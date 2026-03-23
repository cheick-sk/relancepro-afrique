// Portal Token Management Library
// Handles generation, validation, and expiration of client portal access tokens

import { randomUUID } from "crypto";
import { db } from "@/lib/db";

export interface PortalTokenData {
  id: string;
  clientId: string;
  token: string;
  expiresAt: Date;
  singleUse: boolean;
  usedAt: Date | null;
  accessedAt: Date | null;
  accessedCount: number;
  accessIps: string | null;
  createdBy: string | null;
  note: string | null;
  createdAt: Date;
}

export interface ValidateTokenResult {
  valid: boolean;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
    profileId: string;
  };
  profile?: {
    id: string;
    companyName: string | null;
    phone: string | null;
    email: string;
  };
  tokenData?: PortalTokenData;
  error?: string;
}

export interface GenerateTokenOptions {
  clientId: string;
  expiresInDays?: number; // Default: 30 days
  singleUse?: boolean; // Default: false
  createdBy?: string; // User ID who created the token
  note?: string; // Optional note
}

/**
 * Generate a secure portal token for a client
 */
export async function generatePortalToken(options: GenerateTokenOptions): Promise<PortalTokenData> {
  const {
    clientId,
    expiresInDays = 30,
    singleUse = false,
    createdBy,
    note,
  } = options;

  // Generate UUID v4 token
  const token = randomUUID();

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Create token in database
  const portalToken = await db.portalToken.create({
    data: {
      clientId,
      token,
      expiresAt,
      singleUse,
      createdBy,
      note,
    },
  });

  return portalToken;
}

/**
 * Validate a portal token and return client data
 */
export async function validatePortalToken(token: string, ipAddress?: string): Promise<ValidateTokenResult> {
  // Find token in database
  const portalToken = await db.portalToken.findUnique({
    where: { token },
    include: {
      client: {
        include: {
          profile: {
            select: {
              id: true,
              companyName: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!portalToken) {
    return { valid: false, error: "Token not found" };
  }

  // Check if token is expired
  if (portalToken.expiresAt < new Date()) {
    return { valid: false, error: "Token has expired" };
  }

  // Check if single-use token has been used
  if (portalToken.singleUse && portalToken.usedAt) {
    return { valid: false, error: "Token has already been used" };
  }

  // Update access tracking
  const accessIps = portalToken.accessIps 
    ? JSON.parse(portalToken.accessIps) 
    : [];
  
  if (ipAddress && !accessIps.includes(ipAddress)) {
    accessIps.push(ipAddress);
  }

  await db.portalToken.update({
    where: { id: portalToken.id },
    data: {
      accessedAt: new Date(),
      accessedCount: portalToken.accessedCount + 1,
      accessIps: JSON.stringify(accessIps),
    },
  });

  return {
    valid: true,
    client: {
      id: portalToken.client.id,
      name: portalToken.client.name,
      email: portalToken.client.email,
      phone: portalToken.client.phone,
      company: portalToken.client.company,
      address: portalToken.client.address,
      profileId: portalToken.client.profileId,
    },
    profile: portalToken.client.profile,
    tokenData: {
      id: portalToken.id,
      clientId: portalToken.clientId,
      token: portalToken.token,
      expiresAt: portalToken.expiresAt,
      singleUse: portalToken.singleUse,
      usedAt: portalToken.usedAt,
      accessedAt: portalToken.accessedAt,
      accessedCount: portalToken.accessedCount + 1,
      accessIps: portalToken.accessIps,
      createdBy: portalToken.createdBy,
      note: portalToken.note,
      createdAt: portalToken.createdAt,
    },
  };
}

/**
 * Mark a token as used (for single-use tokens)
 */
export async function expirePortalToken(token: string): Promise<boolean> {
  try {
    await db.portalToken.update({
      where: { token },
      data: {
        usedAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revoke a portal token
 */
export async function revokePortalToken(tokenId: string): Promise<boolean> {
  try {
    await db.portalToken.delete({
      where: { id: tokenId },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all tokens for a client
 */
export async function getClientTokens(clientId: string): Promise<PortalTokenData[]> {
  const tokens = await db.portalToken.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  return tokens;
}

/**
 * Get all tokens for a user's clients
 */
export async function getProfileTokens(profileId: string): Promise<(PortalTokenData & { clientName: string })[]> {
  const tokens = await db.portalToken.findMany({
    where: {
      client: {
        profileId,
      },
    },
    include: {
      client: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return tokens.map((t) => ({
    id: t.id,
    clientId: t.clientId,
    token: t.token,
    expiresAt: t.expiresAt,
    singleUse: t.singleUse,
    usedAt: t.usedAt,
    accessedAt: t.accessedAt,
    accessedCount: t.accessedCount,
    accessIps: t.accessIps,
    createdBy: t.createdBy,
    note: t.note,
    createdAt: t.createdAt,
    clientName: t.client.name,
  }));
}

/**
 * Generate portal URL
 */
export function getPortalUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/portal/${token}`;
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db.portalToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
