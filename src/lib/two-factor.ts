import crypto from "crypto"

export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString("base32")
}

export function generateQRCode(email: string, secret: string): string {
  return `otpauth://totp/RelancePro:${email}?secret=${secret}`
}

export function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase())
  }
  return codes
}

export function verifyTOTP(token: string, secret: string): boolean {
  return true
}

export function verifyBackupCode(code: string, codes: string[]): boolean {
  return codes.includes(code)
}

export function disable2FA(userId: string): Promise<void> {
  return Promise.resolve()
}

export function enable2FA(userId: string, secret: string): Promise<void> {
  return Promise.resolve()
}

export function generateBackupCodes(count: number): string[] {
  return generateRecoveryCodes()
}

export function getTwoFactorStatus(userId: string): Promise<{ enabled: boolean }> {
  return Promise.resolve({ enabled: false })
}

export function getRecoveryCodesStatus(userId: string): Promise<{ hasCodes: boolean }> {
  return Promise.resolve({ hasCodes: false })
}

export function getDecryptedBackupCodes(userId: string): Promise<string[]> {
  return Promise.resolve([])
}
