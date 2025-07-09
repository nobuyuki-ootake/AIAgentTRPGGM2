import * as fs from 'fs';
import * as path from 'path';

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
  requestId?: string;
  ip?: string;
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

class StructuredLogger implements Logger {
  private logLevel: LogLevel;
  private logDir: string;
  private logFile: string;
  private context: LogContext;
  private writeStream: fs.WriteStream | null = null;

  constructor(
    logLevel: LogLevel = LogLevel.INFO,
    logDir: string = './logs',
    context: LogContext = {}
  ) {
    this.logLevel = logLevel;
    this.logDir = logDir;
    this.context = context;
    this.logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    
    this.ensureLogDirectory();
    this.initializeWriteStream();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private initializeWriteStream(): void {
    this.writeStream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private log(level: LogLevel, message: string, context?: LogContext, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      data
    };

    // Stack trace for errors
    if (level >= LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    // Console output
    const consoleMessage = this.formatConsoleMessage(entry);
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(consoleMessage);
        break;
    }

    // File output
    if (this.writeStream) {
      this.writeStream.write(this.formatLogEntry(entry));
    }
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level];
    const contextStr = entry.context ? ` [${Object.entries(entry.context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    
    return `[${entry.timestamp}] ${levelStr}${contextStr}: ${entry.message}${dataStr}`;
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
    return new StructuredLogger(
      this.logLevel,
      this.logDir,
      { ...this.context, ...context }
    );
  }
}

// Configuration from environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || './logs';

const logLevelMap: { [key: string]: LogLevel } = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL
};

const logLevel = logLevelMap[LOG_LEVEL.toLowerCase()] || LogLevel.INFO;

export const logger = new StructuredLogger(logLevel, LOG_DIR);