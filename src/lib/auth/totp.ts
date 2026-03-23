/**
 * TOTP (Time-based One-Time Password) Module
 * RelancePro Africa - Security Module
 * Implementation following RFC 6238
 * Supports Google Authenticator, Authy, Microsoft Authenticator, etc.
 */

import * as crypto from 'crypto';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';

// Configuration TOTP
const TOTP_CONFIG = {
  // Durée de validité d'un code en secondes (30s est le standard)
  step: 30,
  // Nombre de digits du code (6 est le standard)
  digits: 6,
  // Algorithme de hash (SHA-1 est le plus compatible)
  algorithm: 'sha1',
  // Fenêtre de tolérance (nombre de pas avant/après acceptés)
  window: 1,
  // Nom de l'application pour l'URI otpauth
  issuer: 'RelancePro Africa',
};

/**
 * Options pour la génération de secret TOTP
 */
export interface GenerateTOTPOptions {
  userId: string;
  email?: string;
  issuer?: string;
  accountName?: string;
}

/**
 * Résultat de la génération de secret TOTP
 */
export interface TOTPSecretResult {
  secret: string;           // Secret en base32 (pour l'utilisateur)
  encrypted: string;        // Secret chiffré (pour le stockage)
  uri: string;              // URI otpauth://
  qrCodeDataUrl?: string;   // QR code en data URL
  manualEntryKey: string;   // Clé formatée pour saisie manuelle
}

/**
 * Options pour la génération de QR code
 */
export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Génère un secret TOTP sécurisé
 * @param length - Longueur du secret en bytes (défaut: 20 pour 160 bits)
 * @returns Secret en base32
 */
export function generateSecret(length: number = 20): string {
  return authenticator.generateSecret(length);
}

/**
 * Crée l'URI otpauth pour les applications d'authentification
 * @param accountName - Nom du compte (généralement l'email)
 * @param secret - Secret TOTP en base32
 * @param issuer - Nom de l'application
 * @returns URI otpauth://
 */
export function createOtpAuthUri(
  accountName: string,
  secret: string,
  issuer: string = TOTP_CONFIG.issuer
): string {
  return authenticator.keyuri(
    encodeURIComponent(accountName),
    encodeURIComponent(issuer),
    secret
  );
}

/**
 * Génère un secret TOTP complet avec QR code
 * @param options - Options de génération
 * @returns Objet contenant le secret, l'URI et le QR code
 */
export async function generateTOTPWithQRCode(
  options: GenerateTOTPOptions
): Promise<TOTPSecretResult> {
  const {
    userId,
    email,
    issuer = TOTP_CONFIG.issuer,
    accountName,
  } = options;

  // Générer le secret
  const secret = generateSecret();
  
  // Utiliser l'email ou l'ID utilisateur comme nom de compte
  const displayName = accountName || email || userId;
  
  // Créer l'URI otpauth
  const uri = createOtpAuthUri(displayName, secret, issuer);
  
  // Générer le QR code
  const qrCodeDataUrl = await generateQRCodeFromUri(uri);
  
  // Formater le secret pour la saisie manuelle (groupes de 4 caractères)
  const manualEntryKey = formatSecretForDisplay(secret);
  
  return {
    secret,
    encrypted: '', // À chiffrer séparément avec encrypt()
    uri,
    qrCodeDataUrl,
    manualEntryKey,
  };
}

/**
 * Génère un QR code à partir d'une URI otpauth
 * @param uri - URI otpauth://
 * @param options - Options du QR code
 * @returns QR code en data URL (base64)
 */
export async function generateQRCodeFromUri(
  uri: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    color = { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel = 'M',
  } = options;

  try {
    return await QRCode.toDataURL(uri, {
      width,
      margin,
      color,
      errorCorrectionLevel,
    });
  } catch (error) {
    throw new Error('Erreur lors de la génération du QR code');
  }
}

/**
 * Vérifie un code TOTP
 * @param token - Code à 6 chiffres entré par l'utilisateur
 * @param secret - Secret TOTP en base32
 * @param window - Fenêtre de tolérance (défaut: 1)
 * @returns true si le code est valide
 */
export function verifyTOTPCode(
  token: string,
  secret: string,
  window: number = TOTP_CONFIG.window
): boolean {
  if (!token || !secret) {
    return false;
  }
  
  // Nettoyer le token (supprimer les espaces)
  const cleanToken = token.replace(/\s/g, '');
  
  // Vérifier le format (6 chiffres)
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }
  
  try {
    // Configurer la fenêtre de tolérance
    authenticator.options = { window };
    
    // Vérifier le code
    return authenticator.check(cleanToken, secret);
  } catch (error) {
    console.error('Erreur lors de la vérification TOTP:', error);
    return false;
  }
}

/**
 * Génère un code TOTP pour un secret donné (utile pour les tests)
 * @param secret - Secret TOTP en base32
 * @returns Code TOTP actuel
 */
export function generateTOTPCode(secret: string): string {
  return authenticator.generate(secret);
}

/**
 * Obtient le temps restant avant expiration du code actuel
 * @returns Nombre de secondes avant expiration
 */
export function getTimeRemaining(): number {
  const now = Math.floor(Date.now() / 1000);
  const step = TOTP_CONFIG.step;
  return step - (now % step);
}

/**
 * Obtient le timestamp du prochain changement de code
 * @returns Timestamp Unix du prochain changement
 */
export function getNextCodeTimestamp(): number {
  const now = Math.floor(Date.now() / 1000);
  const step = TOTP_CONFIG.step;
  return (Math.floor(now / step) + 1) * step * 1000;
}

/**
 * Formate un secret pour l'affichage (groupes de 4 caractères)
 * @param secret - Secret en base32
 * @returns Secret formaté
 */
export function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret;
}

/**
 * Valide un secret TOTP en base32
 * @param secret - Secret à valider
 * @returns true si le secret est valide
 */
export function isValidSecret(secret: string): boolean {
  // Vérifier que le secret est en base32 valide
  const base32Regex = /^[A-Z2-7]+=*$/i;
  return base32Regex.test(secret) && secret.length >= 16;
}

/**
 * Génère des codes de secours temporairement (pour les tests)
 * @param secret - Secret TOTP
 * @param count - Nombre de codes à générer
 * @returns Liste de codes futurs
 */
export function generateFutureCodes(secret: string, count: number = 3): string[] {
  const codes: string[] = [];
  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_CONFIG.step);
  
  for (let i = 0; i < count; i++) {
    // Note: Cette fonction utilise l'implémentation interne d'otplib
    // Pour la production, utiliser uniquement verifyTOTPCode
    authenticator.options = { window: i };
    codes.push(authenticator.generate(secret));
  }
  
  return codes;
}

/**
 * Informations sur le support TOTP du navigateur
 */
export const TOTP_SUPPORT = {
  // Applications d'authentification supportées
  apps: [
    { name: 'Google Authenticator', platforms: ['iOS', 'Android'], url: 'https://support.google.com/accounts/answer/1066447' },
    { name: 'Microsoft Authenticator', platforms: ['iOS', 'Android', 'Windows'], url: 'https://www.microsoft.com/en-us/security/mobile-authenticator-app' },
    { name: 'Authy', platforms: ['iOS', 'Android', 'Desktop'], url: 'https://authy.com/' },
    { name: '1Password', platforms: ['iOS', 'Android', 'Desktop'], url: 'https://1password.com/' },
    { name: 'LastPass Authenticator', platforms: ['iOS', 'Android'], url: 'https://lastpass.com/auth/' },
    { name: 'Duo Mobile', platforms: ['iOS', 'Android'], url: 'https://duo.com/product/trusted-users/two-factor-authentication-authentication-methods/duo-mobile' },
  ],
  
  // Caractéristiques TOTP
  specs: {
    algorithm: 'HMAC-SHA1',
    digits: 6,
    period: 30,
    type: 'TOTP (RFC 6238)',
  },
};

/**
 * Instructions de configuration pour l'utilisateur
 */
export const TOTP_SETUP_INSTRUCTIONS = {
  fr: {
    title: 'Configuration de l\'authentification à deux facteurs',
    steps: [
      'Téléchargez une application d\'authentification comme Google Authenticator ou Authy',
      'Scannez le QR code ci-dessous avec l\'application',
      'Si vous ne pouvez pas scanner, entrez manuellement le code affiché',
      'Entrez le code à 6 chiffres généré par l\'application',
      'Conservez vos codes de récupération en lieu sûr',
    ],
    note: 'Le code change toutes les 30 secondes. Assurez-vous que l\'horloge de votre appareil est synchronisée.',
  },
  en: {
    title: 'Two-Factor Authentication Setup',
    steps: [
      'Download an authenticator app like Google Authenticator or Authy',
      'Scan the QR code below with the app',
      'If you can\'t scan, manually enter the displayed code',
      'Enter the 6-digit code generated by the app',
      'Save your recovery codes in a safe place',
    ],
    note: 'The code changes every 30 seconds. Make sure your device clock is synchronized.',
  },
};
