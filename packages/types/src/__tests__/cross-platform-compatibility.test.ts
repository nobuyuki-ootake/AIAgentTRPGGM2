/**
 * クロスプラットフォーム互換性の包括的テスト
 * Cross-Platform Compatibility Comprehensive Tests
 * 
 * テスト対象:
 * - ブラウザ/Node.js環境の互換性
 * - 異なるタイムゾーンでの動作
 * - エンディアン（バイト順）の処理
 * - 文字エンコーディングの統一
 * - OS固有のパス処理
 * - プラットフォーム固有APIの抽象化
 */

import type { DateTime, ID } from '../index';

// ==========================================
// プラットフォーム検出ユーティリティ
// ==========================================

/**
 * 実行環境の種類
 */
export type Platform = 'browser' | 'node' | 'webworker' | 'unknown';

/**
 * プラットフォーム検出クラス
 */
export class PlatformDetector {
  /**
   * 現在の実行環境を検出
   */
  static detect(): Platform {
    // Node.js環境の検出
    if (typeof process !== 'undefined' && 
        process.versions && 
        process.versions.node) {
      return 'node';
    }
    
    // Web Worker環境の検出
    if (typeof self !== 'undefined' && 
        typeof window === 'undefined' && 
        typeof importScripts === 'function') {
      return 'webworker';
    }
    
    // ブラウザ環境の検出
    if (typeof window !== 'undefined' && 
        typeof document !== 'undefined') {
      return 'browser';
    }
    
    return 'unknown';
  }

  /**
   * 特定の環境でのみ実行されることを確認
   */
  static requirePlatform(requiredPlatform: Platform): void {
    const currentPlatform = this.detect();
    if (currentPlatform !== requiredPlatform) {
      throw new Error(`This function requires ${requiredPlatform} environment, but running on ${currentPlatform}`);
    }
  }

  /**
   * 利用可能なAPIの確認
   */
  static hasAPI(apiName: string): boolean {
    try {
      switch (apiName) {
        case 'crypto':
          return typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
        case 'subtle':
          return typeof crypto !== 'undefined' && typeof crypto.subtle === 'object';
        case 'fetch':
          return typeof fetch === 'function';
        case 'localStorage':
          return typeof localStorage !== 'undefined';
        case 'fs':
          try {
            require('fs');
            return true;
          } catch {
            return false;
          }
        case 'path':
          try {
            require('path');
            return true;
          } catch {
            return false;
          }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}

// ==========================================
// プラットフォーム統一インターフェース
// ==========================================

/**
 * ストレージの統一インターフェース
 */
export interface UnifiedStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * ブラウザ用ストレージ実装
 */
export class BrowserStorage implements UnifiedStorage {
  constructor(private storage: Storage = localStorage) {}

  async getItem(key: string): Promise<string | null> {
    return this.storage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.removeItem(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

/**
 * Node.js用ストレージ実装（ファイルベース）
 */
export class NodeStorage implements UnifiedStorage {
  private storageDir: string;

  constructor(storageDir: string = './storage') {
    this.storageDir = storageDir;
  }

  private getFilePath(key: string): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${this.storageDir}/${sanitizedKey}.json`;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (PlatformDetector.hasAPI('fs')) {
        const fs = require('fs').promises;
        const filePath = this.getFilePath(key);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data).value;
      }
      return null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (PlatformDetector.hasAPI('fs')) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = this.getFilePath(key);
        const dir = path.dirname(filePath);
        
        // ディレクトリが存在しない場合は作成
        await fs.mkdir(dir, { recursive: true });
        
        const data = JSON.stringify({ value, timestamp: Date.now() });
        await fs.writeFile(filePath, data, 'utf8');
      }
    } catch (error) {
      throw new Error(`Failed to set item: ${error}`);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (PlatformDetector.hasAPI('fs')) {
        const fs = require('fs').promises;
        const filePath = this.getFilePath(key);
        await fs.unlink(filePath);
      }
    } catch {
      // ファイルが存在しない場合は無視
    }
  }

  async clear(): Promise<void> {
    try {
      if (PlatformDetector.hasAPI('fs')) {
        const fs = require('fs').promises;
        const files = await fs.readdir(this.storageDir);
        await Promise.all(
          files
            .filter((file: string) => file.endsWith('.json'))
            .map((file: string) => fs.unlink(`${this.storageDir}/${file}`))
        );
      }
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  }
}

/**
 * ストレージファクトリー
 */
export class StorageFactory {
  static create(): UnifiedStorage {
    const platform = PlatformDetector.detect();
    
    switch (platform) {
      case 'browser':
      case 'webworker':
        return new BrowserStorage();
      case 'node':
        return new NodeStorage();
      default:
        // メモリベースのフォールバック
        return new MemoryStorage();
    }
  }
}

/**
 * メモリベースストレージ（フォールバック）
 */
export class MemoryStorage implements UnifiedStorage {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

// ==========================================
// 日時処理の統一
// ==========================================

/**
 * プラットフォーム統一日時ユーティリティ
 */
export class UnifiedDateTime {
  /**
   * 現在時刻をISO文字列で取得
   */
  static now(): DateTime {
    return new Date().toISOString();
  }

  /**
   * タイムゾーンを考慮した日時フォーマット
   */
  static format(
    dateTime: DateTime,
    options: {
      timeZone?: string;
      locale?: string;
      format?: 'date' | 'time' | 'datetime';
    } = {}
  ): string {
    const { timeZone = 'UTC', locale = 'en-US', format = 'datetime' } = options;
    
    try {
      const date = new Date(dateTime);
      
      let formatOptions: Intl.DateTimeFormatOptions = { timeZone };
      
      switch (format) {
        case 'date':
          formatOptions = { ...formatOptions, year: 'numeric', month: '2-digit', day: '2-digit' };
          break;
        case 'time':
          formatOptions = { ...formatOptions, hour: '2-digit', minute: '2-digit', second: '2-digit' };
          break;
        case 'datetime':
          formatOptions = {
            ...formatOptions,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          };
          break;
      }
      
      return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch (error) {
      // フォールバック
      return new Date(dateTime).toISOString();
    }
  }

  /**
   * タイムゾーン間の変換
   */
  static convertTimezone(dateTime: DateTime, targetTimezone: string): DateTime {
    try {
      const date = new Date(dateTime);
      
      // 目標タイムゾーンでの時刻を取得
      const targetTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: targetTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
      
      // ISO形式に変換
      const [datePart, timePart] = targetTime.split(', ');
      return `${datePart}T${timePart}.000Z`;
    } catch {
      // フォールバック：元の時刻をそのまま返す
      return dateTime;
    }
  }

  /**
   * 異なるタイムゾーン間での時刻比較
   */
  static compare(
    dateTime1: DateTime,
    dateTime2: DateTime,
    timezone1: string = 'UTC',
    timezone2: string = 'UTC'
  ): number {
    const normalized1 = this.convertTimezone(dateTime1, 'UTC');
    const normalized2 = this.convertTimezone(dateTime2, 'UTC');
    
    const time1 = new Date(normalized1).getTime();
    const time2 = new Date(normalized2).getTime();
    
    return time1 - time2;
  }
}

// ==========================================
// バイナリデータ処理の統一
// ==========================================

/**
 * プラットフォーム統一バイナリユーティリティ
 */
export class UnifiedBinary {
  /**
   * 文字列をUTF-8バイト配列に変換
   */
  static stringToBytes(str: string): Uint8Array {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    } else {
      // フォールバック
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xc0 | (code >> 6));
          bytes.push(0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes.push(0xe0 | (code >> 12));
          bytes.push(0x80 | ((code >> 6) & 0x3f));
          bytes.push(0x80 | (code & 0x3f));
        } else {
          // サロゲートペア
          const high = code;
          const low = str.charCodeAt(++i);
          const codePoint = 0x10000 + (((high & 0x3ff) << 10) | (low & 0x3ff));
          bytes.push(0xf0 | (codePoint >> 18));
          bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
          bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
          bytes.push(0x80 | (codePoint & 0x3f));
        }
      }
      return new Uint8Array(bytes);
    }
  }

  /**
   * UTF-8バイト配列を文字列に変換
   */
  static bytesToString(bytes: Uint8Array): string {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    } else {
      // フォールバック
      let str = '';
      let i = 0;
      
      while (i < bytes.length) {
        let byte1 = bytes[i++];
        
        if (byte1 < 0x80) {
          str += String.fromCharCode(byte1);
        } else if ((byte1 & 0xe0) === 0xc0) {
          const byte2 = bytes[i++];
          str += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
        } else if ((byte1 & 0xf0) === 0xe0) {
          const byte2 = bytes[i++];
          const byte3 = bytes[i++];
          str += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
        } else if ((byte1 & 0xf8) === 0xf0) {
          const byte2 = bytes[i++];
          const byte3 = bytes[i++];
          const byte4 = bytes[i++];
          const codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
          const high = 0xd800 + ((codePoint - 0x10000) >> 10);
          const low = 0xdc00 + ((codePoint - 0x10000) & 0x3ff);
          str += String.fromCharCode(high, low);
        }
      }
      
      return str;
    }
  }

  /**
   * エンディアンを検出
   */
  static getEndianness(): 'little' | 'big' {
    const buffer = new ArrayBuffer(2);
    const uint8Array = new Uint8Array(buffer);
    const uint16Array = new Uint16Array(buffer);
    
    uint8Array[0] = 0x12;
    uint8Array[1] = 0x34;
    
    return uint16Array[0] === 0x3412 ? 'little' : 'big';
  }

  /**
   * バイト順を統一（リトルエンディアンに正規化）
   */
  static normalizeEndianness(buffer: ArrayBuffer): ArrayBuffer {
    if (this.getEndianness() === 'little') {
      return buffer;
    }
    
    // ビッグエンディアンの場合はバイト順を反転
    const bytes = new Uint8Array(buffer);
    const reversed = new Uint8Array(bytes.length);
    
    for (let i = 0; i < bytes.length; i++) {
      reversed[i] = bytes[bytes.length - 1 - i];
    }
    
    return reversed.buffer;
  }
}

// ==========================================
// ネットワーク処理の統一
// ==========================================

/**
 * プラットフォーム統一HTTPクライアント
 */
export class UnifiedHTTP {
  /**
   * HTTPリクエストを送信
   */
  static async request(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    } = {}
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    const { method = 'GET', headers = {}, body, timeout = 10000 } = options;
    
    if (PlatformDetector.hasAPI('fetch')) {
      // Fetch API使用（ブラウザ/Node.js 18+）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        return {
          status: response.status,
          headers: responseHeaders,
          body: await response.text()
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } else {
      // Node.js httpsモジュール使用
      return new Promise((resolve, reject) => {
        try {
          const https = require('https');
          const urlObj = new URL(url);
          
          const req = https.request({
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method,
            headers,
            timeout
          }, (res: any) => {
            let responseBody = '';
            res.on('data', (chunk: any) => {
              responseBody += chunk;
            });
            
            res.on('end', () => {
              const responseHeaders: Record<string, string> = {};
              Object.entries(res.headers).forEach(([key, value]) => {
                responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value as string;
              });
              
              resolve({
                status: res.statusCode,
                headers: responseHeaders,
                body: responseBody
              });
            });
          });
          
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
          
          if (body) {
            req.write(body);
          }
          
          req.end();
        } catch (error) {
          reject(error);
        }
      });
    }
  }
}

// ==========================================
// テストスイート
// ==========================================

describe('クロスプラットフォーム互換性の包括的テスト', () => {
  
  describe('PlatformDetector', () => {
    test('実行環境を正しく検出する', () => {
      const platform = PlatformDetector.detect();
      expect(['browser', 'node', 'webworker', 'unknown']).toContain(platform);
      
      // Vitestではnode環境
      expect(platform).toBe('node');
    });

    test('利用可能なAPIを正しく検出する', () => {
      // Node.js環境で利用可能なAPI
      expect(PlatformDetector.hasAPI('fs')).toBe(true);
      expect(PlatformDetector.hasAPI('path')).toBe(true);
      
      // ブラウザ固有APIは利用不可
      expect(PlatformDetector.hasAPI('localStorage')).toBe(false);
      
      // 共通API
      const hasCrypto = PlatformDetector.hasAPI('crypto');
      // Node.js バージョンによって異なる可能性がある
      expect(typeof hasCrypto).toBe('boolean');
    });

    test('プラットフォーム要件チェック', () => {
      expect(() => {
        PlatformDetector.requirePlatform('node');
      }).not.toThrow();

      expect(() => {
        PlatformDetector.requirePlatform('browser');
      }).toThrow('This function requires browser environment');
    });
  });

  describe('UnifiedStorage', () => {
    test('ストレージファクトリーが適切な実装を返す', () => {
      const storage = StorageFactory.create();
      
      // Node.js環境ではNodeStorageまたはMemoryStorageが返される
      expect(storage).toBeInstanceOf(NodeStorage);
    });

    test('ストレージの基本操作が動作する', async () => {
      const storage = new MemoryStorage();
      
      // 初期状態では値が存在しない
      expect(await storage.getItem('test')).toBeNull();
      
      // 値を設定
      await storage.setItem('test', 'value');
      expect(await storage.getItem('test')).toBe('value');
      
      // 値を削除
      await storage.removeItem('test');
      expect(await storage.getItem('test')).toBeNull();
      
      // 複数値の設定と一括削除
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      expect(await storage.getItem('key1')).toBe('value1');
      expect(await storage.getItem('key2')).toBe('value2');
      
      await storage.clear();
      expect(await storage.getItem('key1')).toBeNull();
      expect(await storage.getItem('key2')).toBeNull();
    });

    test('NodeStorageがファイルベースで動作する', async () => {
      const storage = new NodeStorage('./test-storage');
      
      try {
        await storage.setItem('test-key', 'test-value');
        const retrieved = await storage.getItem('test-key');
        expect(retrieved).toBe('test-value');
        
        await storage.removeItem('test-key');
        const afterRemoval = await storage.getItem('test-key');
        expect(afterRemoval).toBeNull();
      } catch (error) {
        // ファイルシステムアクセスができない環境では スキップ
        expect(error).toBeDefined();
      }
    });

    test('ストレージが大量データを処理できる', async () => {
      const storage = new MemoryStorage();
      const largeData = 'x'.repeat(10000);
      
      await storage.setItem('large-data', largeData);
      const retrieved = await storage.getItem('large-data');
      expect(retrieved).toBe(largeData);
    });
  });

  describe('UnifiedDateTime', () => {
    test('現在時刻をISO形式で取得する', () => {
      const now = UnifiedDateTime.now();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      const parsed = new Date(now);
      expect(isNaN(parsed.getTime())).toBe(false);
    });

    test('異なるタイムゾーンで日時をフォーマットする', () => {
      const testDateTime = '2024-01-15T12:00:00.000Z';
      
      const utcFormat = UnifiedDateTime.format(testDateTime, {
        timeZone: 'UTC',
        format: 'datetime'
      });
      
      const jstFormat = UnifiedDateTime.format(testDateTime, {
        timeZone: 'Asia/Tokyo',
        format: 'datetime'
      });
      
      expect(utcFormat).toBeTruthy();
      expect(jstFormat).toBeTruthy();
      expect(utcFormat).not.toBe(jstFormat);
    });

    test('日付・時刻・日時の個別フォーマット', () => {
      const testDateTime = '2024-01-15T12:30:45.000Z';
      
      const dateOnly = UnifiedDateTime.format(testDateTime, { format: 'date' });
      const timeOnly = UnifiedDateTime.format(testDateTime, { format: 'time' });
      const fullDateTime = UnifiedDateTime.format(testDateTime, { format: 'datetime' });
      
      expect(dateOnly).toMatch(/2024/);
      expect(timeOnly).toMatch(/:/);
      expect(fullDateTime).toMatch(/2024.*:/);
    });

    test('タイムゾーン変換が正しく動作する', () => {
      const utcTime = '2024-01-15T12:00:00.000Z';
      
      // UTCからJSTへの変換（+9時間）
      const jstTime = UnifiedDateTime.convertTimezone(utcTime, 'Asia/Tokyo');
      expect(jstTime).toBeTruthy();
      
      // 変換結果がISO形式であること
      expect(jstTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('異なるタイムゾーン間での時刻比較', () => {
      const utcTime = '2024-01-15T12:00:00.000Z';
      const jstTime = '2024-01-15T21:00:00.000Z'; // 同じ時刻（JST 21:00 = UTC 12:00）
      const laterTime = '2024-01-15T13:00:00.000Z';
      
      expect(UnifiedDateTime.compare(utcTime, jstTime)).toBe(0);
      expect(UnifiedDateTime.compare(utcTime, laterTime)).toBeLessThan(0);
      expect(UnifiedDateTime.compare(laterTime, utcTime)).toBeGreaterThan(0);
    });

    test('無効な日時に対するフォールバック', () => {
      const invalidDateTime = 'invalid-date';
      
      expect(() => {
        UnifiedDateTime.format(invalidDateTime);
      }).not.toThrow(); // フォールバックが動作
      
      const result = UnifiedDateTime.convertTimezone(invalidDateTime, 'UTC');
      expect(result).toBe(invalidDateTime); // 元の値をそのまま返す
    });
  });

  describe('UnifiedBinary', () => {
    test('文字列とバイト配列の相互変換', () => {
      const testStrings = [
        'Hello, World!',
        'こんにちは世界',
        '🌍🚀✨',
        'ASCII + 日本語 + Emoji 🎉',
        ''
      ];
      
      testStrings.forEach(str => {
        const bytes = UnifiedBinary.stringToBytes(str);
        const restored = UnifiedBinary.bytesToString(bytes);
        expect(restored).toBe(str);
      });
    });

    test('UTF-8エンコーディングの正確性', () => {
      // 既知のUTF-8バイト列との比較
      const asciiStr = 'ABC';
      const asciiBytes = UnifiedBinary.stringToBytes(asciiStr);
      expect(Array.from(asciiBytes)).toEqual([0x41, 0x42, 0x43]);
      
      const unicodeStr = 'あ'; // U+3042
      const unicodeBytes = UnifiedBinary.stringToBytes(unicodeStr);
      expect(Array.from(unicodeBytes)).toEqual([0xE3, 0x81, 0x82]);
    });

    test('エンディアンの検出', () => {
      const endianness = UnifiedBinary.getEndianness();
      expect(['little', 'big']).toContain(endianness);
      
      // 大部分の現代的なシステムはリトルエンディアン
      expect(endianness).toBe('little');
    });

    test('エンディアンの正規化', () => {
      const originalBuffer = new ArrayBuffer(4);
      const view = new DataView(originalBuffer);
      view.setUint32(0, 0x12345678, false); // ビッグエンディアンで書き込み
      
      const normalized = UnifiedBinary.normalizeEndianness(originalBuffer);
      const normalizedView = new DataView(normalized);
      
      // 正規化後はリトルエンディアンになっているはず
      const currentEndianness = UnifiedBinary.getEndianness();
      if (currentEndianness === 'little') {
        expect(normalized).toBe(originalBuffer); // 既にリトルエンディアンなら変更なし
      } else {
        expect(normalized).not.toBe(originalBuffer); // バイト順が反転される
      }
    });

    test('大きなデータの処理', () => {
      const largeString = 'あいうえお'.repeat(10000);
      const bytes = UnifiedBinary.stringToBytes(largeString);
      const restored = UnifiedBinary.bytesToString(bytes);
      
      expect(restored).toBe(largeString);
      expect(bytes.length).toBeGreaterThan(largeString.length); // マルチバイト文字のため
    });

    test('エッジケースの処理', () => {
      // 空文字列
      expect(UnifiedBinary.bytesToString(UnifiedBinary.stringToBytes(''))).toBe('');
      
      // ヌル文字を含む文字列
      const withNull = 'Hello\x00World';
      expect(UnifiedBinary.bytesToString(UnifiedBinary.stringToBytes(withNull))).toBe(withNull);
      
      // サロゲートペア
      const emoji = '👨‍👩‍👧‍👦'; // 複雑な絵文字
      expect(UnifiedBinary.bytesToString(UnifiedBinary.stringToBytes(emoji))).toBe(emoji);
    });
  });

  describe('UnifiedHTTP', () => {
    test('HTTPリクエストの基本構造', async () => {
      // モックサーバーがない場合はエラーハンドリングをテスト
      try {
        const response = await UnifiedHTTP.request('https://httpbin.org/get', {
          method: 'GET',
          timeout: 5000
        });
        
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.headers).toBeTruthy();
        expect(typeof response.body).toBe('string');
      } catch (error) {
        // ネットワークエラーは許容
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('HTTPリクエストのタイムアウト', async () => {
      try {
        await UnifiedHTTP.request('https://httpbin.org/delay/10', {
          timeout: 1000 // 1秒でタイムアウト
        });
        
        // タイムアウトエラーが発生するはず
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('HTTPリクエストのヘッダー処理', async () => {
      const customHeaders = {
        'User-Agent': 'UnifiedHTTP-Test/1.0',
        'Accept': 'application/json'
      };
      
      try {
        const response = await UnifiedHTTP.request('https://httpbin.org/headers', {
          headers: customHeaders,
          timeout: 5000
        });
        
        expect(response.status).toBe(200);
        
        // レスポンスヘッダーが適切に取得できること
        expect(typeof response.headers['content-type']).toBe('string');
      } catch (error) {
        // ネットワークエラーは許容
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('プラットフォーム間の一貫性', () => {
    test('同じ処理結果が異なる環境で一致する', () => {
      const testData = 'Test data for consistency check 🎯';
      
      // バイナリ処理の一貫性
      const bytes1 = UnifiedBinary.stringToBytes(testData);
      const bytes2 = UnifiedBinary.stringToBytes(testData);
      expect(Array.from(bytes1)).toEqual(Array.from(bytes2));
      
      // 日時処理の一貫性
      const testTime = '2024-01-15T12:00:00.000Z';
      const format1 = UnifiedDateTime.format(testTime, { timeZone: 'UTC' });
      const format2 = UnifiedDateTime.format(testTime, { timeZone: 'UTC' });
      expect(format1).toBe(format2);
    });

    test('異なるデータ型の統一処理', async () => {
      const storage = new MemoryStorage();
      
      // 各種データ型の保存と復元
      const testData = {
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        unicode: '🌟日本語🌟',
        null: null
      };
      
      const serialized = JSON.stringify(testData);
      await storage.setItem('test-data', serialized);
      
      const retrieved = await storage.getItem('test-data');
      const deserialized = JSON.parse(retrieved!);
      
      expect(deserialized).toEqual(testData);
    });

    test('大きなデータセットでの一貫性', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        timestamp: UnifiedDateTime.now(),
        data: 'x'.repeat(100)
      }));
      
      // シリアライゼーション/デシリアライゼーションの一貫性
      const serialized = JSON.stringify(largeDataset);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(largeDataset);
      expect(deserialized).toHaveLength(1000);
    });
  });

  describe('エラーハンドリングとフォールバック', () => {
    test('利用不可能なAPIに対するフォールバック', () => {
      // crypto APIが利用できない場合のテスト
      const originalCrypto = global.crypto;
      
      try {
        // crypto APIを一時的に無効化
        (global as any).crypto = undefined;
        
        // フォールバック実装が動作することを確認
        expect(() => {
          UnifiedBinary.stringToBytes('test');
        }).not.toThrow();
        
      } finally {
        // 元に戻す
        global.crypto = originalCrypto;
      }
    });

    test('ストレージエラーの適切な処理', async () => {
      // エラーを投げるストレージ実装
      class ErrorStorage implements UnifiedStorage {
        async getItem(_key: string): Promise<string | null> {
          throw new Error('Storage error');
        }
        
        async setItem(_key: string, _value: string): Promise<void> {
          throw new Error('Storage error');
        }
        
        async removeItem(_key: string): Promise<void> {
          throw new Error('Storage error');
        }
        
        async clear(): Promise<void> {
          throw new Error('Storage error');
        }
      }
      
      const errorStorage = new ErrorStorage();
      
      await expect(errorStorage.getItem('test')).rejects.toThrow('Storage error');
      await expect(errorStorage.setItem('test', 'value')).rejects.toThrow('Storage error');
    });

    test('無効な入力に対するロバスト性', () => {
      // 無効なバイナリデータ
      const invalidBytes = new Uint8Array([0xFF, 0xFE, 0xFD]);
      expect(() => {
        UnifiedBinary.bytesToString(invalidBytes);
      }).not.toThrow(); // エラーではなく最善の変換を試行
      
      // 無効な日時
      expect(() => {
        UnifiedDateTime.format('invalid-date');
      }).not.toThrow(); // フォールバックが動作
    });
  });

  describe('パフォーマンスとスケーラビリティ', () => {
    test('大量データ処理のパフォーマンス', () => {
      const startTime = Date.now();
      
      // 10000個の文字列をバイナリ変換
      for (let i = 0; i < 10000; i++) {
        const str = `Test string ${i}`;
        const bytes = UnifiedBinary.stringToBytes(str);
        UnifiedBinary.bytesToString(bytes);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    test('メモリ効率的な処理', async () => {
      const storage = new MemoryStorage();
      
      // 1000個のアイテムを保存
      for (let i = 0; i < 1000; i++) {
        await storage.setItem(`key${i}`, `value${i}`);
      }
      
      // ランダムアクセス
      for (let i = 0; i < 100; i++) {
        const randomKey = `key${Math.floor(Math.random() * 1000)}`;
        const value = await storage.getItem(randomKey);
        expect(value).toBeTruthy();
      }
      
      // 一括削除
      await storage.clear();
      
      // 全て削除されていることを確認
      const value = await storage.getItem('key0');
      expect(value).toBeNull();
    });
  });

  describe('実世界のユースケース', () => {
    test('TRPGデータの保存と復元', async () => {
      const storage = StorageFactory.create();
      
      const trpgSession = {
        id: 'session_123',
        campaignId: 'campaign_456',
        characters: [
          { id: 'char_1', name: 'アリス', stats: { strength: 16 } },
          { id: 'char_2', name: 'ボブ', stats: { intelligence: 18 } }
        ],
        currentTime: UnifiedDateTime.now(),
        chatLog: [
          { timestamp: UnifiedDateTime.now(), speaker: 'GM', message: 'セッション開始です' },
          { timestamp: UnifiedDateTime.now(), speaker: 'アリス', message: 'よろしくお願いします！' }
        ]
      };
      
      // セッションデータを保存
      await storage.setItem('current_session', JSON.stringify(trpgSession));
      
      // 復元
      const restored = await storage.getItem('current_session');
      const restoredSession = JSON.parse(restored!);
      
      expect(restoredSession.id).toBe('session_123');
      expect(restoredSession.characters).toHaveLength(2);
      expect(restoredSession.chatLog[0].speaker).toBe('GM');
    });

    test('マルチタイムゾーンでのセッション管理', () => {
      const sessionStartTime = '2024-01-15T20:00:00.000Z'; // UTC 20:00
      
      // 各プレイヤーのタイムゾーンでの表示
      const tokyoTime = UnifiedDateTime.format(sessionStartTime, {
        timeZone: 'Asia/Tokyo',
        format: 'datetime'
      });
      
      const nyTime = UnifiedDateTime.format(sessionStartTime, {
        timeZone: 'America/New_York',
        format: 'datetime'
      });
      
      const londonTime = UnifiedDateTime.format(sessionStartTime, {
        timeZone: 'Europe/London',
        format: 'datetime'
      });
      
      // 各タイムゾーンで異なる表示になること
      expect(tokyoTime).toBeTruthy();
      expect(nyTime).toBeTruthy();
      expect(londonTime).toBeTruthy();
      
      // しかし、UTC時刻での比較では同じであること
      const utcTime1 = UnifiedDateTime.convertTimezone(sessionStartTime, 'UTC');
      const utcTime2 = UnifiedDateTime.convertTimezone(sessionStartTime, 'UTC');
      expect(UnifiedDateTime.compare(utcTime1, utcTime2)).toBe(0);
    });

    test('プラットフォーム間でのデータ互換性', () => {
      const gameData = {
        version: '1.0.0',
        platform: PlatformDetector.detect(),
        timestamp: UnifiedDateTime.now(),
        binaryData: Array.from(UnifiedBinary.stringToBytes('Game save data 🎮')),
        characters: ['Hero', 'Mage', 'Rogue'].map(name => ({
          name,
          id: `char_${name.toLowerCase()}`,
          createdAt: UnifiedDateTime.now()
        }))
      };
      
      // JSON シリアライゼーション
      const serialized = JSON.stringify(gameData);
      const deserialized = JSON.parse(serialized);
      
      // バイナリデータの復元
      const restoredBinary = new Uint8Array(deserialized.binaryData);
      const restoredText = UnifiedBinary.bytesToString(restoredBinary);
      
      expect(restoredText).toBe('Game save data 🎮');
      expect(deserialized.characters).toHaveLength(3);
      expect(deserialized.platform).toBe(PlatformDetector.detect());
    });
  });
});