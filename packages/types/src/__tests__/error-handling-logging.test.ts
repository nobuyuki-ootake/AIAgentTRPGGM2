/**
 * エラーハンドリングとログユーティリティの包括的テスト
 * Error Handling and Logging Utilities Comprehensive Tests
 * 
 * テスト対象:
 * - カスタムエラークラス
 * - エラー分類と重要度
 * - ログフォーマッティング
 * - エラー追跡とスタックトレース
 * - ログレベルとフィルタリング
 * - 構造化ログ出力
 */

import type { ValidationError, DateTime } from '../index';

// ==========================================
// カスタムエラークラスの実装
// ==========================================

/**
 * エラーの重要度
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * エラーカテゴリ
 */
export type ErrorCategory = 
  | 'validation' 
  | 'authentication' 
  | 'authorization' 
  | 'not_found' 
  | 'conflict' 
  | 'rate_limit' 
  | 'external_service' 
  | 'database' 
  | 'network' 
  | 'configuration' 
  | 'internal';

/**
 * TRPGアプリケーション専用のベースエラークラス
 */
export class TRPGError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context: Record<string, any>;
  public readonly timestamp: DateTime;
  public readonly userMessage?: string;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    options: {
      code: string;
      severity?: ErrorSeverity;
      category: ErrorCategory;
      context?: Record<string, any>;
      userMessage?: string;
      isRetryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'TRPGError';
    this.code = options.code;
    this.severity = options.severity || 'medium';
    this.category = options.category;
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();
    this.userMessage = options.userMessage;
    this.isRetryable = options.isRetryable || false;

    if (options.cause) {
      this.cause = options.cause;
    }

    // スタックトレースの調整
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TRPGError);
    }
  }

  /**
   * エラーの詳細情報をJSON形式で取得
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp,
      userMessage: this.userMessage,
      isRetryable: this.isRetryable,
      stack: this.stack
    };
  }

  /**
   * ユーザー向けの安全なエラー情報を取得
   */
  toUserSafeJSON(): Record<string, any> {
    return {
      message: this.userMessage || 'エラーが発生しました',
      code: this.code,
      severity: this.severity,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp
    };
  }
}

/**
 * バリデーションエラー専用クラス
 */
export class TRPGValidationError extends TRPGError {
  public readonly validationErrors: ValidationError[];

  constructor(
    message: string,
    validationErrors: ValidationError[],
    context?: Record<string, any>
  ) {
    super(message, {
      code: 'VALIDATION_FAILED',
      severity: 'medium',
      category: 'validation',
      context: { ...context, validationErrorCount: validationErrors.length },
      userMessage: '入力内容に問題があります',
      isRetryable: true
    });
    
    this.name = 'TRPGValidationError';
    this.validationErrors = validationErrors;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * AI関連エラー専用クラス
 */
export class TRPGAIError extends TRPGError {
  public readonly provider: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    provider: string,
    options: {
      code: string;
      requestId?: string;
      context?: Record<string, any>;
      isRetryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message, {
      code: options.code,
      severity: 'high',
      category: 'external_service',
      context: { provider, ...options.context },
      userMessage: 'AI処理でエラーが発生しました。しばらく待ってから再試行してください',
      isRetryable: options.isRetryable !== false,
      cause: options.cause
    });
    
    this.name = 'TRPGAIError';
    this.provider = provider;
    this.requestId = options.requestId;
  }
}

// ==========================================
// ログレベルとログユーティリティ
// ==========================================

/**
 * ログレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * ログエントリ
 */
export interface LogEntry {
  timestamp: DateTime;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: TRPGError;
  requestId?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * ログレベルの数値優先度
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

/**
 * 構造化ログ出力クラス
 */
export class StructuredLogger {
  private minLevel: LogLevel;
  private context: Record<string, any>;
  private outputs: Array<(entry: LogEntry) => void>;

  constructor(
    minLevel: LogLevel = 'info',
    globalContext: Record<string, any> = {}
  ) {
    this.minLevel = minLevel;
    this.context = globalContext;
    this.outputs = [];
  }

  /**
   * ログ出力先を追加
   */
  addOutput(output: (entry: LogEntry) => void): void {
    this.outputs.push(output);
  }

  /**
   * ログレベルが出力対象かチェック
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * ログエントリを作成して出力
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: TRPGError
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
      requestId: context?.requestId,
      userId: context?.userId,
      sessionId: context?.sessionId
    };

    this.outputs.forEach(output => {
      try {
        output(entry);
      } catch (outputError) {
        // ログ出力エラーを避けるため、エラーを抑制
        console.error('Log output error:', outputError);
      }
    });
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: TRPGError, context?: Record<string, any>): void {
    this.log('error', message, context, error);
  }

  fatal(message: string, error?: TRPGError, context?: Record<string, any>): void {
    this.log('fatal', message, context, error);
  }

  /**
   * 子ロガーを作成（追加コンテキスト付き）
   */
  child(additionalContext: Record<string, any>): StructuredLogger {
    const childLogger = new StructuredLogger(this.minLevel, {
      ...this.context,
      ...additionalContext
    });
    childLogger.outputs = [...this.outputs];
    return childLogger;
  }

  /**
   * ログレベルを変更
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * コンソール出力フォーマッター
 */
export function createConsoleOutput(colorize: boolean = true): (entry: LogEntry) => void {
  const colors = {
    debug: '\x1b[36m',   // cyan
    info: '\x1b[32m',    // green
    warn: '\x1b[33m',    // yellow
    error: '\x1b[31m',   // red
    fatal: '\x1b[35m',   // magenta
    reset: '\x1b[0m'
  };

  return (entry: LogEntry) => {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase();
    const color = colorize ? colors[entry.level] : '';
    const reset = colorize ? colors.reset : '';
    
    let output = `${color}[${timestamp}] ${level}:${reset} ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.error) {
      output += `\n  Error: ${JSON.stringify(entry.error.toJSON(), null, 2)}`;
    }
    
    console.log(output);
  };
}

/**
 * JSON出力フォーマッター
 */
export function createJSONOutput(): (entry: LogEntry) => void {
  return (entry: LogEntry) => {
    const jsonEntry = {
      ...entry,
      error: entry.error ? entry.error.toJSON() : undefined
    };
    console.log(JSON.stringify(jsonEntry));
  };
}

// ==========================================
// エラーハンドリングユーティリティ
// ==========================================

/**
 * エラーの分類と適切な処理を決定
 */
export function categorizeError(error: unknown): {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  userMessage: string;
} {
  if (error instanceof TRPGError) {
    return {
      category: error.category,
      severity: error.severity,
      isRetryable: error.isRetryable,
      userMessage: error.userMessage || 'エラーが発生しました'
    };
  }

  if (error instanceof Error) {
    // 一般的なJavaScriptエラーの分類
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        category: 'network',
        severity: 'medium',
        isRetryable: true,
        userMessage: 'ネットワークエラーが発生しました。接続を確認してください'
      };
    }

    if (error.message.includes('timeout')) {
      return {
        category: 'external_service',
        severity: 'medium',
        isRetryable: true,
        userMessage: 'タイムアウトエラーが発生しました。しばらく待ってから再試行してください'
      };
    }

    return {
      category: 'internal',
      severity: 'high',
      isRetryable: false,
      userMessage: '予期しないエラーが発生しました'
    };
  }

  return {
    category: 'internal',
    severity: 'high',
    isRetryable: false,
    userMessage: '不明なエラーが発生しました'
  };
}

/**
 * エラーのサニタイズ（機密情報の除去）
 */
export function sanitizeError(error: TRPGError): TRPGError {
  const sanitizedContext = { ...error.context };
  
  // 機密情報のキーワードを除去
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
  sensitiveKeys.forEach(key => {
    Object.keys(sanitizedContext).forEach(contextKey => {
      if (contextKey.toLowerCase().includes(key)) {
        sanitizedContext[contextKey] = '[REDACTED]';
      }
    });
  });

  return new TRPGError(error.message, {
    code: error.code,
    severity: error.severity,
    category: error.category,
    context: sanitizedContext,
    userMessage: error.userMessage,
    isRetryable: error.isRetryable
  });
}

/**
 * リトライ可能なエラーの判定
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof TRPGError) {
    return error.isRetryable;
  }

  const { isRetryable } = categorizeError(error);
  return isRetryable;
}

/**
 * エラー集約（同じエラーの重複を検出）
 */
export function aggregateErrors(
  errors: TRPGError[],
  timeWindow: number = 60000 // 1分
): Array<{ error: TRPGError; count: number; firstSeen: DateTime; lastSeen: DateTime }> {
  const groups = new Map<string, {
    error: TRPGError;
    count: number;
    firstSeen: DateTime;
    lastSeen: DateTime;
  }>();

  const now = Date.now();

  errors.forEach(error => {
    const errorTime = new Date(error.timestamp).getTime();
    if (now - errorTime > timeWindow) return; // 時間窓外は除外

    const key = `${error.code}:${error.message}`;
    const existing = groups.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = error.timestamp;
    } else {
      groups.set(key, {
        error,
        count: 1,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp
      });
    }
  });

  return Array.from(groups.values());
}

// ==========================================
// テストスイート
// ==========================================

describe('エラーハンドリングとログユーティリティの包括的テスト', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('TRPGErrorクラス', () => {
    test('基本的なエラー情報を正しく設定する', () => {
      const error = new TRPGError('Test error message', {
        code: 'TEST_ERROR',
        category: 'validation',
        severity: 'high',
        context: { userId: '123' },
        userMessage: 'ユーザー向けメッセージ',
        isRetryable: true
      });

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe('validation');
      expect(error.severity).toBe('high');
      expect(error.context).toEqual({ userId: '123' });
      expect(error.userMessage).toBe('ユーザー向けメッセージ');
      expect(error.isRetryable).toBe(true);
      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('デフォルト値を正しく設定する', () => {
      const error = new TRPGError('Test error', {
        code: 'TEST',
        category: 'internal'
      });

      expect(error.severity).toBe('medium');
      expect(error.context).toEqual({});
      expect(error.userMessage).toBeUndefined();
      expect(error.isRetryable).toBe(false);
    });

    test('JSON形式で完全な情報を出力する', () => {
      const error = new TRPGError('Test error', {
        code: 'TEST',
        category: 'validation',
        context: { field: 'name' }
      });

      const json = error.toJSON();
      expect(json).toHaveProperty('name', 'TRPGError');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', 'TEST');
      expect(json).toHaveProperty('category', 'validation');
      expect(json).toHaveProperty('context', { field: 'name' });
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('stack');
    });

    test('ユーザー安全な情報のみを出力する', () => {
      const error = new TRPGError('Internal error with sensitive data', {
        code: 'INTERNAL_ERROR',
        category: 'internal',
        context: { apiKey: 'secret123', userId: '456' },
        userMessage: '一般的なエラーメッセージ'
      });

      const safeJson = error.toUserSafeJSON();
      expect(safeJson).not.toHaveProperty('stack');
      expect(safeJson).not.toHaveProperty('context');
      expect(safeJson.message).toBe('一般的なエラーメッセージ');
      expect(safeJson.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('TRPGValidationErrorクラス', () => {
    test('バリデーションエラーを正しく処理する', () => {
      const validationErrors: ValidationError[] = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
        { field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' }
      ];

      const error = new TRPGValidationError(
        'Validation failed',
        validationErrors,
        { formId: 'user-form' }
      );

      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.category).toBe('validation');
      expect(error.severity).toBe('medium');
      expect(error.isRetryable).toBe(true);
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.context.validationErrorCount).toBe(2);
      expect(error.context.formId).toBe('user-form');
    });

    test('バリデーションエラーを含むJSONを出力する', () => {
      const validationErrors: ValidationError[] = [
        { field: 'name', message: 'Required', code: 'REQUIRED' }
      ];

      const error = new TRPGValidationError('Validation failed', validationErrors);
      const json = error.toJSON();

      expect(json.validationErrors).toEqual(validationErrors);
    });
  });

  describe('TRPGAIErrorクラス', () => {
    test('AI関連エラーを正しく処理する', () => {
      const error = new TRPGAIError('OpenAI API error', 'openai', {
        code: 'API_RATE_LIMIT',
        requestId: 'req_123',
        context: { model: 'gpt-4' },
        isRetryable: true
      });

      expect(error.category).toBe('external_service');
      expect(error.severity).toBe('high');
      expect(error.provider).toBe('openai');
      expect(error.requestId).toBe('req_123');
      expect(error.isRetryable).toBe(true);
      expect(error.context.provider).toBe('openai');
      expect(error.context.model).toBe('gpt-4');
    });

    test('デフォルトでリトライ可能とする', () => {
      const error = new TRPGAIError('API timeout', 'anthropic', {
        code: 'TIMEOUT'
      });

      expect(error.isRetryable).toBe(true);
    });
  });

  describe('StructuredLoggerクラス', () => {
    test('ログレベルフィルタリングが正しく動作する', () => {
      const outputs: LogEntry[] = [];
      const logger = new StructuredLogger('warn');
      logger.addOutput((entry) => outputs.push(entry));

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(outputs).toHaveLength(2);
      expect(outputs[0].level).toBe('warn');
      expect(outputs[1].level).toBe('error');
    });

    test('グローバルコンテキストが各ログに含まれる', () => {
      const outputs: LogEntry[] = [];
      const logger = new StructuredLogger('debug', { service: 'trpg-app', version: '1.0.0' });
      logger.addOutput((entry) => outputs.push(entry));

      logger.info('Test message', { userId: '123' });

      expect(outputs[0].context).toEqual({
        service: 'trpg-app',
        version: '1.0.0',
        userId: '123'
      });
    });

    test('子ロガーが親のコンテキストを継承する', () => {
      const outputs: LogEntry[] = [];
      const parentLogger = new StructuredLogger('debug', { service: 'trpg-app' });
      const childLogger = parentLogger.child({ component: 'auth' });
      
      parentLogger.addOutput((entry) => outputs.push(entry));
      childLogger.info('Child log message');

      expect(outputs[0].context).toEqual({
        service: 'trpg-app',
        component: 'auth'
      });
    });

    test('エラーオブジェクトを正しく処理する', () => {
      const outputs: LogEntry[] = [];
      const logger = new StructuredLogger('debug');
      logger.addOutput((entry) => outputs.push(entry));

      const error = new TRPGError('Test error', {
        code: 'TEST',
        category: 'validation'
      });

      logger.error('Error occurred', error, { action: 'user-registration' });

      expect(outputs[0].error).toBe(error);
      expect(outputs[0].context?.action).toBe('user-registration');
    });
  });

  describe('ログ出力フォーマッター', () => {
    test('コンソール出力フォーマッターが正しい形式で出力する', () => {
      const consoleOutput = createConsoleOutput(false);
      const entry: LogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        level: 'info',
        message: 'Test message',
        context: { userId: '123' }
      };

      consoleOutput(entry);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[2024-01-15T10:30:00.000Z] INFO: Test message')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Context: {')
      );
    });

    test('JSON出力フォーマッターが正しいJSON形式で出力する', () => {
      const jsonOutput = createJSONOutput();
      const error = new TRPGError('Test error', {
        code: 'TEST',
        category: 'validation'
      });
      
      const entry: LogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        level: 'error',
        message: 'Error message',
        error
      };

      jsonOutput(entry);

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.timestamp).toBe('2024-01-15T10:30:00.000Z');
      expect(loggedData.level).toBe('error');
      expect(loggedData.message).toBe('Error message');
      expect(loggedData.error.code).toBe('TEST');
    });
  });

  describe('エラー分類ユーティリティ', () => {
    test('TRPGErrorを正しく分類する', () => {
      const error = new TRPGError('Custom error', {
        code: 'CUSTOM',
        category: 'authentication',
        severity: 'high',
        isRetryable: false,
        userMessage: 'カスタムメッセージ'
      });

      const categorized = categorizeError(error);
      expect(categorized.category).toBe('authentication');
      expect(categorized.severity).toBe('high');
      expect(categorized.isRetryable).toBe(false);
      expect(categorized.userMessage).toBe('カスタムメッセージ');
    });

    test('一般的なJavaScriptエラーを分類する', () => {
      const networkError = new Error('fetch failed');
      const timeoutError = new Error('request timeout');
      const unknownError = new Error('unknown error');

      expect(categorizeError(networkError).category).toBe('network');
      expect(categorizeError(timeoutError).category).toBe('external_service');
      expect(categorizeError(unknownError).category).toBe('internal');
    });

    test('リトライ可能性を正しく判定する', () => {
      const retryableError = new TRPGError('Network error', {
        code: 'NETWORK',
        category: 'network',
        isRetryable: true
      });

      const nonRetryableError = new TRPGError('Auth error', {
        code: 'AUTH',
        category: 'authentication',
        isRetryable: false
      });

      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
      expect(isRetryableError(new Error('timeout'))).toBe(true);
    });
  });

  describe('エラーサニタイズ', () => {
    test('機密情報を含むコンテキストをサニタイズする', () => {
      const error = new TRPGError('Error with sensitive data', {
        code: 'SENSITIVE',
        category: 'internal',
        context: {
          userId: '123',
          password: 'secret123',
          apiKey: 'key_abc',
          authToken: 'token_xyz',
          publicData: 'safe_value'
        }
      });

      const sanitized = sanitizeError(error);
      
      expect(sanitized.context.userId).toBe('123');
      expect(sanitized.context.publicData).toBe('safe_value');
      expect(sanitized.context.password).toBe('[REDACTED]');
      expect(sanitized.context.apiKey).toBe('[REDACTED]');
      expect(sanitized.context.authToken).toBe('[REDACTED]');
    });
  });

  describe('エラー集約', () => {
    test('同じエラーコードとメッセージを集約する', () => {
      const baseTime = Date.now();
      const errors = [
        new TRPGError('API Error', { code: 'API_FAIL', category: 'external_service' }),
        new TRPGError('API Error', { code: 'API_FAIL', category: 'external_service' }),
        new TRPGError('DB Error', { code: 'DB_FAIL', category: 'database' }),
        new TRPGError('API Error', { code: 'API_FAIL', category: 'external_service' })
      ];

      // タイムスタンプを手動で設定
      errors[0].timestamp = new Date(baseTime).toISOString();
      errors[1].timestamp = new Date(baseTime + 10000).toISOString();
      errors[2].timestamp = new Date(baseTime + 20000).toISOString();
      errors[3].timestamp = new Date(baseTime + 30000).toISOString();

      const aggregated = aggregateErrors(errors, 60000);

      expect(aggregated).toHaveLength(2);
      
      const apiErrors = aggregated.find(agg => agg.error.code === 'API_FAIL');
      const dbErrors = aggregated.find(agg => agg.error.code === 'DB_FAIL');

      expect(apiErrors?.count).toBe(3);
      expect(dbErrors?.count).toBe(1);
    });

    test('時間窓外のエラーを除外する', () => {
      const now = Date.now();
      const errors = [
        new TRPGError('Recent error', { code: 'RECENT', category: 'internal' }),
        new TRPGError('Old error', { code: 'OLD', category: 'internal' })
      ];

      errors[0].timestamp = new Date(now - 30000).toISOString(); // 30秒前
      errors[1].timestamp = new Date(now - 120000).toISOString(); // 2分前

      const aggregated = aggregateErrors(errors, 60000); // 1分の時間窓

      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].error.code).toBe('RECENT');
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のログ出力でのパフォーマンス', () => {
      const logger = new StructuredLogger('debug');
      const outputs: LogEntry[] = [];
      logger.addOutput((entry) => outputs.push(entry));

      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        logger.info(`Log message ${i}`, { iteration: i });
      }
      
      const endTime = Date.now();

      expect(outputs).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });

    test('エラー集約の大量データ処理', () => {
      const errors: TRPGError[] = [];
      const now = Date.now();

      // 1000個のエラーを生成（10種類のエラーコード）
      for (let i = 0; i < 1000; i++) {
        const error = new TRPGError(`Error ${i % 10}`, {
          code: `ERROR_${i % 10}`,
          category: 'internal'
        });
        error.timestamp = new Date(now - (i * 1000)).toISOString();
        errors.push(error);
      }

      const startTime = Date.now();
      const aggregated = aggregateErrors(errors, 3600000); // 1時間の時間窓
      const endTime = Date.now();

      expect(aggregated).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ログ出力エラーを適切に処理する', () => {
      const logger = new StructuredLogger('debug');
      
      // エラーを投げる出力関数を追加
      logger.addOutput(() => {
        throw new Error('Output error');
      });

      // 正常な出力関数も追加
      const normalOutputs: LogEntry[] = [];
      logger.addOutput((entry) => normalOutputs.push(entry));

      // ログ出力がエラーを投げても他の出力は継続される
      logger.info('Test message');

      expect(normalOutputs).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Log output error:', expect.any(Error));
    });

    test('null/undefinedエラーの分類', () => {
      expect(categorizeError(null).category).toBe('internal');
      expect(categorizeError(undefined).category).toBe('internal');
      expect(categorizeError('string error').category).toBe('internal');
    });

    test('循環参照を含むコンテキストの処理', () => {
      const circularContext: any = { name: 'test' };
      circularContext.self = circularContext;

      expect(() => {
        new TRPGError('Test error', {
          code: 'TEST',
          category: 'internal',
          context: circularContext
        });
      }).not.toThrow();
    });
  });
});