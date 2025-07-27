/**
 * テストヘルパー関数
 * t-WADA命名規則: testHelpers.ts
 * テスト実行の共通処理とユーティリティ
 * 
 * Updated to integrate with comprehensive Jest setup
 */

import { Request, Response } from 'express';
import { jest } from '@jest/globals';
import { TRPGCampaign, TRPGCharacter, TRPGSession } from '@ai-agent-trpg/types';
import { TestDataFactory } from '../setup/testDatabase';
import { ValidationTestUtils, EnvironmentTestUtils } from './testUtils';

/**
 * Expressリクエストモックを作成
 */
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    method: 'GET',
    url: '/',
    ...overrides
  };
};

/**
 * Expressレスポンスモックを作成
 */
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis()
  };
  return res;
};

/**
 * 非同期関数のテストヘルパー
 * エラーハンドリングを含む
 */
export const expectAsyncToThrow = async (
  asyncFunction: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> => {
  let errorThrown = false;
  try {
    await asyncFunction();
  } catch (error) {
    errorThrown = true;
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
  }
  
  if (!errorThrown) {
    throw new Error('Expected function to throw an error, but it did not');
  }
};

/**
 * 非同期関数の成功テストヘルパー
 */
export const expectAsyncToSucceed = async (
  asyncFunction: () => Promise<any>
): Promise<any> => {
  try {
    return await asyncFunction();
  } catch (error) {
    throw new Error(`Expected function to succeed, but it threw: ${error.message}`);
  }
};

/**
 * データベース操作のテストヘルパー
 * Updated to use TestEnvironment
 */
export const withDatabase = async (
  testFunction: (db: any) => Promise<void>
): Promise<void> => {
  // Use global test database from jest setup
  if (global.testDb) {
    await testFunction(global.testDb);
  } else {
    throw new Error('Test database not available. Ensure jest.setup.ts is loaded.');
  }
};

/**
 * テスト用タイムアウト処理
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
};

/**
 * テスト用ランダムID生成
 */
export const generateTestId = (prefix: string = 'test'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * テスト用日付生成
 */
export const createTestDate = (daysFromNow: number = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

/**
 * オブジェクトの深い比較
 * テストアサーション用
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

/**
 * 部分的オブジェクト比較
 * 指定されたキーのみを比較
 */
export const partialEqual = (
  actual: any,
  expected: any,
  keys: string[]
): boolean => {
  for (const key of keys) {
    if (actual[key] !== expected[key]) {
      return false;
    }
  }
  return true;
};

/**
 * テスト用キャンペーンIDバリデーション
 */
export const isValidCampaignId = (id: string): boolean => {
  return typeof id === 'string' && id.length > 0 && id.startsWith('test-');
};

/**
 * テスト用キャラクターIDバリデーション
 */
export const isValidCharacterId = (id: string): boolean => {
  return typeof id === 'string' && id.length > 0 && id.startsWith('test-character');
};

/**
 * テスト用セッションIDバリデーション
 */
export const isValidSessionId = (id: string): boolean => {
  return typeof id === 'string' && id.length > 0 && id.startsWith('test-session');
};

/**
 * APIレスポンスの構造検証
 */
export const validateApiResponse = (response: any): boolean => {
  return (
    typeof response === 'object' &&
    response !== null &&
    (response.data !== undefined || response.error !== undefined)
  );
};

/**
 * エラーレスポンスの構造検証
 */
export const validateErrorResponse = (response: any): boolean => {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof response.error === 'string' &&
    typeof response.message === 'string'
  );
};

/**
 * 成功レスポンスの構造検証
 */
export const validateSuccessResponse = (response: any): boolean => {
  return (
    typeof response === 'object' &&
    response !== null &&
    response.data !== undefined &&
    response.error === undefined
  );
};

/**
 * テスト用配列のシャッフル
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * テスト用ファイルパス作成
 */
export const createTestFilePath = (filename: string): string => {
  return `/tmp/test-${Date.now()}-${filename}`;
};

/**
 * テスト実行環境の検証
 */
export const isTestEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
};

/**
 * テスト用環境変数設定
 */
export const setTestEnvVar = (key: string, value: string): void => {
  const originalValue = process.env[key];
  process.env[key] = value;
  
  // テスト終了後に元の値に戻すためのクリーンアップ
  afterEach(() => {
    if (originalValue !== undefined) {
      process.env[key] = originalValue;
    } else {
      delete process.env[key];
    }
  });
};

/**
 * テスト用コンソール出力の抑制
 */
export const suppressConsole = (): { restore: () => void } => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  
  return {
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    }
  };
};

/**
 * Enhanced test data creation using production types
 */
export const createTestCampaign = (overrides: Partial<TRPGCampaign> = {}): TRPGCampaign => {
  return TestDataFactory.createTestCampaign(overrides);
};

export const createTestCharacter = (campaignId: string, overrides: Partial<TRPGCharacter> = {}): TRPGCharacter => {
  return TestDataFactory.createTestCharacter(campaignId, overrides);
};

export const createTestSession = (campaignId: string, overrides: Partial<TRPGSession> = {}): TRPGSession => {
  return TestDataFactory.createTestSession(campaignId, overrides);
};

/**
 * Enhanced validation functions
 */
export const validateCampaign = ValidationTestUtils.validateCampaign;
export const validateCharacter = ValidationTestUtils.validateCharacter;
export const validateAIResponse = ValidationTestUtils.validateAIResponse;

/**
 * Environment utilities
 */
export const setTestEnvironment = EnvironmentTestUtils.setTestEnv;
export const clearTestEnvironment = EnvironmentTestUtils.clearTestEnv;

/**
 * API Testing utilities
 */
export const createApiTest = (endpoint: string, method: string = 'GET') => {
  return {
    endpoint,
    method,
    withAuth: function(token: string) {
      return { ...this, headers: { Authorization: `Bearer ${token}` } };
    },
    withBody: function(body: any) {
      return { ...this, body };
    },
    withQuery: function(query: any) {
      return { ...this, query };
    }
  };
};