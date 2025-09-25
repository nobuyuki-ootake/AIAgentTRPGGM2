/**
 * Frontend logger utility
 * フロントエンド用の構造化ロガー
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  campaignId?: string;
  action?: string;
  page?: string;
  userAgent?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
  data?: any;
  url?: string;
  userAgent?: string;
}

interface Logger {
  info: (message: string, context?: LogContext, data?: any) => void;
  warn: (message: string, context?: LogContext, data?: any) => void;
  error: (message: string, context?: LogContext, data?: any) => void;
  debug: (message: string, context?: LogContext, data?: any) => void;
  fatal: (message: string, context?: LogContext, data?: any) => void;
  setContext: (context: LogContext) => Logger;
  child: (context: LogContext) => Logger;
}

class FrontendLogger implements Logger {
  private logLevel: LogLevel;
  private context: LogContext;
  private isDevelopment: boolean;

  constructor(
    logLevel: LogLevel = LogLevel.INFO,
    context: LogContext = {}
  ) {
    this.logLevel = logLevel;
    this.context = context;
    this.isDevelopment = import.meta.env.MODE === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    data?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stack: level >= LogLevel.ERROR ? new Error().stack : undefined
    };
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level];
    const contextStr = entry.context 
      ? ` [${Object.entries(entry.context).map(([k, v]) => `${k}=${v}`).join(', ')}]` 
      : '';
    
    return `[${entry.timestamp}] ${levelStr}${contextStr}: ${entry.message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, context, data);
    const consoleMessage = this.formatConsoleMessage(entry);

    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(consoleMessage, entry.data);
        }
        break;
      case LogLevel.INFO:
        if (this.isDevelopment) {
          console.info(consoleMessage, entry.data);
        }
        break;
      case LogLevel.WARN:
        if (this.isDevelopment) {
          console.warn(consoleMessage, entry.data);
        }
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(consoleMessage, entry.data);
        break;
    }

    // Send to backend for persistent logging (for errors and above)
    if (level >= LogLevel.ERROR) {
      this.sendToBackend(entry);
    }

    // Store in localStorage for debugging (development only)
    if (this.isDevelopment) {
      this.storeInLocalStorage(entry);
    }
  }

  private async sendToBackend(entry: LogEntry): Promise<void> {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fallback to console if backend is unavailable
      console.error('Failed to send log to backend:', error);
    }
  }

  private storeInLocalStorage(entry: LogEntry): void {
    try {
      const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
      logs.push(entry);
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('debug_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log in localStorage:', error);
    }
  }

  debug(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  fatal(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.FATAL, message, context, data);
  }

  setContext(context: LogContext): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }

  child(context: LogContext): Logger {
    return new FrontendLogger(
      this.logLevel,
      { ...this.context, ...context }
    );
  }
}

// Configuration from environment
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'info';

const logLevelMap: { [key: string]: LogLevel } = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL
};

const logLevel = logLevelMap[LOG_LEVEL.toLowerCase()] || LogLevel.INFO;

export const logger = new FrontendLogger(logLevel);