/**
 * Two-Factor Authentication (2FA) Module
 * RelancePro Africa - Security Module
 * Utilise TOTP (Time-based One-Time Password) avec otplib
 */

import * as crypto from 'crypto';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { encrypt, decrypt, EncryptedData, serializeEncryptedData, deserializeEncryptedData } from './encryption';

// Configuration TOTP
const TOTP_WINDOW = 1; // Fenêtre de tolérance pour les codes TOTP (en pas de 30s)
const RECOVERY_CODES_COUNT = 8; // Nombre de codes de récupération
const RECOVERY_CODE_LENGTH = 10; // Longueur de chaque code de récupération

/**
 * Interface pour les secrets 2FA
 */
export interface TwoFactorSecret {
  secret: string; // Secret TOTP en base32
  encrypted: EncryptedData; // Secret chiffré pour le stockage
}

/**
 * Interface pour les codes de récupération
 */
export interface RecoveryCodes {
  codes: string[];
  encrypted: string; // Codes chiffrés sérialisés pour le stockage
}

/**
 * Génère un nouveau secret TOTP pour l'authentification à deux facteurs
 * @param email - Email de l'utilisateur (pour l'URI otpauth)
 * @param issuer - Nom de l'application
 * @returns Objet contenant le secret et l'URI otpauth
 */
export function generateTOTPSecret(email: string, issuer: string = 'RelancePro Africa'): {
  secret: string;
  uri: string;
  encrypted: string;
} {
  // Générer un secret aléatoire
  const secret = authenticator.generateSecret();
  
  // Créer l'URI otpauth
  const uri = authenticator.keyuri(email, issuer, secret);
  
  // Chiffrer le secret pour le stockage
  const encrypted = encrypt(secret);
  
  return {
    secret,
    uri,
    encrypted: serializeEncryptedData(encrypted),
  };
}

/**
 * Génère un QR code à partir de l'URI otpauth
 * @param uri - URI otpauth://
 * @returns QR code en base64 (data URL)
 */
export async function generateQRCode(uri: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(uri, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error('Erreur lors de la génération du QR code');
  }
}

/**
 * Valide un code TOTP
 * @param token - Code à 6 chiffres entré par l'utilisateur
 * @param encryptedSecret - Secret chiffré stocké en base de données
 * @returns true si le code est valide
 */
export function verifyTOTP(token: string, encryptedSecret: string): boolean {
  if (!token || !encryptedSecret) {
    return false;
  }
  
  // Nettoyer le token (supprimer les espaces)
  const cleanToken = token.replace(/\s/g, '');
  
  // Vérifier le format
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }
  
  try {
    // Déchiffrer le secret
    const encryptedData = deserializeEncryptedData(encryptedSecret);
    if (!encryptedData) {
      return false;
    }
    
    const secret = decrypt(encryptedData);
    
    // Vérifier le code TOTP avec une fenêtre de tolérance
    authenticator.options = {
      window: TOTP_WINDOW,
    };
    
    return authenticator.check(cleanToken, secret);
  } catch (error) {
    console.error('Erreur lors de la vérification TOTP:', error);
    return false;
  }
}

/**
 * Génère des codes de récupération
 * @returns Codes de récupération et leur version chiffrée
 */
export function generateRecoveryCodes(): RecoveryCodes {
  const codes: string[] = [];
  
  for (let i = 0; i < RECOVERY_CODES_COUNT; i++) {
    // Générer un code aléatoire
    const code = generateRecoveryCode();
    codes.push(code);
  }
  
  // Chiffrer les codes pour le stockage
  const encryptedCodes = encrypt(JSON.stringify(codes));
  
  return {
    codes,
    encrypted: serializeEncryptedData(encryptedCodes),
  };
}

/**
 * Génère un seul code de récupération
 * @returns Code de récupération formaté (ex: "A1B2-C3D4")
 */
function generateRecoveryCode(): string {
  const bytes = crypto.randomBytes(RECOVERY_CODE_LENGTH / 2);
  const code = bytes.toString('hex').toUpperCase();
  
  // Formater avec un tiret au milieu pour faciliter la lecture
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Vérifie et consomme un code de récupération
 * @param code - Code de récupération entré par l'utilisateur
 * @param encryptedCodes - Codes chiffrés stockés en base de données
 * @returns Objet avec le résultat et les nouveaux codes chiffrés si utilisé
 */
export function verifyRecoveryCode(
  code: string,
  encryptedCodes: string
): { valid: boolean; remainingCodes?: string; codesLeft?: number } {
  if (!code || !encryptedCodes) {
    return { valid: false };
  }
  
  try {
    // Normaliser le code (majuscules, supprimer les tirets)
    const normalizedCode = code.toUpperCase().replace(/-/g, '');
    
    // Déchiffrer les codes
    const encryptedData = deserializeEncryptedData(encryptedCodes);
    if (!encryptedData) {
      return { valid: false };
    }
    
    const codesJson = decrypt(encryptedData);
    const codes: string[] = JSON.parse(codesJson);
    
    // Chercher le code dans la liste
    const codeIndex = codes.findIndex(c => 
      c.toUpperCase().replace(/-/g, '') === normalizedCode
    );
    
    if (codeIndex === -1) {
      return { valid: false };
    }
    
    // Supprimer le code utilisé
    codes.splice(codeIndex, 1);
    
    // Rechiffrer les codes restants
    const newEncryptedCodes = encrypt(JSON.stringify(codes));
    
    return {
      valid: true,
      remainingCodes: serializeEncryptedData(newEncryptedCodes),
      codesLeft: codes.length,
    };
  } catch (error) {
    console.error('Erreur lors de la vérification du code de récupération:', error);
    return { valid: false };
  }
}

/**
 * Vérifie si un utilisateur a activé le 2FA
 * @param twoFactorEnabled - Statut d'activation
 * @param twoFactorSecret - Secret stocké
 * @returns true si le 2FA est activé et configuré
 */
export function is2FAConfigured(twoFactorEnabled: boolean, twoFactorSecret: string | null): boolean {
  return twoFactorEnabled && !!twoFactorSecret;
}

/**
 * Génère un token de confiance pour un appareil
 * @param userId - ID de l'utilisateur
 * @returns Token de confiance
 */
export function generateTrustedDeviceToken(userId: string): string {
  const randomBytes = crypto.randomBytes(32);
  const token = crypto
    .createHash('sha256')
    .update(userId + randomBytes.toString('hex') + Date.now())
    .digest('hex');
  return token;
}

/**
 * Calcule la date d'expiration pour un appareil de confiance
 * @param days - Nombre de jours avant expiration (défaut: 30)
 * @returns Date d'expiration
 */
export function getTrustedDeviceExpiry(days: number = 30): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Crée un hash pour le token d'appareil de confiance
 * @param token - Token de confiance
 * @returns Hash du token pour le stockage
 */
export function hashTrustedDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Vérifie un token d'appareil de confiance
 * @param token - Token à vérifier
 * @param hashedToken - Hash stocké
 * @returns true si le token est valide
 */
export function verifyTrustedDeviceToken(token: string, hashedToken: string): boolean {
  return hashTrustedDeviceToken(token) === hashedToken;
}

/**
 * Interface pour les données 2FA d'un utilisateur
 */
export interface TwoFactorStatus {
  enabled: boolean;
  hasRecoveryCodes: boolean;
  codesRemaining: number;
  configuredAt?: Date;
}

/**
 * Obtient le statut 2FA d'un utilisateur
 * @param encryptedCodes - Codes de récupération chiffrés
 * @returns Statut 2FA
 */
export function getRecoveryCodesStatus(encryptedCodes: string | null): { hasCodes: boolean; count: number } {
  if (!encryptedCodes) {
    return { hasCodes: false, count: 0 };
  }
  
  try {
    const encryptedData = deserializeEncryptedData(encryptedCodes);
    if (!encryptedData) {
      return { hasCodes: false, count: 0 };
    }
    
    const codesJson = decrypt(encryptedData);
    const codes: string[] = JSON.parse(codesJson);
    
    return {
      hasCodes: codes.length > 0,
      count: codes.length,
    };
  } catch {
    return { hasCodes: false, count: 0 };
  }
}
