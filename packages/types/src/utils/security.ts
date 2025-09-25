/**
 * セキュリティユーティリティ
 * Security Utilities
 * 
 * 提供機能:
 * - 入力サニタイゼーション
 * - データ検証
 * - 暗号化ヘルパー
 * - セキュアランダム生成
 * - XSS/インジェクション対策
 */

import type { ValidationError } from '../base';

// ==========================================
// セキュリティ設定
// ==========================================

export interface SecurityConfig {
  maxStringLength: number;
  allowedHTMLTags: string[];
  allowedProtocols: string[];
  enableStrictMode: boolean;
  rateLimitWindow: number;
  maxRequestsPerWindow: number;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxStringLength: 10000,
  allowedHTMLTags: ['b', 'i', 'u', 'em', 'strong', 'p', 'br'],
  allowedProtocols: ['http:', 'https:', 'mailto:'],
  enableStrictMode: true,
  rateLimitWindow: 60000, // 1分
  maxRequestsPerWindow: 100
};

// ==========================================
// 入力サニタイゼーション
// ==========================================

/**
 * HTMLタグの安全な除去/エスケープ
 */
export function sanitizeHTML(
  input: string,
  options: {
    allowedTags?: string[];
    stripTags?: boolean;
    preserveNewlines?: boolean;
  } = {}
): string {
  const { allowedTags = [], stripTags = true, preserveNewlines = false } = options;
  
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input;
  
  if (stripTags) {
    // 許可されたタグ以外を除去
    const allowedPattern = allowedTags.length > 0 
      ? new RegExp(`<(?!/?(?:${allowedTags.join('|')})\\b)[^>]*>`, 'gi')
      : /<[^>]*>/g;
    
    sanitized = sanitized.replace(allowedPattern, '');
  } else {
    // HTMLエンティティエスケープ
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  if (preserveNewlines) {
    sanitized = sanitized.replace(/\n/g, '<br>');
  }
  
  return sanitized.trim();
}

/**
 * SQLインジェクション対策
 */
export function sanitizeSQL(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/'/g, "''") // シングルクォートのエスケープ
    .replace(/--/g, '') // SQLコメントの除去
    .replace(/\/\*/g, '') // 複数行コメント開始の除去
    .replace(/\*\//g, '') // 複数行コメント終了の除去
    .replace(/;/g, '') // セミコロンの除去（複数クエリ防止）
    .replace(/\bUNION\b/gi, '') // UNION攻撃の防止
    .replace(/\bSELECT\b/gi, '')
    .replace(/\bINSERT\b/gi, '')
    .replace(/\bUPDATE\b/gi, '')
    .replace(/\bDELETE\b/gi, '')
    .replace(/\bDROP\b/gi, '')
    .replace(/\bCREATE\b/gi, '')
    .replace(/\bALTER\b/gi, '')
    .trim();
}

/**
 * ファイルパスの安全性検証
 */
export function sanitizeFilePath(
  path: string,
  options: {
    allowAbsolute?: boolean;
    allowParentDirectory?: boolean;
    allowedExtensions?: string[];
  } = {}
): {
  sanitized: string;
  isValid: boolean;
  errors: string[];
} {
  const { allowAbsolute = false, allowParentDirectory = false, allowedExtensions } = options;
  const errors: string[] = [];
  
  if (typeof path !== 'string' || path.trim().length === 0) {
    return {
      sanitized: '',
      isValid: false,
      errors: ['Path cannot be empty']
    };
  }
  
  let sanitized = path.trim();
  
  // 危険な文字の除去
  sanitized = sanitized
    .replace(/[<>:"|?*]/g, '') // Windows予約文字
    .replace(/\x00/g, '') // ヌル文字
    .replace(/[\x01-\x1f\x7f]/g, ''); // 制御文字
  
  // パストラバーサル攻撃の検証
  if (!allowParentDirectory && (sanitized.includes('../') || sanitized.includes('..\\'))) {
    errors.push('Parent directory access not allowed');
  }
  
  // 絶対パスの検証
  if (!allowAbsolute && (sanitized.startsWith('/') || /^[a-zA-Z]:/.test(sanitized))) {
    errors.push('Absolute paths not allowed');
  }
  
  // 拡張子の検証
  if (allowedExtensions && allowedExtensions.length > 0) {
    const extension = sanitized.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      errors.push(`File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`);
    }
  }
  
  // 予約ファイル名の検証（Windows）
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const baseName = sanitized.split('.')[0].toUpperCase();
  if (reservedNames.includes(baseName)) {
    errors.push('Reserved file name not allowed');
  }
  
  return {
    sanitized,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * URLの安全性検証
 */
export function sanitizeURL(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:']
): {
  sanitized: string;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (typeof url !== 'string' || url.trim().length === 0) {
    return {
      sanitized: '',
      isValid: false,
      errors: ['URL cannot be empty']
    };
  }
  
  let sanitized = url.trim();
  
  try {
    const urlObj = new URL(sanitized);
    
    // プロトコルの検証
    if (!allowedProtocols.includes(urlObj.protocol)) {
      errors.push(`Protocol not allowed: ${urlObj.protocol}`);
    }
    
    // 危険なスキームの検証
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousSchemes.includes(urlObj.protocol)) {
      errors.push('Dangerous protocol detected');
    }
    
    // IPv4プライベートアドレスの検証
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = urlObj.hostname.match(ipv4Regex);
    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);
      if (
        (a === 10) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 127) // ローカルホスト
      ) {
        errors.push('Private IP address not allowed');
      }
    }
    
    sanitized = urlObj.toString();
    
  } catch (error) {
    errors.push('Invalid URL format');
  }
  
  return {
    sanitized,
    isValid: errors.length === 0,
    errors
  };
}

// ==========================================
// データ検証
// ==========================================

/**
 * 文字列の包括的検証
 */
export function validateSecureString(
  input: string,
  rules: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
    allowUnicode?: boolean;
    forbiddenPatterns?: RegExp[];
    requiredPatterns?: RegExp[];
  } = {}
): ValidationError[] {
  const errors: ValidationError[] = [];
  const {
    minLength = 0,
    maxLength = DEFAULT_SECURITY_CONFIG.maxStringLength,
    allowSpecialChars = true,
    allowUnicode = true,
    forbiddenPatterns = [],
    requiredPatterns = []
  } = rules;
  
  if (typeof input !== 'string') {
    errors.push({
      field: 'input',
      message: 'Input must be a string',
      code: 'INVALID_TYPE'
    });
    return errors;
  }
  
  // 長さの検証
  if (input.length < minLength) {
    errors.push({
      field: 'input',
      message: `Minimum length is ${minLength}`,
      code: 'MIN_LENGTH'
    });
  }
  
  if (input.length > maxLength) {
    errors.push({
      field: 'input',
      message: `Maximum length is ${maxLength}`,
      code: 'MAX_LENGTH'
    });
  }
  
  // 特殊文字の検証
  if (!allowSpecialChars) {
    const specialCharsRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (specialCharsRegex.test(input)) {
      errors.push({
        field: 'input',
        message: 'Special characters not allowed',
        code: 'SPECIAL_CHARS_NOT_ALLOWED'
      });
    }
  }
  
  // Unicode文字の検証
  if (!allowUnicode) {
    const unicodeRegex = /[^\x00-\x7F]/;
    if (unicodeRegex.test(input)) {
      errors.push({
        field: 'input',
        message: 'Unicode characters not allowed',
        code: 'UNICODE_NOT_ALLOWED'
      });
    }
  }
  
  // 禁止パターンの検証
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(input)) {
      errors.push({
        field: 'input',
        message: 'Forbidden pattern detected',
        code: 'FORBIDDEN_PATTERN'
      });
    }
  }
  
  // 必須パターンの検証
  for (const pattern of requiredPatterns) {
    if (!pattern.test(input)) {
      errors.push({
        field: 'input',
        message: 'Required pattern not found',
        code: 'REQUIRED_PATTERN_MISSING'
      });
    }
  }
  
  return errors;
}

/**
 * パスワード強度の検証
 */
export function validatePasswordStrength(
  password: string,
  requirements: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    forbiddenPasswords?: string[];
  } = {}
): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: ValidationError[];
  score: number;
} {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    forbiddenPasswords = []
  } = requirements;
  
  const errors: ValidationError[] = [];
  let score = 0;
  
  // 基本検証
  if (password.length < minLength) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${minLength} characters`,
      code: 'MIN_LENGTH'
    });
  } else {
    score += Math.min(password.length * 2, 20);
  }
  
  // 文字種別の検証
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain uppercase letters',
      code: 'REQUIRE_UPPERCASE'
    });
  } else if (/[A-Z]/.test(password)) {
    score += 10;
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain lowercase letters',
      code: 'REQUIRE_LOWERCASE'
    });
  } else if (/[a-z]/.test(password)) {
    score += 10;
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain numbers',
      code: 'REQUIRE_NUMBERS'
    });
  } else if (/\d/.test(password)) {
    score += 10;
  }
  
  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain special characters',
      code: 'REQUIRE_SPECIAL_CHARS'
    });
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  }
  
  // 弱いパスワードの検証
  if (forbiddenPasswords.includes(password.toLowerCase())) {
    errors.push({
      field: 'password',
      message: 'Password is too common',
      code: 'COMMON_PASSWORD'
    });
    score = 0;
  }
  
  // 連続文字の検証
  if (/(.)\1{2,}/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password contains too many repeated characters',
      code: 'REPEATED_CHARACTERS'
    });
    score -= 10;
  }
  
  // 順序文字の検証
  const sequences = ['abc', '123', 'qwe', 'asd', 'zxc'];
  for (const seq of sequences) {
    if (password.toLowerCase().includes(seq)) {
      score -= 5;
    }
  }
  
  // 強度判定
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 30) strength = 'weak';
  else if (score < 60) strength = 'medium';
  else strength = 'strong';
  
  return {
    isValid: errors.length === 0,
    strength,
    errors,
    score: Math.max(0, score)
  };
}

// ==========================================
// 暗号化ヘルパー
// ==========================================

/**
 * シンプルなハッシュ関数（開発用）
 * 注意: プロダクションではより強力なハッシュアルゴリズムを使用
 */
export function simpleHash(input: string, salt: string = ''): string {
  const combined = salt + input;
  let hash = 0;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32ビット整数に変換
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * ランダムソルトの生成
 */
export function generateSalt(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Crypto API が利用可能な場合は使用
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // フォールバック
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
}

/**
 * セキュアランダム数の生成
 */
export function generateSecureRandom(min: number = 0, max: number = 1): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomValue = array[0] / (0xFFFFFFFF + 1);
    return min + (randomValue * (max - min));
  } else {
    // フォールバック
    return min + (Math.random() * (max - min));
  }
}

/**
 * 時間ベースのトークン生成
 */
export function generateTimeBasedToken(
  identifier: string,
  secret: string,
  validityPeriod: number = 3600000 // 1時間
): string {
  const timestamp = Math.floor(Date.now() / validityPeriod);
  const payload = `${identifier}:${timestamp}`;
  const hash = simpleHash(payload, secret);
  
  return `${timestamp}.${hash}`;
}

/**
 * 時間ベースのトークン検証
 */
export function validateTimeBasedToken(
  token: string,
  identifier: string,
  secret: string,
  validityPeriod: number = 3600000,
  allowedSkew: number = 1
): boolean {
  try {
    const [timestampStr, providedHash] = token.split('.');
    const providedTimestamp = parseInt(timestampStr, 10);
    const currentTimestamp = Math.floor(Date.now() / validityPeriod);
    
    // 時間ウィンドウの検証
    if (Math.abs(currentTimestamp - providedTimestamp) > allowedSkew) {
      return false;
    }
    
    // ハッシュの検証
    const payload = `${identifier}:${providedTimestamp}`;
    const expectedHash = simpleHash(payload, secret);
    
    return expectedHash === providedHash;
  } catch {
    return false;
  }
}

// ==========================================
// レート制限
// ==========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  
  constructor(
    private windowMs: number = 60000,
    private maxRequests: number = 100
  ) {}
  
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const entry = this.storage.get(identifier);
    
    if (!entry || now >= entry.resetTime) {
      // 新しいウィンドウ
      this.storage.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }
    
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }
    
    entry.count++;
    
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }
  
  reset(identifier: string): void {
    this.storage.delete(identifier);
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (now >= entry.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}

export { RateLimiter };

// ==========================================
// セキュリティヘッダー
// ==========================================

/**
 * セキュリティヘッダーの生成
 */
export function generateSecurityHeaders(
  options: {
    enableCSP?: boolean;
    enableHSTS?: boolean;
    enableXFrame?: boolean;
    enableXContent?: boolean;
    cspDirectives?: Record<string, string>;
  } = {}
): Record<string, string> {
  const {
    enableCSP = true,
    enableHSTS = true,
    enableXFrame = true,
    enableXContent = true,
    cspDirectives = {}
  } = options;
  
  const headers: Record<string, string> = {};
  
  if (enableCSP) {
    const defaultCSP = {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline'",
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: https:",
      'font-src': "'self'",
      'connect-src': "'self'",
      'frame-ancestors': "'none'",
      ...cspDirectives
    };
    
    const cspValue = Object.entries(defaultCSP)
      .map(([directive, value]) => `${directive} ${value}`)
      .join('; ');
    
    headers['Content-Security-Policy'] = cspValue;
  }
  
  if (enableHSTS) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  
  if (enableXFrame) {
    headers['X-Frame-Options'] = 'DENY';
  }
  
  if (enableXContent) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }
  
  headers['X-XSS-Protection'] = '1; mode=block';
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  
  return headers;
}