// =====================================================
// RELANCEPRO AFRICA - Cron Configuration
// Configuration for automatic reminder scheduling system
// Tous les textes sont en français
// =====================================================

// Reminder intervals (days after due date)
export const REMINDER_INTERVALS = {
  // Première relance: 3 jours après échéance
  DAY_1: 3,
  // Deuxième relance: 7 jours après échéance
  DAY_2: 7,
  // Troisième relance: 14 jours après échéance
  DAY_3: 14,
} as const;

// Default reminder intervals for new users
export const DEFAULT_REMINDER_INTERVALS = {
  reminderDay1: 3,
  reminderDay2: 7,
  reminderDay3: 14,
} as const;

// Maximum reminders per debt
export const MAX_REMINDERS_PER_DEBT = 3;

// =====================================================
// TIMEZONE CONFIGURATION
// =====================================================

// Fuseau horaire par défaut pour l'Afrique de l'Ouest
export const DEFAULT_TIMEZONE = "Africa/Conakry";

// Fuseaux horaires supportés pour l'Afrique
export const SUPPORTED_TIMEZONES = [
  { value: "Africa/Conakry", label: "Guinée (Conakry)", offset: "GMT+0" },
  { value: "Africa/Dakar", label: "Sénégal (Dakar)", offset: "GMT+0" },
  { value: "Africa/Bamako", label: "Mali (Bamako)", offset: "GMT+0" },
  { value: "Africa/Ouagadougou", label: "Burkina Faso", offset: "GMT+0" },
  { value: "Africa/Abidjan", label: "Côte d'Ivoire", offset: "GMT+0" },
  { value: "Africa/Lagos", label: "Nigeria (Lagos)", offset: "GMT+1" },
  { value: "Africa/Accra", label: "Ghana (Accra)", offset: "GMT+0" },
  { value: "Africa/Niamey", label: "Niger", offset: "GMT+1" },
  { value: "Africa/Cotonou", label: "Bénin", offset: "GMT+1" },
  { value: "Africa/Lome", label: "Togo", offset: "GMT+0" },
  { value: "Africa/Freetown", label: "Sierra Leone", offset: "GMT+0" },
  { value: "Africa/Monrovia", label: "Liberia", offset: "GMT+0" },
  { value: "Africa/Bissau", label: "Guinée-Bissau", offset: "GMT+0" },
  { value: "Africa/Banjul", label: "Gambie", offset: "GMT+0" },
  { value: "Africa/Nouakchott", label: "Mauritanie", offset: "GMT+0" },
] as const;

// =====================================================
// QUIET HOURS CONFIGURATION
// =====================================================

// Heures de repos par défaut (pas d'envoi pendant ces heures)
export const DEFAULT_QUIET_HOURS = {
  start: "22:00", // 22h
  end: "07:00",   // 7h du matin
};

// Heures de repos pour les weekends
export const WEEKEND_QUIET_HOURS = {
  start: "21:00",
  end: "09:00",
};

// =====================================================
// SCHEDULE TIMES
// =====================================================

// Horaires de traitement par lot
export const SCHEDULE_TIMES = {
  // Lot du matin: 9h00
  MORNING: {
    hour: 9,
    minute: 0,
    timezone: DEFAULT_TIMEZONE,
  },
  // Lot de l'après-midi: 14h00
  AFTERNOON: {
    hour: 14,
    minute: 0,
    timezone: DEFAULT_TIMEZONE,
  },
  // Lot du soir: 17h00
  EVENING: {
    hour: 17,
    minute: 0,
    timezone: DEFAULT_TIMEZONE,
  },
} as const;

// =====================================================
// RATE LIMITING CONFIGURATION
// =====================================================

export const RATE_LIMITS = {
  // Maximum de relances par utilisateur par heure
  MAX_REMINDERS_PER_HOUR: 100,
  // Maximum de relances par utilisateur par jour
  MAX_REMINDERS_PER_DAY: 500,
  // Délai entre les tentatives (minutes)
  RETRY_COOLDOWN_MINUTES: 30,
  // Maximum de tentatives pour les relances échouées
  MAX_RETRY_ATTEMPTS: 3,
  // Délai minimum entre deux relances pour le même client (heures)
  MIN_INTERVAL_BETWEEN_REMINDERS_HOURS: 4,
  // Maximum de relances par minute (pour éviter le spam)
  MAX_REMINDERS_PER_MINUTE: 10,
} as const;

// =====================================================
// QUEUE CONFIGURATION
// =====================================================

export const QUEUE_CONFIG = {
  // Taille du lot pour le traitement des relances
  BATCH_SIZE: 50,
  // Délai entre les lots (ms)
  BATCH_DELAY_MS: 1000,
  // Maximum de relances concurrentes
  MAX_CONCURRENT: 10,
  // Intervalle de traitement de la file (minutes)
  PROCESSING_INTERVAL_MINUTES: 5,
  // Délai maximum pour une relance en attente (jours)
  MAX_PENDING_AGE_DAYS: 7,
} as const;

// =====================================================
// CLEANUP CONFIGURATION
// =====================================================

export const CLEANUP_CONFIG = {
  // Jours de conservation des anciennes notifications
  NOTIFICATION_RETENTION_DAYS: 30,
  // Jours de conservation de l'historique de chat
  CHAT_HISTORY_RETENTION_DAYS: 90,
  // Jours de conservation des logs de relance
  REMINDER_LOG_RETENTION_DAYS: 365,
  // Jours avant suppression des comptes démo expirés
  DEMO_ACCOUNT_CLEANUP_DAYS: 7,
  // Jours de conservation des relances planifiées archivées
  ARCHIVED_REMINDER_RETENTION_DAYS: 90,
  // Jours de conservation des fichiers d'export
  EXPORT_FILE_RETENTION_DAYS: 7,
} as const;

// =====================================================
// REMINDER TONES AND CHANNELS
// =====================================================

// Tons des messages pour la personnalisation IA
export const REMINDER_TONES = {
  FIRST: 'friendly' as const,   // Amical pour la première relance
  SECOND: 'formal' as const,    // Formel pour la deuxième
  THIRD: 'urgent' as const,     // Urgent pour la troisième
} as const;

// Canaux d'envoi
export const CHANNELS = {
  EMAIL: 'email' as const,
  WHATSAPP: 'whatsapp' as const,
  BOTH: 'both' as const,
} as const;

// Statuts de la file d'attente
export const QUEUE_STATUS = {
  PENDING: 'pending' as const,
  PROCESSING: 'processing' as const,
  SENT: 'sent' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

// Types de relance
export const REMINDER_TYPES = {
  FIRST: 'first' as const,
  SECOND: 'second' as const,
  THIRD: 'third' as const,
} as const;

// Niveaux de priorité
export const PRIORITY_LEVELS = {
  URGENT: 'urgent' as const,
  NORMAL: 'normal' as const,
  LOW: 'low' as const,
} as const;

// =====================================================
// WEST AFRICAN PHONE PREFIXES
// =====================================================

export const WEST_AFRICA_PHONE_PREFIXES: Record<string, string> = {
  BJ: '229', // Bénin
  BF: '226', // Burkina Faso
  CV: '238', // Cap-Vert
  CI: '225', // Côte d'Ivoire
  GM: '220', // Gambie
  GH: '233', // Ghana
  GN: '224', // Guinée
  GW: '245', // Guinée-Bissau
  LR: '231', // Liberia
  ML: '223', // Mali
  MR: '222', // Mauritanie
  NE: '227', // Niger
  NG: '234', // Nigeria
  SN: '221', // Sénégal
  SL: '232', // Sierra Leone
  TG: '228', // Togo
};

// Préfixe téléphonique par défaut (Guinée)
export const DEFAULT_PHONE_PREFIX = '224';

// =====================================================
// CRON SCHEDULE EXPRESSIONS
// =====================================================

export const CRON_SCHEDULES = {
  // Traitement des relances toutes les 5 minutes
  REMINDERS: '*/5 * * * *',
  // Vérification des abonnements expirés toutes les heures
  EXPIRED_CHECK: '0 * * * *',
  // Nettoyage quotidien à minuit
  CLEANUP: '0 0 * * *',
  // Rapports quotidiens à 6h du matin
  DAILY_REPORT: '0 6 * * *',
  // Analyse des risques quotidiennement à 7h
  RISK_ANALYSIS: '0 7 * * *',
  // Archivage hebdomadaire le dimanche à 2h
  ARCHIVE: '0 2 * * 0',
} as const;

// =====================================================
// SEND WINDOW CONFIGURATION
// =====================================================

// Fenêtres d'envoi (éviter les heures tardives/tôt le matin)
export const SEND_WINDOW = {
  START_HOUR: 8,  // 8h00
  END_HOUR: 20,   // 20h00
  WEEKEND_START_HOUR: 10, // 10h00 le weekend
  WEEKEND_END_HOUR: 18,   // 18h00 le weekend
} as const;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Vérifie si l'heure actuelle est dans la fenêtre d'envoi
 */
export function isWithinSendWindow(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): boolean {
  const hour = getHourInTimezone(date, timezone);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return hour >= SEND_WINDOW.WEEKEND_START_HOUR && hour < SEND_WINDOW.WEEKEND_END_HOUR;
  }

  return hour >= SEND_WINDOW.START_HOUR && hour < SEND_WINDOW.END_HOUR;
}

/**
 * Vérifie si l'heure actuelle est dans les heures de repos
 */
export function isInQuietHours(
  date: Date = new Date(),
  quietStart: string = DEFAULT_QUIET_HOURS.start,
  quietEnd: string = DEFAULT_QUIET_HOURS.end,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const hour = getHourInTimezone(date, timezone);
  const minute = date.getMinutes();
  const currentTime = hour * 60 + minute;

  const [startHour, startMin] = quietStart.split(':').map(Number);
  const [endHour, endMin] = quietEnd.split(':').map(Number);
  
  const quietStartMinutes = startHour * 60 + startMin;
  const quietEndMinutes = endHour * 60 + endMin;

  // Si les heures de repos traversent minuit (ex: 22h à 7h)
  if (quietStartMinutes > quietEndMinutes) {
    return currentTime >= quietStartMinutes || currentTime < quietEndMinutes;
  }

  return currentTime >= quietStartMinutes && currentTime < quietEndMinutes;
}

/**
 * Obtient l'heure dans le fuseau horaire spécifié
 */
export function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(date), 10);
  } catch {
    // Fallback à l'heure locale si le fuseau horaire est invalide
    return date.getHours();
  }
}

/**
 * Obtient la prochaine heure d'envoi valide
 */
export function getNextSendTime(
  from: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
  quietStart: string = DEFAULT_QUIET_HOURS.start,
  quietEnd: string = DEFAULT_QUIET_HOURS.end
): Date {
  const next = new Date(from);
  
  // Avancer jusqu'à trouver une heure valide
  let attempts = 0;
  const maxAttempts = 48; // Maximum 48 heures à avancer
  
  while (attempts < maxAttempts) {
    const hour = getHourInTimezone(next, timezone);
    const dayOfWeek = next.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const startHour = isWeekend ? SEND_WINDOW.WEEKEND_START_HOUR : SEND_WINDOW.START_HOUR;
    const endHour = isWeekend ? SEND_WINDOW.WEEKEND_END_HOUR : SEND_WINDOW.END_HOUR;

    // Vérifier si on est dans la fenêtre d'envoi et hors des heures de repos
    if (hour >= startHour && hour < endHour && !isInQuietHours(next, quietStart, quietEnd, timezone)) {
      return next;
    }

    // Avancer d'une heure
    next.setHours(next.getHours() + 1, 0, 0, 0);
    attempts++;
  }

  // Fallback: retourner le lendemain à 9h
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

/**
 * Calcule la prochaine date de relance basée sur les paramètres
 */
export function calculateNextReminderDate(
  currentReminderNumber: number,
  reminderDays: { day1: number; day2: number; day3: number },
  timezone: string = DEFAULT_TIMEZONE
): Date | null {
  if (currentReminderNumber >= MAX_REMINDERS_PER_DEBT) {
    return null;
  }

  const now = new Date();
  const nextDate = new Date(now);

  let daysToAdd = 0;
  if (currentReminderNumber === 0) {
    daysToAdd = reminderDays.day1;
  } else if (currentReminderNumber === 1) {
    daysToAdd = reminderDays.day2 - reminderDays.day1;
  } else if (currentReminderNumber === 2) {
    daysToAdd = reminderDays.day3 - reminderDays.day2;
  }

  nextDate.setDate(nextDate.getDate() + daysToAdd);

  // S'assurer que c'est dans la fenêtre d'envoi
  return getNextSendTime(nextDate, timezone);
}

/**
 * Convertit une date dans le fuseau horaire spécifié
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    return new Date(
      parseInt(getPart('year')),
      parseInt(getPart('month')) - 1,
      parseInt(getPart('day')),
      parseInt(getPart('hour')),
      parseInt(getPart('minute')),
      parseInt(getPart('second'))
    );
  } catch {
    return date;
  }
}

/**
 * Formate une date pour l'affichage dans le fuseau horaire spécifié
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      ...options,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }
}

// =====================================================
// TYPE EXPORTS
// =====================================================

export type ReminderTone = typeof REMINDER_TONES[keyof typeof REMINDER_TONES];
export type Channel = typeof CHANNELS[keyof typeof CHANNELS];
export type QueueStatus = typeof QUEUE_STATUS[keyof typeof QUEUE_STATUS];
export type ReminderType = typeof REMINDER_TYPES[keyof typeof REMINDER_TYPES];
export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];
export type TimezoneOption = typeof SUPPORTED_TIMEZONES[number];
