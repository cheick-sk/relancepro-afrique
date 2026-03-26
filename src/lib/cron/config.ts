export const CLEANUP_CONFIG = {
  maxLogAgeDays: 90,
  maxSessionAgeDays: 30,
  maxApiLogAgeDays: 30,
  cleanupIntervalHours: 24,
};

export const DEMO_CLEANUP_CONFIG = {
  maxDemoAgeDays: 30,
  cleanupIntervalHours: 12,
};

export const DEFAULT_QUIET_HOURS = {
  start: 22, // 10 PM
  end: 7, // 7 AM
};

export const DEFAULT_REMINDER_CONFIG = {
  maxRemindersPerDay: 3,
  minIntervalHours: 4,
  maxRetries: 3,
};

export const DEFAULT_TIMEZONE = 'Africa/Conakry';

export const SUPPORTED_TIMEZONES = [
  { value: 'Africa/Conakry', label: 'Guinée (Conakry)' },
  { value: 'Africa/Abidjan', label: "Côte d'Ivoire (Abidjan)" },
  { value: 'Africa/Dakar', label: 'Sénégal (Dakar)' },
  { value: 'Africa/Bamako', label: 'Mali (Bamako)' },
  { value: 'Africa/Ouagadougou', label: 'Burkina Faso (Ouagadougou)' },
  { value: 'Africa/Douala', label: 'Cameroun (Douala)' },
];

export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
};

export const PAYMENT_PREDICTION_CONFIG = {
  minHistoricalPayments: 3,
  predictionHorizonDays: 90,
  confidenceThreshold: 0.7,
};

export function isCronEnabled(): boolean {
  return process.env.CRON_ENABLED === 'true';
}

export function verifyCronSecret(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret');
  return secret === process.env.CRON_SECRET;
}

export function calculateReminderDate(baseDate: Date, daysOffset: number): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + daysOffset);
  return result;
}
