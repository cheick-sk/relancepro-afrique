import { NextAuthOptions, RequestInternal } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { verifyTOTP, is2FAConfigured } from "@/lib/two-factor";
import { AuditAction, logAction } from "@/lib/audit";
import { randomUUID } from "crypto";

// Extension de la session pour inclure les informations 2FA et équipe
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      companyName?: string | null;
      subscriptionStatus: string;
      twoFactorEnabled: boolean;
      twoFactorVerified?: boolean;
      teamId?: string | null;
      teamRole?: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    companyName?: string | null;
    subscriptionStatus: string;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string | null;
    teamId?: string | null;
    teamRole?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    companyName?: string | null;
    subscriptionStatus: string;
    twoFactorEnabled: boolean;
    twoFactorVerified?: boolean;
    sessionId?: string;
    teamId?: string | null;
    teamRole?: string | null;
  }
}

// Configuration des sessions
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 jours
const SESSION_ABSOLUTE_TIMEOUT = 30 * 24 * 60 * 60; // 30 jours (timeout absolu)
const SESSION_UPDATE_AGE = 24 * 60 * 60; // Mise à jour du token chaque jour

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        twoFactorCode: { label: "Code 2FA", type: "text" },
        isTwoFactorVerification: { label: "Est vérification 2FA", type: "boolean" },
      },
      async authorize(credentials: Record<string, string> | undefined, req: Pick<RequestInternal, "body" | "query" | "headers" | "method">) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const profile = await db.profile.findUnique({
          where: { email: credentials.email },
        });

        if (!profile || !profile.password) {
          // Log failed login attempt
          await logAction({
            action: AuditAction.LOGIN_FAILED,
            status: "failed",
            details: { reason: "user_not_found", email: credentials.email },
          });
          return null;
        }

        // Vérifier si le compte est verrouillé
        if (profile.lockedUntil && profile.lockedUntil > new Date()) {
          await logAction({
            userId: profile.id,
            action: AuditAction.LOGIN_FAILED,
            status: "failed",
            details: { reason: "account_locked", lockedUntil: profile.lockedUntil },
          });
          return null;
        }

        // Comparer le mot de passe hashé
        const isPasswordValid = await compare(credentials.password, profile.password);

        if (!isPasswordValid) {
          // Incrémenter les tentatives échouées
          const failedAttempts = profile.failedLoginAttempts + 1;
          const lockThreshold = 5;
          
          // Verrouiller le compte après 5 tentatives échouées
          const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: failedAttempts };
          if (failedAttempts >= lockThreshold) {
            const lockDuration = 30 * 60 * 1000; // 30 minutes
            updateData.lockedUntil = new Date(Date.now() + lockDuration);
          }
          
          await db.profile.update({
            where: { id: profile.id },
            data: updateData,
          });
          
          await logAction({
            userId: profile.id,
            action: AuditAction.LOGIN_FAILED,
            status: "failed",
            details: { reason: "invalid_password", attempts: failedAttempts },
          });
          return null;
        }

        // Réinitialiser les tentatives échouées
        await db.profile.update({
          where: { id: profile.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        // Vérifier si le 2FA est activé
        if (is2FAConfigured(profile.twoFactorEnabled, profile.twoFactorBackupCodes)) {
          // Si c'est la vérification 2FA (deuxième étape)
          if (credentials.isTwoFactorVerification === "true") {
            if (!credentials.twoFactorCode) {
              // Indiquer que le 2FA est requis
              return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                companyName: profile.companyName,
                subscriptionStatus: profile.subscriptionStatus,
                twoFactorEnabled: true,
                twoFactorSecret: profile.twoFactorBackupCodes,
              } as any; // Retourner l'utilisateur sans le flag verified
            }
            
            // Vérifier le code 2FA
            const isValid = verifyTOTP(credentials.twoFactorCode, profile.twoFactorBackupCodes || "");
            if (!isValid) {
              await logAction({
                userId: profile.id,
                action: AuditAction.TWO_FACTOR_VERIFY,
                status: "failed",
                details: { reason: "invalid_totp" },
              });
              return null;
            }
            
            await logAction({
              userId: profile.id,
              action: AuditAction.TWO_FACTOR_VERIFY,
              status: "success",
            });
          } else {
            // Première étape : retourner l'utilisateur pour indiquer que 2FA est requis
            return {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              companyName: profile.companyName,
              subscriptionStatus: profile.subscriptionStatus,
              twoFactorEnabled: true,
              twoFactorSecret: profile.twoFactorBackupCodes,
            };
          }
        }

        // Mettre à jour la dernière connexion
        await db.profile.update({
          where: { id: profile.id },
          data: {
            lastLoginAt: new Date(),
          },
        });

        // Enregistrer le login réussi
        await logAction({
          userId: profile.id,
          action: AuditAction.LOGIN,
          status: "success",
        });

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          companyName: profile.companyName,
          subscriptionStatus: profile.subscriptionStatus,
          twoFactorEnabled: profile.twoFactorEnabled,
          twoFactorVerified: true,
          teamId: profile.teamId,
          teamRole: profile.teamRole,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Ajout initial des données utilisateur au token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.companyName = user.companyName;
        token.subscriptionStatus = user.subscriptionStatus;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.twoFactorVerified = user.twoFactorVerified ?? true;
        token.sessionId = randomUUID();
      }

      // Mise à jour du token (par exemple, changement de nom)
      if (trigger === "update" && session) {
        token.name = session.name;
        token.companyName = session.companyName;
      }

      // Vérifier que l'utilisateur existe toujours et son statut
      if (token.id) {
        const profile = await db.profile.findUnique({
          where: { id: token.id },
          select: { 
            subscriptionStatus: true, 
            twoFactorEnabled: true,
            teamId: true,
            teamRole: true,
          },
        });
        
        if (profile) {
          token.subscriptionStatus = profile.subscriptionStatus;
          token.twoFactorEnabled = profile.twoFactorEnabled;
          token.teamId = profile.teamId;
          token.teamRole = profile.teamRole;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.companyName = token.companyName;
        session.user.subscriptionStatus = token.subscriptionStatus;
        session.user.twoFactorEnabled = token.twoFactorEnabled;
        session.user.twoFactorVerified = token.twoFactorVerified;
        session.user.teamId = token.teamId;
        session.user.teamRole = token.teamRole;
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Si 2FA est activé mais pas encore vérifié, bloquer la connexion
      if (user.twoFactorEnabled && !user.twoFactorVerified) {
        // Rediriger vers la page de vérification 2FA
        return `/2fa/verify?email=${encodeURIComponent(user.email)}`;
      }
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      // Enregistrer le logout
      if (token?.id) {
        await logAction({
          userId: token.id,
          action: AuditAction.LOGOUT,
          status: "success",
        });
      }
    },
    async session({ session, token }) {
      // Créer/mettre à jour la session en base de données
      if (token?.id && token?.sessionId) {
        const existingSession = await db.session.findUnique({
          where: { token: token.sessionId },
        });
        
        if (!existingSession) {
          // Créer une nouvelle session
          await db.session.create({
            data: {
              userId: token.id,
              token: token.sessionId,
              lastActive: new Date(),
              expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
            },
          });
        } else {
          // Mettre à jour la dernière activité
          await db.session.update({
            where: { token: token.sessionId },
            data: { lastActive: new Date() },
          });
        }
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "relancepro-africa-secret-key-2024",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    pkceCodeVerifier: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900,
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// Helper pour vérifier si une session nécessite une vérification 2FA
export function requires2FAVerification(session: any): boolean {
  return session?.user?.twoFactorEnabled && !session?.user?.twoFactorVerified;
}

// Helper pour créer un token de session sécurisé
export async function createSession(userId: string, userAgent?: string, ip?: string): Promise<string> {
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  
  await db.session.create({
    data: {
      userId,
      token: sessionToken,
      userAgent,
      ip,
      lastActive: new Date(),
      expiresAt,
    },
  });
  
  return sessionToken;
}

// Helper pour révoquer une session
export async function revokeSession(sessionToken: string, revokedBy?: string): Promise<void> {
  await db.session.update({
    where: { token: sessionToken },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

// Helper pour révoquer toutes les sessions d'un utilisateur sauf la courante
export async function revokeOtherSessions(userId: string, currentSessionToken: string): Promise<number> {
  const result = await db.session.updateMany({
    where: {
      userId,
      token: { not: currentSessionToken },
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
  
  return result.count;
}
