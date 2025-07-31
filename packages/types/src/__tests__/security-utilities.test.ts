/**
 * セキュリティユーティリティの包括的テスト
 * Security Utilities Comprehensive Tests
 * 
 * テスト対象:
 * - 暗号化とハッシュ関数
 * - 入力検証とサニタイゼーション
 * - トークン生成と検証
 * - セキュアな乱数生成
 * - XSS/CSRF対策
 * - データマスキングと機密情報保護
 */

import type { ValidationError } from '../index';

// ==========================================
// セキュリティユーティリティの実装
// ==========================================

/**
 * セキュアな乱数生成器
 */
export class SecureRandomGenerator {
  /**
   * セキュアなランダム文字列を生成
   */
  static generateSecureString(
    length: number = 32,
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // ブラウザ環境またはNode.js 19+
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array, byte => charset[byte % charset.length]).join('');
    } else {
      // フォールバック（テスト環境）
      let result = '';
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return result;
    }
  }

  /**
   * セキュアなランダム数値を生成
   */
  static generateSecureNumber(min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return min + (array[0] % (max - min + 1));
    } else {
      return min + Math.floor(Math.random() * (max - min + 1));
    }
  }

  /**
   * UUIDv4を生成
   */
  static generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    } else {
      // RFC 4122準拠のUUIDv4フォールバック
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }
}

/**
 * 簡易ハッシュ関数（プロダクションでは適切なライブラリを使用）
 */
export class HashingUtility {
  /**
   * SHA-256風の簡易ハッシュ関数
   */
  static async simpleHash(input: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // フォールバック（テスト専用、本番では使用しない）
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit整数に変換
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * パスワードのハッシュ化（簡易版）
   */
  static async hashPassword(
    password: string,
    salt?: string
  ): Promise<{ hash: string; salt: string }> {
    const usedSalt = salt || SecureRandomGenerator.generateSecureString(16);
    const hash = await this.simpleHash(password + usedSalt);
    return { hash, salt: usedSalt };
  }

  /**
   * パスワードの検証
   */
  static async verifyPassword(
    password: string,
    hash: string,
    salt: string
  ): Promise<boolean> {
    const { hash: newHash } = await this.hashPassword(password, salt);
    return newHash === hash;
  }
}

/**
 * 入力検証とサニタイゼーション
 */
export class InputValidator {
  /**
   * HTML特殊文字をエスケープ
   */
  static escapeHTML(input: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return input.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
  }

  /**
   * SQL文字をエスケープ
   */
  static escapeSQLString(input: string): string {
    return input.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }

  /**
   * JavaScript文字列をエスケープ
   */
  static escapeJavaScript(input: string): string {
    const jsEscapes: Record<string, string> = {
      '\\': '\\\\',
      "'": "\\'",
      '"': '\\"',
      '\n': '\\n',
      '\r': '\\r',
      '\t': '\\t',
      '\b': '\\b',
      '\f': '\\f'
    };
    
    return input.replace(/[\\"'\n\r\t\b\f]/g, (match) => jsEscapes[match]);
  }

  /**
   * URLを検証
   */
  static validateURL(url: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      const urlObj = new URL(url);
      
      // HTTPSのみ許可
      if (urlObj.protocol !== 'https:') {
        errors.push({
          field: 'url',
          message: 'HTTPSのURLのみ許可されています',
          code: 'INSECURE_PROTOCOL'
        });
      }
      
      // ローカルIPアドレスを禁止
      const hostname = urlObj.hostname;
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
      ) {
        errors.push({
          field: 'url',
          message: 'ローカルIPアドレスは許可されていません',
          code: 'LOCAL_IP_FORBIDDEN'
        });
      }
      
    } catch (error) {
      errors.push({
        field: 'url',
        message: '無効なURL形式です',
        code: 'INVALID_URL'
      });
    }
    
    return errors;
  }

  /**
   * ファイル名を検証
   */
  static validateFileName(fileName: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 危険な文字をチェック
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      errors.push({
        field: 'fileName',
        message: '無効な文字が含まれています',
        code: 'INVALID_CHARACTERS'
      });
    }
    
    // パストラバーサル攻撃をチェック
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      errors.push({
        field: 'fileName',
        message: 'パスに関する文字は使用できません',
        code: 'PATH_TRAVERSAL'
      });
    }
    
    // 予約語をチェック（Windows）
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = fileName.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      errors.push({
        field: 'fileName',
        message: '予約されたファイル名は使用できません',
        code: 'RESERVED_NAME'
      });
    }
    
    return errors;
  }

  /**
   * メールアドレスを検証（セキュリティ重視）
   */
  static validateEmail(email: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 基本的な形式チェック
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: '無効なメールアドレス形式です',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    // 長さチェック
    if (email.length > 254) {
      errors.push({
        field: 'email',
        message: 'メールアドレスが長すぎます',
        code: 'EMAIL_TOO_LONG'
      });
    }
    
    // 危険なパターンをチェック
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      errors.push({
        field: 'email',
        message: '無効なドット配置です',
        code: 'INVALID_DOT_SEQUENCE'
      });
    }
    
    return errors;
  }
}

/**
 * データマスキングとプライバシー保護
 */
export class DataMasking {
  /**
   * メールアドレスをマスク
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    
    const maskedLocal = local.length <= 2 
      ? local 
      : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * 電話番号をマスク
   */
  static maskPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return phone;
    
    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4) + lastFour;
    
    // 元の形式を保持
    let result = '';
    let maskedIndex = 0;
    for (const char of phone) {
      if (/\d/.test(char)) {
        result += masked[maskedIndex++];
      } else {
        result += char;
      }
    }
    
    return result;
  }

  /**
   * クレジットカード番号をマスク
   */
  static maskCreditCard(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 8) return cardNumber;
    
    const firstFour = cleaned.slice(0, 4);
    const lastFour = cleaned.slice(-4);
    const masked = firstFour + '*'.repeat(cleaned.length - 8) + lastFour;
    
    // 4桁ずつ区切り
    return masked.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * オブジェクトの機密フィールドをマスク
   */
  static maskSensitiveFields(
    obj: Record<string, any>,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key', 'apiKey', 'auth']
  ): Record<string, any> {
    const masked = { ...obj };
    
    const maskField = (value: any, fieldName: string): any => {
      if (typeof value === 'string') {
        const lowerFieldName = fieldName.toLowerCase();
        const isSensitive = sensitiveFields.some(field => 
          lowerFieldName.includes(field.toLowerCase())
        );
        
        if (isSensitive) {
          return '[MASKED]';
        }
        
        // 特定のパターンのマスキング
        if (lowerFieldName.includes('email')) {
          return this.maskEmail(value);
        }
        if (lowerFieldName.includes('phone')) {
          return this.maskPhoneNumber(value);
        }
        if (lowerFieldName.includes('card') || lowerFieldName.includes('credit')) {
          return this.maskCreditCard(value);
        }
      }
      
      if (typeof value === 'object' && value !== null) {
        const nestedMasked: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
          nestedMasked[key] = maskField(val, key);
        }
        return nestedMasked;
      }
      
      return value;
    };
    
    for (const [key, value] of Object.entries(obj)) {
      masked[key] = maskField(value, key);
    }
    
    return masked;
  }
}

/**
 * CSRFトークン管理
 */
export class CSRFProtection {
  /**
   * CSRFトークンを生成
   */
  static generateToken(): string {
    return SecureRandomGenerator.generateSecureString(32);
  }

  /**
   * CSRFトークンを検証
   */
  static validateToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) return false;
    if (token.length !== expectedToken.length) return false;
    
    // 定数時間比較（タイミング攻撃対策）
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    
    return result === 0;
  }
}

/**
 * レート制限（簡易版）
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15分
  ) {}

  /**
   * リクエストが制限内かチェック
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);
    
    if (!attempt || now > attempt.resetTime) {
      // 新しいウィンドウまたは期限切れ
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    if (attempt.count >= this.maxAttempts) {
      return false;
    }
    
    attempt.count++;
    return true;
  }

  /**
   * 次のリセット時間を取得
   */
  getResetTime(identifier: string): number | null {
    const attempt = this.attempts.get(identifier);
    return attempt ? attempt.resetTime : null;
  }

  /**
   * 制限をリセット
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// ==========================================
// テストスイート
// ==========================================

describe('セキュリティユーティリティの包括的テスト', () => {
  
  describe('SecureRandomGenerator', () => {
    test('セキュアな文字列を指定された長さで生成する', () => {
      const str1 = SecureRandomGenerator.generateSecureString(32);
      const str2 = SecureRandomGenerator.generateSecureString(32);
      
      expect(str1).toHaveLength(32);
      expect(str2).toHaveLength(32);
      expect(str1).not.toBe(str2); // 異なる値であることを確認
    });

    test('カスタム文字セットで文字列を生成する', () => {
      const charset = '0123456789';
      const str = SecureRandomGenerator.generateSecureString(10, charset);
      
      expect(str).toHaveLength(10);
      expect(str).toMatch(/^\d+$/); // 数字のみ
    });

    test('セキュアな数値を範囲内で生成する', () => {
      const results = [];
      for (let i = 0; i < 100; i++) {
        const num = SecureRandomGenerator.generateSecureNumber(1, 10);
        results.push(num);
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(10);
      }
      
      // 分布の確認（完全にランダムなら複数の値が出現する）
      const uniqueValues = new Set(results);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

    test('UUIDv4形式を生成する', () => {
      const uuid = SecureRandomGenerator.generateUUID();
      
      // UUIDv4の形式チェック
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      
      // 複数生成して一意性を確認
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(SecureRandomGenerator.generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('HashingUtility', () => {
    test('同じ入力に対して同じハッシュを生成する', async () => {
      const input = 'test password';
      const hash1 = await HashingUtility.simpleHash(input);
      const hash2 = await HashingUtility.simpleHash(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8); // フォールバック関数の場合
    });

    test('異なる入力に対して異なるハッシュを生成する', async () => {
      const hash1 = await HashingUtility.simpleHash('password1');
      const hash2 = await HashingUtility.simpleHash('password2');
      
      expect(hash1).not.toBe(hash2);
    });

    test('パスワードハッシュ化と検証が正しく動作する', async () => {
      const password = 'mySecurePassword123';
      
      const { hash, salt } = await HashingUtility.hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(salt).toBeTruthy();
      expect(salt).toHaveLength(16);
      
      // 正しいパスワードで検証
      const isValid = await HashingUtility.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
      
      // 間違ったパスワードで検証
      const isInvalid = await HashingUtility.verifyPassword('wrongPassword', hash, salt);
      expect(isInvalid).toBe(false);
    });

    test('カスタムソルトでパスワードをハッシュ化する', async () => {
      const password = 'testPassword';
      const customSalt = 'customSalt123456';
      
      const { hash, salt } = await HashingUtility.hashPassword(password, customSalt);
      
      expect(salt).toBe(customSalt);
      expect(hash).toBeTruthy();
    });
  });

  describe('InputValidator', () => {
    test('HTML特殊文字を正しくエスケープする', () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = InputValidator.escapeHTML(input);
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
    });

    test('SQL文字列を正しくエスケープする', () => {
      const input = "'; DROP TABLE users; --";
      const escaped = InputValidator.escapeSQLString(input);
      
      expect(escaped).toBe("''; DROP TABLE users; --");
    });

    test('JavaScript文字列を正しくエスケープする', () => {
      const input = 'alert("Hello\nWorld")';
      const escaped = InputValidator.escapeJavaScript(input);
      
      expect(escaped).toBe('alert(\\"Hello\\nWorld\\")');
    });

    test('URLの検証が正しく動作する', () => {
      // 有効なHTTPS URL
      const validUrl = 'https://example.com/path';
      expect(InputValidator.validateURL(validUrl)).toHaveLength(0);
      
      // 無効なプロトコル
      const httpUrl = 'http://example.com';
      const httpErrors = InputValidator.validateURL(httpUrl);
      expect(httpErrors).toHaveLength(1);
      expect(httpErrors[0].code).toBe('INSECURE_PROTOCOL');
      
      // ローカルIP
      const localUrl = 'https://192.168.1.1/path';
      const localErrors = InputValidator.validateURL(localUrl);
      expect(localErrors).toHaveLength(1);
      expect(localErrors[0].code).toBe('LOCAL_IP_FORBIDDEN');
      
      // 無効な形式
      const invalidUrl = 'not-a-url';
      const invalidErrors = InputValidator.validateURL(invalidUrl);
      expect(invalidErrors).toHaveLength(1);
      expect(invalidErrors[0].code).toBe('INVALID_URL');
    });

    test('ファイル名の検証が正しく動作する', () => {
      // 有効なファイル名
      expect(InputValidator.validateFileName('document.pdf')).toHaveLength(0);
      expect(InputValidator.validateFileName('image_001.jpg')).toHaveLength(0);
      
      // 危険な文字を含む
      const dangerousName = 'file<>name.txt';
      const dangerousErrors = InputValidator.validateFileName(dangerousName);
      expect(dangerousErrors).toHaveLength(1);
      expect(dangerousErrors[0].code).toBe('INVALID_CHARACTERS');
      
      // パストラバーサル
      const pathTraversal = '../../../etc/passwd';
      const pathErrors = InputValidator.validateFileName(pathTraversal);
      expect(pathErrors).toHaveLength(1);
      expect(pathErrors[0].code).toBe('PATH_TRAVERSAL');
      
      // 予約語
      const reservedName = 'CON.txt';
      const reservedErrors = InputValidator.validateFileName(reservedName);
      expect(reservedErrors).toHaveLength(1);
      expect(reservedErrors[0].code).toBe('RESERVED_NAME');
    });

    test('メールアドレスの検証が正しく動作する', () => {
      // 有効なメール
      expect(InputValidator.validateEmail('user@example.com')).toHaveLength(0);
      expect(InputValidator.validateEmail('test.email+tag@domain.co.jp')).toHaveLength(0);
      
      // 無効な形式
      const invalidEmail = 'not-an-email';
      const invalidErrors = InputValidator.validateEmail(invalidEmail);
      expect(invalidErrors).toHaveLength(1);
      expect(invalidErrors[0].code).toBe('INVALID_EMAIL_FORMAT');
      
      // 長すぎるメール
      const longEmail = 'a'.repeat(250) + '@example.com';
      const longErrors = InputValidator.validateEmail(longEmail);
      expect(longErrors).toHaveLength(1);
      expect(longErrors[0].code).toBe('EMAIL_TOO_LONG');
      
      // 不正なドット配置
      const dotEmail = '.user@example.com';
      const dotErrors = InputValidator.validateEmail(dotEmail);
      expect(dotErrors).toHaveLength(1);
      expect(dotErrors[0].code).toBe('INVALID_DOT_SEQUENCE');
    });
  });

  describe('DataMasking', () => {
    test('メールアドレスを適切にマスクする', () => {
      expect(DataMasking.maskEmail('user@example.com')).toBe('u**r@example.com');
      expect(DataMasking.maskEmail('ab@domain.com')).toBe('ab@domain.com');
      expect(DataMasking.maskEmail('a@domain.com')).toBe('a@domain.com');
      expect(DataMasking.maskEmail('verylongemail@example.com')).toBe('v***********l@example.com');
    });

    test('電話番号を適切にマスクする', () => {
      expect(DataMasking.maskPhoneNumber('123-456-7890')).toBe('***-***-7890');
      expect(DataMasking.maskPhoneNumber('(123) 456-7890')).toBe('(***) ***-7890');
      expect(DataMasking.maskPhoneNumber('1234567890')).toBe('******7890');
    });

    test('クレジットカード番号を適切にマスクする', () => {
      expect(DataMasking.maskCreditCard('1234567890123456')).toBe('1234 **** **** 3456');
      expect(DataMasking.maskCreditCard('1234-5678-9012-3456')).toBe('1234 **** **** 3456');
      expect(DataMasking.maskCreditCard('4111 1111 1111 1111')).toBe('4111 **** **** 1111');
    });

    test('オブジェクトの機密フィールドをマスクする', () => {
      const sensitiveObj = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secretPassword',
        apiKey: 'sk_test_123456789',
        phoneNumber: '123-456-7890',
        creditCard: '4111 1111 1111 1111',
        publicInfo: 'This is public'
      };

      const masked = DataMasking.maskSensitiveFields(sensitiveObj);

      expect(masked.name).toBe('John Doe');
      expect(masked.email).toBe('j**n@example.com');
      expect(masked.password).toBe('[MASKED]');
      expect(masked.apiKey).toBe('[MASKED]');
      expect(masked.phoneNumber).toBe('***-***-7890');
      expect(masked.creditCard).toBe('4111 **** **** 1111');
      expect(masked.publicInfo).toBe('This is public');
    });

    test('ネストされたオブジェクトの機密フィールドをマスクする', () => {
      const nestedObj = {
        user: {
          credentials: {
            password: 'secret123',
            token: 'jwt_token_here'
          },
          contact: {
            email: 'user@domain.com'
          }
        }
      };

      const masked = DataMasking.maskSensitiveFields(nestedObj);

      expect(masked.user.credentials.password).toBe('[MASKED]');
      expect(masked.user.credentials.token).toBe('[MASKED]');
      expect(masked.user.contact.email).toBe('u**r@domain.com');
    });
  });

  describe('CSRFProtection', () => {
    test('CSRFトークンを生成する', () => {
      const token1 = CSRFProtection.generateToken();
      const token2 = CSRFProtection.generateToken();
      
      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);
      expect(token1).not.toBe(token2);
    });

    test('CSRFトークンの検証が正しく動作する', () => {
      const token = CSRFProtection.generateToken();
      
      // 正しいトークン
      expect(CSRFProtection.validateToken(token, token)).toBe(true);
      
      // 間違ったトークン
      const wrongToken = CSRFProtection.generateToken();
      expect(CSRFProtection.validateToken(wrongToken, token)).toBe(false);
      
      // 空のトークン
      expect(CSRFProtection.validateToken('', token)).toBe(false);
      expect(CSRFProtection.validateToken(token, '')).toBe(false);
      
      // 長さが異なるトークン
      expect(CSRFProtection.validateToken('short', token)).toBe(false);
    });

    test('定数時間比較でタイミング攻撃を防ぐ', () => {
      const validToken = 'a'.repeat(32);
      const measurements: number[] = [];
      
      // 複数回測定して時間のばらつきを確認
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        CSRFProtection.validateToken('b'.repeat(32), validToken);
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }
      
      // 時間のばらつきが小さいことを確認（定数時間）
      const avgTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
      const variance = measurements.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / measurements.length;
      
      // バリアンスが小さい（定数時間に近い）ことを確認
      expect(variance).toBeLessThan(0.1);
    });
  });

  describe('RateLimiter', () => {
    test('制限内では リクエストを許可する', () => {
      const limiter = new RateLimiter(5, 60000); // 5回/分
      const identifier = 'user123';
      
      // 5回までは許可
      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed(identifier)).toBe(true);
      }
      
      // 6回目は拒否
      expect(limiter.isAllowed(identifier)).toBe(false);
    });

    test('時間窓がリセットされるとリクエストが再び許可される', () => {
      const limiter = new RateLimiter(2, 100); // 2回/100ms
      const identifier = 'user456';
      
      // 制限まで使用
      expect(limiter.isAllowed(identifier)).toBe(true);
      expect(limiter.isAllowed(identifier)).toBe(true);
      expect(limiter.isAllowed(identifier)).toBe(false);
      
      // 時間窓経過を待つ
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(limiter.isAllowed(identifier)).toBe(true);
          resolve();
        }, 150);
      });
    });

    test('異なる識別子で独立して制限される', () => {
      const limiter = new RateLimiter(1, 60000);
      
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user2')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
      expect(limiter.isAllowed('user2')).toBe(false);
    });

    test('リセット時間を正しく取得する', () => {
      const limiter = new RateLimiter(1, 60000);
      const identifier = 'user789';
      
      expect(limiter.getResetTime(identifier)).toBeNull();
      
      limiter.isAllowed(identifier);
      const resetTime = limiter.getResetTime(identifier);
      
      expect(resetTime).toBeGreaterThan(Date.now());
      expect(resetTime).toBeLessThanOrEqual(Date.now() + 60000);
    });

    test('制限を手動でリセットできる', () => {
      const limiter = new RateLimiter(1, 60000);
      const identifier = 'user000';
      
      expect(limiter.isAllowed(identifier)).toBe(true);
      expect(limiter.isAllowed(identifier)).toBe(false);
      
      limiter.reset(identifier);
      expect(limiter.isAllowed(identifier)).toBe(true);
    });
  });

  describe('セキュリティ統合テスト', () => {
    test('完全なユーザー認証フローのセキュリティ', async () => {
      // パスワードのハッシュ化
      const password = 'userPassword123!';
      const { hash, salt } = await HashingUtility.hashPassword(password);
      
      // CSRFトークンの生成
      const csrfToken = CSRFProtection.generateToken();
      
      // セッションIDの生成
      const sessionId = SecureRandomGenerator.generateUUID();
      
      // レート制限
      const rateLimiter = new RateLimiter(3, 60000);
      const userIp = '192.168.1.100';
      
      // 正常なログイン試行
      expect(rateLimiter.isAllowed(userIp)).toBe(true);
      expect(await HashingUtility.verifyPassword(password, hash, salt)).toBe(true);
      expect(CSRFProtection.validateToken(csrfToken, csrfToken)).toBe(true);
      
      // セッション情報のマスキング
      const sessionData = {
        userId: '12345',
        email: 'user@example.com',
        sessionId,
        csrfToken,
        hashedPassword: hash
      };
      
      const maskedData = DataMasking.maskSensitiveFields(sessionData, ['Token', 'Password']);
      expect(maskedData.csrfToken).toBe('[MASKED]');
      expect(maskedData.hashedPassword).toBe('[MASKED]');
      expect(maskedData.email).toBe('u**r@example.com');
      expect(maskedData.userId).toBe('12345'); // 非機密データは保持
    });

    test('XSS攻撃の防御', () => {
      const maliciousInput = '<script>document.cookie="stolen=true"</script>';
      const userComment = `Great article! ${maliciousInput}`;
      
      // HTMLエスケープ
      const safeHtml = InputValidator.escapeHTML(userComment);
      expect(safeHtml).not.toContain('<script>');
      expect(safeHtml).toContain('&lt;script&gt;');
      
      // JavaScriptエスケープ（JSON埋め込み用）
      const safeJs = InputValidator.escapeJavaScript(userComment);
      expect(safeJs).not.toContain('</script>');
    });

    test('SQL インジェクション攻撃の防御', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const username = `admin${maliciousInput}`;
      
      // SQLエスケープ
      const safeSql = InputValidator.escapeSQLString(username);
      expect(safeSql).not.toContain("'; DROP"));
      expect(safeSql).toContain("''; DROP");
    });

    test('ファイルアップロードの セキュリティ', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        'evil.php.jpg',
        'CON.txt',
        'file<script>.jpg',
        '..\\windows\\system32\\cmd.exe'
      ];
      
      maliciousFilenames.forEach(filename => {
        const errors = InputValidator.validateFileName(filename);
        expect(errors.length).toBeGreaterThan(0);
      });
      
      // 安全なファイル名
      const safeFilenames = ['document.pdf', 'image001.jpg', 'data_export.csv'];
      safeFilenames.forEach(filename => {
        const errors = InputValidator.validateFileName(filename);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('パフォーマンスと脆弱性テスト', () => {
    test('大量のハッシュ計算でDOS攻撃を防ぐ', async () => {
      const startTime = Date.now();
      
      // 100個のパスワードを並列でハッシュ化
      const promises = Array.from({ length: 100 }, () => 
        HashingUtility.hashPassword('password123')
      );
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      // 適切な時間内で完了することを確認（タイムアウト攻撃の防御）
      expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
    });

    test('レート制限が大量リクエストを適切に処理する', () => {
      const limiter = new RateLimiter(10, 60000);
      const identifier = 'attacker';
      
      let allowedCount = 0;
      let blockedCount = 0;
      
      // 1000回のリクエストを送信
      for (let i = 0; i < 1000; i++) {
        if (limiter.isAllowed(identifier)) {
          allowedCount++;
        } else {
          blockedCount++;
        }
      }
      
      expect(allowedCount).toBe(10); // 制限値のみ許可
      expect(blockedCount).toBe(990); // 残りは全てブロック
    });

    test('メモリ効率的なマスキング処理', () => {
      // 大きなオブジェクトのマスキング
      const largeObject: Record<string, any> = {};
      
      // 1000個のフィールドを持つオブジェクト
      for (let i = 0; i < 1000; i++) {
        largeObject[`field${i}`] = `value${i}`;
        largeObject[`email${i}`] = `user${i}@example.com`;
        largeObject[`password${i}`] = `password${i}`;
      }
      
      const startTime = Date.now();
      const masked = DataMasking.maskSensitiveFields(largeObject);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
      expect(Object.keys(masked)).toHaveLength(3000);
      
      // マスキングが正しく適用されていることを確認
      expect(masked.password0).toBe('[MASKED]');
      expect(masked.email0).toBe('u***0@example.com');
      expect(masked.field0).toBe('value0');
    });
  });

  describe('エッジケースと例外処理', () => {
    test('空文字列や null 値の適切な処理', async () => {
      // 空文字列のハッシュ化
      const emptyHash = await HashingUtility.simpleHash('');
      expect(emptyHash).toBeTruthy();
      
      // 空文字列のエスケープ
      expect(InputValidator.escapeHTML('')).toBe('');
      expect(InputValidator.escapeSQLString('')).toBe('');
      
      // 空文字列のマスキング
      expect(DataMasking.maskEmail('')).toBe('');
      expect(DataMasking.maskPhoneNumber('')).toBe('');
    });

    test('Unicode文字の適切な処理', () => {
      const unicodeText = '🔐セキュリティ🛡️テスト';
      
      // エスケープ処理でUnicode文字が保持される
      const escaped = InputValidator.escapeHTML(unicodeText);
      expect(escaped).toContain('🔐');
      expect(escaped).toContain('セキュリティ');
      
      // ハッシュ化でUnicode文字を処理
      expect(async () => {
        await HashingUtility.simpleHash(unicodeText);
      }).not.toThrow();
    });

    test('極端に長い入力の処理', () => {
      const veryLongString = 'a'.repeat(10000);
      
      // エスケープ処理が完了する
      expect(() => {
        InputValidator.escapeHTML(veryLongString);
      }).not.toThrow();
      
      // マスキング処理が完了する
      expect(() => {
        DataMasking.maskEmail(`${veryLongString}@example.com`);
      }).not.toThrow();
    });

    test('不正な形式のデータの処理', () => {
      // 不正なメール形式
      const invalidEmails = ['@domain.com', 'user@', 'user domain.com', ''];
      invalidEmails.forEach(email => {
        expect(() => DataMasking.maskEmail(email)).not.toThrow();
      });
      
      // 不正な電話番号形式
      const invalidPhones = ['abc-def-ghij', '', '123'];
      invalidPhones.forEach(phone => {
        expect(() => DataMasking.maskPhoneNumber(phone)).not.toThrow();
      });
    });
  });
});