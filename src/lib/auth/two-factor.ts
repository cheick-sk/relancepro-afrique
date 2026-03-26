import { TOTP } from 'otplib';

const totp = new TOTP();

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}

export function generateTOTPSecret(): string {
  return totp.options.secret || '';
}

export function generateQRCode(secret: string, email: string): string {
  const serviceName = 'RelancePro Afrique';
  // Use otpauth URL format
  const encodedService = encodeURIComponent(serviceName);
  const encodedEmail = encodeURIComponent(email);
  const otpauth = `otpauth://totp/${encodedService}:${encodedEmail}?secret=${secret}&issuer=${encodedService}&algorithm=SHA1&digits=6&period=30`;
  
  // Return Google Charts URL for QR code
  return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(otpauth)}`;
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = Array.from({ length: 8 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
    codes.push(code);
  }
  
  return codes;
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    totp.options = { secret };
    return totp.verify({ token });
  } catch {
    return false;
  }
}

export function verifyBackupCode(code: string, storedCodes: string[]): { valid: boolean; remainingCodes: string[] } {
  const index = storedCodes.indexOf(code);
  
  if (index === -1) {
    return { valid: false, remainingCodes: storedCodes };
  }
  
  const remainingCodes = [...storedCodes];
  remainingCodes.splice(index, 1);
  
  return { valid: true, remainingCodes };
}

export async function enable2FA(userId: string, secret: string): Promise<void> {
  console.log('Enabling 2FA for user:', userId);
}

export async function disable2FA(userId: string): Promise<void> {
  console.log('Disabling 2FA for user:', userId);
}

export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  return {
    enabled: false,
    hasBackupCodes: false,
  backupCodesCount: 0,
  };
}

export async function getRecoveryCodesStatus(userId: string): Promise<{ hasCodes: boolean; count: number }> {
  return { hasCodes: false, count: 0 };
}

export function generateRecoveryCodes(count: number = 8): string[] {
  return generateBackupCodes(count);
}

export async function getDecryptedBackupCodes(userId: string): Promise<string[]> {
  return [];
}

// Export a TOTP instance for direct use
export { totp as authenticator };
