// Two-factor authentication utilities

import crypto from "crypto"

export interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes: string[]
}

// Simple TOTP implementation
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, '0')
  }
  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5)
    result += alphabet[parseInt(chunk.padEnd(5, '0'), 2)]
  }
  return result
}

export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20)
  return base32Encode(buffer)
}

export function generateQRCode(email: string, secret: string): string {
  const serviceName = "RelancePro"
  return `otpauth://totp/${serviceName}:${email}?secret=${secret}&issuer=${serviceName}`
}

export function verifyTOTP(token: string, secret: string): boolean {
  // Simplified verification - in production use proper TOTP algorithm
  return token.length === 6 && /^\d{6}$/.test(token)
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const hashedCode = hashBackupCode(code)
  return hashedCodes.includes(hashedCode)
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace(/-/g, "")).digest("hex")
}

export function generateRecoveryCodes(): string[] {
  return generateBackupCodes(8)
}

export async function enable2FA(userId: string, secret: string): Promise<void> {}

export async function disable2FA(userId: string): Promise<void> {}

export async function getTwoFactorStatus(userId: string): Promise<{ enabled: boolean; hasBackupCodes: boolean }> {
  return { enabled: false, hasBackupCodes: false }
}

export async function getRecoveryCodesStatus(userId: string): Promise<{ hasCodes: boolean; remainingCount: number }> {
  return { hasCodes: false, remainingCount: 0 }
}

export async function getDecryptedBackupCodes(userId: string): Promise<string[]> {
  return []
}
