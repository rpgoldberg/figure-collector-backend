/**
 * Production-safe debug logging utility
 * Enable debug logs with environment variables:
 * - DEBUG=true - Enable all debug logging
 * - DEBUG_LEVEL=verbose|info|warn - Set specific level
 * - DEBUG_MODULES=auth,version,register - Enable specific modules
 */

const DEBUG = process.env.DEBUG === 'true';
const DEBUG_LEVEL = process.env.DEBUG_LEVEL || (process.env.NODE_ENV === 'development' ? 'info' : 'error');
const DEBUG_MODULES = process.env.DEBUG_MODULES?.split(',') || [];

type LogLevel = 'verbose' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  verbose: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private module: string;
  private enabled: boolean;
  private level: number;

  constructor(module: string) {
    this.module = module;
    this.enabled = DEBUG || DEBUG_MODULES.includes(module) || DEBUG_MODULES.includes('*');
    this.level = LOG_LEVELS[DEBUG_LEVEL as LogLevel] || LOG_LEVELS.error;
  }

  verbose(...args: any[]) {
    if (this.enabled && this.level <= LOG_LEVELS.verbose) {
      console.log(`[${this.module}:VERBOSE]`, new Date().toISOString(), ...args);
    }
  }

  info(...args: any[]) {
    if (this.enabled && this.level <= LOG_LEVELS.info) {
      console.info(`[${this.module}:INFO]`, new Date().toISOString(), ...args);
    }
  }

  warn(...args: any[]) {
    if (this.enabled && this.level <= LOG_LEVELS.warn) {
      console.warn(`[${this.module}:WARN]`, new Date().toISOString(), ...args);
    }
  }

  error(...args: any[]) {
    // Always log errors
    console.error(`[${this.module}:ERROR]`, new Date().toISOString(), ...args);
  }

  // Log only in development or when explicitly enabled
  debug(...args: any[]) {
    if (this.enabled) {
      console.log(`[${this.module}:DEBUG]`, new Date().toISOString(), ...args);
    }
  }
}

// Factory function to create module-specific loggers
export const createLogger = (module: string): Logger => {
  return new Logger(module);
};

// Pre-configured loggers for common modules
export const authLogger = createLogger('AUTH');
export const versionLogger = createLogger('VERSION');
export const registerLogger = createLogger('REGISTER');
export const dbLogger = createLogger('DATABASE');

// Export the Logger class for custom instances
export default Logger;