/**
 * RelancePro Africa - Logging Utility
 * Centralized logging with levels and production filtering
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  
  if (data !== undefined) {
    return `${prefix} ${message} ${typeof data === 'object' ? JSON.stringify(data) : data}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  debug(context: string, message: string, data?: unknown): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', context, message, data));
    }
  },

  info(context: string, message: string, data?: unknown): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.log(formatMessage('info', context, message, data));
    }
  },

  warn(context: string, message: string, data?: unknown): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', context, message, data));
    }
  },

  error(context: string, message: string, error?: unknown): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(formatMessage('error', context, message, errorMessage));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  },

  // For webhooks and external services - always log in production
  webhook(provider: string, event: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'production') {
      console.log(formatMessage('info', provider.toUpperCase(), event, data));
    } else {
      console.log(formatMessage('debug', provider.toUpperCase(), event, data));
    }
  },

  // For cron jobs
  cron(jobName: string, message: string, data?: unknown): void {
    console.log(formatMessage('info', `CRON:${jobName}`, message, data));
  },
};

export default logger;
