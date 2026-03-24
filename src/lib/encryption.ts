// Encryption utilities for sensitive data

import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-encryption-key-32ch!"
const ALGORITHM = "aes-256-gcm"

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":")
  
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}

export function encryptForStorage(data: object): string {
  return encrypt(JSON.stringify(data))
}

export function decryptFromStorage<T>(encryptedData: string): T {
  return JSON.parse(decrypt(encryptedData))
}

export function hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex")
}
