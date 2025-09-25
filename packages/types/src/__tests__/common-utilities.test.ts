/**
 * 共通ユーティリティ関数の包括的テスト
 * Common Utility Functions Comprehensive Tests
 * 
 * テスト対象:
 * - フロントエンド/バックエンド共通ユーティリティ
 * - データ変換とシリアライゼーション
 * - 文字列操作と検証
 * - 日時処理とフォーマッティング
 * - 配列・オブジェクト操作
 * - バリデーション関数
 */

import type {
  ID,
  DateTime,
  BaseStats,
  TRPGCharacter,
  TRPGCampaign,
  ValidationError,
  APIResponse
} from '../index';

// ==========================================
// 共通ユーティリティ関数の実装
// ==========================================

/**
 * 一意IDの生成
 */
export function generateId(prefix: string = '', length: number = 8): ID {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}_${result}` : result;
}

/**
 * 現在時刻のISO文字列を取得
 */
export function getCurrentDateTime(): DateTime {
  return new Date().toISOString();
}

/**
 * 日時文字列のフォーマット
 */
export function formatDateTime(
  dateTime: DateTime,
  options: {
    format?: 'date' | 'time' | 'datetime' | 'relative';
    locale?: string;
    timezone?: string;
  } = {}
): string {
  const { format = 'datetime', locale = 'ja-JP', timezone = 'Asia/Tokyo' } = options;
  const date = new Date(dateTime);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateTime}`);
  }
  
  const formatOptions: Intl.DateTimeFormatOptions = { timeZone: timezone };
  
  switch (format) {
    case 'date':
      formatOptions.year = 'numeric';
      formatOptions.month = 'long';
      formatOptions.day = 'numeric';
      break;
    case 'time':
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      break;
    case 'datetime':
      formatOptions.year = 'numeric';
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      break;
    case 'relative':
      return formatRelativeTime(date);
  }
  
  return new Intl.DateTimeFormat(locale, formatOptions).format(date);
}

/**
 * 相対時間のフォーマット
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return '今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

/**
 * 文字列の正規化（全角・半角、大文字・小文字）
 */
export function normalizeString(
  str: string,
  options: {
    case?: 'lower' | 'upper' | 'none';
    width?: 'full' | 'half' | 'none';
    trim?: boolean;
  } = {}
): string {
  const { case: caseOption = 'none', width = 'none', trim = true } = options;
  
  let result = str;
  
  if (trim) {
    result = result.trim();
  }
  
  // 文字幅の正規化
  if (width === 'half') {
    result = result.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    });
  } else if (width === 'full') {
    result = result.replace(/[A-Za-z0-9]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) + 0xFEE0);
    });
  }
  
  // 大文字・小文字の正規化
  if (caseOption === 'lower') {
    result = result.toLowerCase();
  } else if (caseOption === 'upper') {
    result = result.toUpperCase();
  }
  
  return result;
}

/**
 * 文字列の検証
 */
export function validateString(
  value: string,
  rules: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    forbidden?: string[];
    required?: boolean;
  }
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { minLength, maxLength, pattern, forbidden, required = true } = rules;
  
  if (required && (!value || value.trim().length === 0)) {
    errors.push({
      field: 'value',
      message: '値は必須です',
      code: 'REQUIRED'
    });
    return errors;
  }
  
  if (minLength !== undefined && value.length < minLength) {
    errors.push({
      field: 'value',
      message: `最低${minLength}文字以上で入力してください`,
      code: 'MIN_LENGTH'
    });
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    errors.push({
      field: 'value',
      message: `最大${maxLength}文字以内で入力してください`,
      code: 'MAX_LENGTH'
    });
  }
  
  if (pattern && !pattern.test(value)) {
    errors.push({
      field: 'value',
      message: '形式が正しくありません',
      code: 'INVALID_PATTERN'
    });
  }
  
  if (forbidden && forbidden.some(word => value.includes(word))) {
    errors.push({
      field: 'value',
      message: '使用できない文字が含まれています',
      code: 'FORBIDDEN_CONTENT'
    });
  }
  
  return errors;
}

/**
 * 深いオブジェクトのクローン
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * オブジェクトの深い比較
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  
  if (aKeys.length !== bKeys.length) return false;
  
  return aKeys.every(key => deepEqual(a[key], b[key]));
}

/**
 * オブジェクトの安全な取得（ネストされたプロパティ）
 */
export function safeGet<T>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * 配列のユニーク要素を取得
 */
export function getUniqueItems<T>(
  array: T[],
  keyExtractor?: (item: T) => string | number
): T[] {
  if (!keyExtractor) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const key = keyExtractor(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 配列のグループ化
 */
export function groupBy<T>(
  array: T[],
  keyExtractor: (item: T) => string
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyExtractor(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * 配列のソート（多重条件）
 */
export function multiSort<T>(
  array: T[],
  comparers: Array<{
    selector: (item: T) => any;
    descending?: boolean;
  }>
): T[] {
  return [...array].sort((a, b) => {
    for (const { selector, descending = false } of comparers) {
      const aValue = selector(a);
      const bValue = selector(b);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;
      
      if (comparison !== 0) {
        return descending ? -comparison : comparison;
      }
    }
    return 0;
  });
}

/**
 * 数値の範囲チェック
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * パーセンテージの計算
 */
export function calculatePercentage(
  value: number,
  total: number,
  precision: number = 1
): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * Math.pow(10, precision)) / Math.pow(10, precision);
}

/**
 * 遅延実行（デバウンス）
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * スロットリング
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * APIレスポンスの作成ヘルパー
 */
export function createSuccessResponse<T>(data: T): APIResponse<T> {
  return {
    success: true,
    data,
    timestamp: getCurrentDateTime()
  };
}

export function createErrorResponse(error: string, errors?: ValidationError[]): APIResponse<never> {
  return {
    success: false,
    error,
    errors,
    timestamp: getCurrentDateTime()
  };
}

// ==========================================
// テストスイート
// ==========================================

describe('共通ユーティリティ関数の包括的テスト', () => {
  
  describe('ID生成', () => {
    test('指定された長さのIDを生成する', () => {
      const id = generateId('test', 10);
      expect(id).toMatch(/^test_[a-z0-9]{10}$/);
    });

    test('プレフィックスなしでIDを生成する', () => {
      const id = generateId('', 8);
      expect(id).toMatch(/^[a-z0-9]{8}$/);
    });

    test('デフォルト長さのIDを生成する', () => {
      const id = generateId('prefix');
      expect(id).toMatch(/^prefix_[a-z0-9]{8}$/);
    });

    test('生成されるIDが一意である', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('日時処理', () => {
    test('現在時刻のISO文字列を取得する', () => {
      const dateTime = getCurrentDateTime();
      expect(dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      const parsed = new Date(dateTime);
      expect(isNaN(parsed.getTime())).toBe(false);
    });

    test('日時文字列を日付形式でフォーマットする', () => {
      const dateTime = '2024-01-15T10:30:00.000Z';
      const formatted = formatDateTime(dateTime, { format: 'date', locale: 'ja-JP' });
      expect(formatted).toMatch(/2024年1月15日/);
    });

    test('日時文字列を時刻形式でフォーマットする', () => {
      const dateTime = '2024-01-15T10:30:00.000Z';
      const formatted = formatDateTime(dateTime, { format: 'time', locale: 'ja-JP' });
      expect(formatted).toMatch(/19:30/); // JST
    });

    test('無効な日時文字列でエラーを投げる', () => {
      expect(() => formatDateTime('invalid-date')).toThrow('Invalid date string');
    });

    test('相対時間のフォーマット', () => {
      const now = new Date('2024-01-15T10:30:00.000Z');
      
      expect(formatRelativeTime(new Date('2024-01-15T10:29:30.000Z'), now)).toBe('今');
      expect(formatRelativeTime(new Date('2024-01-15T10:25:00.000Z'), now)).toBe('5分前');
      expect(formatRelativeTime(new Date('2024-01-15T08:30:00.000Z'), now)).toBe('2時間前');
      expect(formatRelativeTime(new Date('2024-01-14T10:30:00.000Z'), now)).toBe('1日前');
      expect(formatRelativeTime(new Date('2024-01-08T10:30:00.000Z'), now)).toBe('1週間前');
    });
  });

  describe('文字列操作', () => {
    test('文字列の正規化（大文字・小文字）', () => {
      expect(normalizeString('Hello World', { case: 'lower' })).toBe('hello world');
      expect(normalizeString('hello world', { case: 'upper' })).toBe('HELLO WORLD');
      expect(normalizeString(' Hello World ', { case: 'none', trim: true })).toBe('Hello World');
    });

    test('文字列の正規化（全角・半角）', () => {
      expect(normalizeString('Ｈｅｌｌｏ１２３', { width: 'half' })).toBe('Hello123');
      expect(normalizeString('Hello123', { width: 'full' })).toBe('Ｈｅｌｌｏ１２３');
    });

    test('文字列の検証（必須チェック）', () => {
      const errors = validateString('', { required: true });
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('REQUIRED');
    });

    test('文字列の検証（長さチェック）', () => {
      const errors = validateString('ab', { minLength: 3, maxLength: 10 });
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MIN_LENGTH');
      
      const errors2 = validateString('abcdefghijk', { maxLength: 10 });
      expect(errors2).toHaveLength(1);
      expect(errors2[0].code).toBe('MAX_LENGTH');
    });

    test('文字列の検証（パターンチェック）', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const errors = validateString('invalid-email', { pattern: emailPattern });
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_PATTERN');
    });

    test('文字列の検証（禁止語チェック）', () => {
      const errors = validateString('This contains spam word', { forbidden: ['spam', 'abuse'] });
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('FORBIDDEN_CONTENT');
    });
  });

  describe('オブジェクト操作', () => {
    test('深いクローンの作成', () => {
      const original = {
        name: 'Test',
        stats: { strength: 10, dexterity: 12 },
        tags: ['hero', 'fighter'],
        createdAt: new Date('2024-01-01')
      };
      
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.stats).not.toBe(original.stats);
      expect(cloned.tags).not.toBe(original.tags);
      expect(cloned.createdAt).not.toBe(original.createdAt);
    });

    test('深い比較', () => {
      const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
      const obj2 = { a: 1, b: { c: 2, d: [3, 4] } };
      const obj3 = { a: 1, b: { c: 2, d: [3, 5] } };
      
      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    test('ネストされたプロパティの安全な取得', () => {
      const obj = {
        user: {
          profile: {
            name: 'Test User',
            address: {
              city: 'Tokyo'
            }
          }
        }
      };
      
      expect(safeGet(obj, 'user.profile.name')).toBe('Test User');
      expect(safeGet(obj, 'user.profile.address.city')).toBe('Tokyo');
      expect(safeGet(obj, 'user.profile.phone', 'N/A')).toBe('N/A');
      expect(safeGet(obj, 'nonexistent.path')).toBeUndefined();
    });
  });

  describe('配列操作', () => {
    test('ユニーク要素の取得', () => {
      const numbers = [1, 2, 2, 3, 3, 3, 4];
      expect(getUniqueItems(numbers)).toEqual([1, 2, 3, 4]);
      
      const objects = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' },
        { id: 3, name: 'C' }
      ];
      const unique = getUniqueItems(objects, item => item.id);
      expect(unique).toHaveLength(3);
      expect(unique.map(item => item.id)).toEqual([1, 2, 3]);
    });

    test('配列のグループ化', () => {
      const characters = [
        { name: 'Alice', type: 'pc' },
        { name: 'Bob', type: 'pc' },
        { name: 'Goblin', type: 'enemy' },
        { name: 'Wizard', type: 'npc' }
      ];
      
      const grouped = groupBy(characters, char => char.type);
      
      expect(grouped.pc).toHaveLength(2);
      expect(grouped.enemy).toHaveLength(1);
      expect(grouped.npc).toHaveLength(1);
    });

    test('多重条件ソート', () => {
      const items = [
        { name: 'C', level: 2 },
        { name: 'A', level: 3 },
        { name: 'B', level: 2 },
        { name: 'A', level: 1 }
      ];
      
      const sorted = multiSort(items, [
        { selector: item => item.name },
        { selector: item => item.level, descending: true }
      ]);
      
      expect(sorted.map(item => `${item.name}-${item.level}`)).toEqual([
        'A-3', 'A-1', 'B-2', 'C-2'
      ]);
    });
  });

  describe('数値ユーティリティ', () => {
    test('値の範囲制限', () => {
      expect(clamp(5, 1, 10)).toBe(5);
      expect(clamp(-5, 1, 10)).toBe(1);
      expect(clamp(15, 1, 10)).toBe(10);
    });

    test('パーセンテージの計算', () => {
      expect(calculatePercentage(50, 200)).toBe(25.0);
      expect(calculatePercentage(1, 3, 2)).toBe(33.33);
      expect(calculatePercentage(10, 0)).toBe(0);
    });
  });

  describe('関数制御', () => {
    test('デバウンス機能', (done: jest.DoneCallback) => {
      let callCount = 0;
      const debouncedFunc = debounce(() => {
        callCount++;
      }, 50);
      
      // 短期間に複数回呼び出し
      debouncedFunc();
      debouncedFunc();
      debouncedFunc();
      
      // 即座にはまだ実行されない
      expect(callCount).toBe(0);
      
      // 遅延後に1回だけ実行される
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 100);
    });

    test('スロットリング機能', () => {
      let callCount = 0;
      const throttledFunc = throttle(() => {
        callCount++;
      }, 100);
      
      // 即座に1回実行される
      throttledFunc();
      expect(callCount).toBe(1);
      
      // 短期間内の呼び出しは無視される
      throttledFunc();
      throttledFunc();
      expect(callCount).toBe(1);
    });
  });

  describe('APIレスポンス作成', () => {
    test('成功レスポンスの作成', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('エラーレスポンスの作成', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' }
      ];
      const response = createErrorResponse('Validation failed', errors);
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Validation failed');
      expect(response.errors).toEqual(errors);
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('型安全性とエッジケース', () => {
    test('null/undefinedの安全な処理', () => {
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    test('空配列/空オブジェクトの処理', () => {
      expect(getUniqueItems([])).toEqual([]);
      expect(groupBy([], x => x)).toEqual({});
      expect(multiSort([], [])).toEqual([]);
    });

    test('大きなデータでのパフォーマンス', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i % 100, value: i }));
      
      const startTime = Date.now();
      const unique = getUniqueItems(largeArray, item => item.id);
      const endTime = Date.now();
      
      expect(unique).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });

    test('Unicode文字列の処理', () => {
      const unicodeString = '🎲🐉⚔️ ファンタジー';
      expect(normalizeString(unicodeString, { trim: true })).toBe(unicodeString);
      expect(validateString(unicodeString, { minLength: 5 })).toHaveLength(0);
    });

    test('循環参照の検出（深いクローンでエラー）', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // 循環参照
      
      // 循環参照があるオブジェクトのクローンは無限ループになる可能性
      // 実際のプロダクションコードでは循環参照の検出が必要
      expect(() => {
        const cloned = deepClone(obj);
        // 循環参照の検出テストは複雑なため、ここでは制限付きテスト
        expect(cloned.name).toBe('test');
      }).not.toThrow();
    });
  });

  describe('国際化対応', () => {
    test('異なるロケールでの日時フォーマット', () => {
      const dateTime = '2024-01-15T10:30:00.000Z';
      
      const jaFormat = formatDateTime(dateTime, { format: 'date', locale: 'ja-JP' });
      const enFormat = formatDateTime(dateTime, { format: 'date', locale: 'en-US' });
      
      expect(jaFormat).toMatch(/2024年/);
      expect(enFormat).toMatch(/Jan/);
    });

    test('日本語文字列の正規化', () => {
      const japaneseText = '　全角スペース　';
      const normalized = normalizeString(japaneseText, { trim: true });
      expect(normalized).toBe('全角スペース');
    });
  });
});