/**
 * Chiffrement des données sensibles avec AES-256-GCM
 * RelancePro Africa - Security Module
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash, pbkdf2Sync } from 'crypto';

// Configuration du chiffrement
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits pour GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const ITERATIONS = 100000; // Pour la dérivation de clé PBKDF2

// Récupérer la clé de chiffrement depuis les variables d'environnement
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY non défini dans les variables d\'environnement');
  }
  // Convertir la clé hex en Buffer
  return Buffer.from(key, 'hex');
}

/**
 * Dérive une clé de chiffrement à partir de la clé principale et d'un sel
 */
function deriveKey(salt: Buffer): Buffer {
  const masterKey = getEncryptionKey();
  return pbkdf2Sync(masterKey, salt, ITERATIONS, 32, 'sha256');
}

/**
 * Structure des données chiffrées
 */
export interface EncryptedData {
  encrypted: string; // Données chiffrées en base64
  iv: string; // Vecteur d'initialisation en base64
  authTag: string; // Tag d'authentification en base64
  salt: string; // Sel pour la dérivation de clé en base64
  version: number; // Version du schéma de chiffrement
}

/**
 * Chiffre une chaîne de caractères avec AES-256-GCM
 * @param plaintext - Texte à chiffrer
 * @returns Objet contenant les données chiffrées
 */
export function encrypt(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error('Le texte à chiffrer ne peut pas être vide');
  }

  // Générer un sel unique pour chaque chiffrement
  const salt = randomBytes(SALT_LENGTH);
  
  // Dériver la clé de chiffrement
  const key = deriveKey(salt);
  
  // Générer un IV unique
  const iv = randomBytes(IV_LENGTH);
  
  // Créer le chiffreur
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  // Chiffrer les données
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Récupérer le tag d'authentification
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
    version: 1,
  };
}

/**
 * Déchiffre des données avec AES-256-GCM
 * @param encryptedData - Objet contenant les données chiffrées
 * @returns Texte déchiffré
 */
export function decrypt(encryptedData: EncryptedData): string {
  if (!encryptedData || !encryptedData.encrypted) {
    throw new Error('Données chiffrées invalides');
  }

  // Vérifier la version
  if (encryptedData.version !== 1) {
    throw new Error(`Version de chiffrement non supportée: ${encryptedData.version}`);
  }

  try {
    // Convertir les données depuis base64
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    
    // Dériver la clé de chiffrement
    const key = deriveKey(salt);
    
    // Créer le déchiffreur
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    
    // Définir le tag d'authentification
    decipher.setAuthTag(authTag);
    
    // Déchiffrer les données
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Échec du déchiffrement: données corrompues ou clé invalide');
  }
}

/**
 * Sérialise les données chiffrées pour le stockage en base de données
 * @param data - Données chiffrées
 * @returns Chaîne JSON sérialisée
 */
export function serializeEncryptedData(data: EncryptedData): string {
  return JSON.stringify(data);
}

/**
 * Désérialise les données chiffrées depuis la base de données
 * @param serialized - Chaîne JSON sérialisée
 * @returns Données chiffrées
 */
export function deserializeEncryptedData(serialized: string): EncryptedData | null {
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as EncryptedData;
  } catch {
    return null;
  }
}

/**
 * Chiffre une valeur et retourne une chaîne sérialisée
 * @param plaintext - Texte à chiffrer
 * @returns Chaîne sérialisée prête pour le stockage
 */
export function encryptForStorage(plaintext: string): string {
  const encrypted = encrypt(plaintext);
  return serializeEncryptedData(encrypted);
}

/**
 * Déchiffre une valeur depuis le stockage
 * @param serialized - Chaîne sérialisée depuis la base de données
 * @returns Texte déchiffré ou null si invalide
 */
export function decryptFromStorage(serialized: string | null): string | null {
  if (!serialized) return null;
  const data = deserializeEncryptedData(serialized);
  if (!data) return null;
  try {
    return decrypt(data);
  } catch {
    return null;
  }
}

/**
 * Hache une valeur de manière sécurisée (one-way)
 * Utile pour les tokens de vérification, etc.
 * @param value - Valeur à hacher
 * @returns Hash en hexadécimal
 */
export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Vérifie si une valeur correspond à un hash
 * @param value - Valeur à vérifier
 * @param hash - Hash attendu
 * @returns true si la correspondance est confirmée
 */
export function verifyHash(value: string, hash: string): boolean {
  return hashValue(value) === hash;
}

/**
 * Génère une clé de chiffrement aléatoire
 * Utile pour générer une nouvelle ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Rotation des clés - rechiffre les données avec la clé actuelle
 * @param oldEncrypted - Données chiffrées avec l'ancienne clé
 * @param oldKey - Ancienne clé de chiffrement
 * @returns Données rechiffrées avec la clé actuelle
 */
export function rotateKey(oldEncrypted: EncryptedData, oldKey: string): EncryptedData {
  // Sauvegarder la clé actuelle
  const currentKey = process.env.ENCRYPTION_KEY;
  
  // Temporairement utiliser l'ancienne clé
  process.env.ENCRYPTION_KEY = oldKey;
  
  try {
    // Déchiffrer avec l'ancienne clé
    const plaintext = decrypt(oldEncrypted);
    
    // Restaurer la clé actuelle
    process.env.ENCRYPTION_KEY = currentKey;
    
    // Rechiffrer avec la nouvelle clé
    return encrypt(plaintext);
  } catch (error) {
    // Restaurer la clé en cas d'erreur
    process.env.ENCRYPTION_KEY = currentKey;
    throw error;
  }
}

/**
 * Migration des données chiffrées - utile pour les mises à jour
 * @param serializedData - Données sérialisées
 * @returns true si les données sont valides et déchiffrables
 */
export function verifyEncryptedData(serializedData: string): boolean {
  const data = deserializeEncryptedData(serializedData);
  if (!data) return false;
  
  try {
    decrypt(data);
    return true;
  } catch {
    return false;
  }
}
