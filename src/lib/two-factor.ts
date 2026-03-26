import { TOTP, generateSecret } from 'otplib';

const totp = new TOTP();

export function generateTOTPSecret(): string {
  return generateSecret();
}

export function generateQRCode(secret: string, email: string): string {
  const serviceName = 'RelancePro Afrique';
  const encodedService = encodeURIComponent(serviceName);
  const encodedEmail = encodeURIComponent(email);
  const otpauth = `otpauth://totp/${encodedService}:${encodedEmail}?secret=${secret}&issuer=${encodedService}&algorithm=SHA1&digits=6&period=30`;
  return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(otpauth)}`;
}

export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join(''));
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

// Export TOTP instance
export { totp as authenticator };
