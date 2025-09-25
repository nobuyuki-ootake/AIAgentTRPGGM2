/**
 * Test Helpers - 共通テストユーティリティ
 * 
 * TRPGアプリケーション特有のテストヘルパー関数とユーティリティ
 */

import { vi, expect, MockedFunction } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==========================================
// API Mocking Utilities
// ==========================================

/**
 * APIレスポンスのモック作成ヘルパー
 */
export function createMockApiResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * APIエラーレスポンスのモック作成ヘルパー
 */
export function createMockApiError(message: string, status = 500, delay = 0): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message);
      (error as any).status = status;
      reject(error);
    }, delay);
  });
}

/**
 * fetch APIのモック設定ヘルパー
 */
export function mockFetchResponse(data: any, status = 200) {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  });
  
  (global as any).fetch = mockFetch;
  return mockFetch;
}

// ==========================================
// User Interaction Helpers
// ==========================================

/**
 * ユーザーイベントのセットアップ
 * 非同期操作のタイムアウトを適切に設定
 */
export function setupUserEvent() {
  return userEvent.setup({
    advanceTimers: vi.advanceTimersByTime,
    delay: null, // テストでは遅延を無効化
  });
}

/**
 * フォーム入力のヘルパー
 */
export async function fillForm(user: ReturnType<typeof setupUserEvent>, formData: Record<string, string>) {
  for (const [name, value] of Object.entries(formData)) {
    const input = document.querySelector(`input[name="${name}"], textarea[name="${name}"]`) as HTMLInputElement;
    if (input) {
      await user.clear(input);
      await user.type(input, value);
    }
  }
}

/**
 * ボタンクリックとローディング状態の確認
 */
export async function clickAndWaitForLoading(
  user: ReturnType<typeof setupUserEvent>,
  button: HTMLElement,
  loadingIndicator?: string
) {
  await user.click(button);
  
  if (loadingIndicator) {
    // ローディング表示を待つ
    await waitFor(() => {
      expect(document.querySelector(loadingIndicator)).toBeInTheDocument();
    });
    
    // ローディング完了を待つ
    await waitFor(() => {
      expect(document.querySelector(loadingIndicator)).not.toBeInTheDocument();
    }, { timeout: 10000 });
  }
}

// ==========================================
// Assertion Helpers
// ==========================================

/**
 * エラーメッセージの表示確認
 */
export async function expectErrorMessage(message: string, timeout = 5000) {
  await waitFor(() => {
    const errorElement = document.querySelector('[role="alert"], .error-message, .MuiAlert-message');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent(message);
  }, { timeout });
}

/**
 * 成功メッセージの表示確認
 */
export async function expectSuccessMessage(message: string, timeout = 5000) {
  await waitFor(() => {
    const successElement = document.querySelector('.success-message, .MuiAlert-message');
    expect(successElement).toBeInTheDocument();
    expect(successElement).toHaveTextContent(message);
  }, { timeout });
}

/**
 * ローディング状態の確認
 */
export function expectLoadingState(isLoading: boolean) {
  const loadingElements = document.querySelectorAll(
    '.loading, .MuiCircularProgress-root, [data-testid="loading"]'
  );
  
  if (isLoading) {
    expect(loadingElements.length).toBeGreaterThan(0);
  } else {
    expect(loadingElements.length).toBe(0);
  }
}

/**
 * データテーブルの内容確認
 */
export function expectTableToContainData(data: string[]) {
  const table = document.querySelector('table, .data-grid');
  expect(table).toBeInTheDocument();
  
  data.forEach(text => {
    expect(table).toHaveTextContent(text);
  });
}

// ==========================================
// Timer & Async Utilities
// ==========================================

/**
 * タイマーのモック設定
 */
export function setupTimers() {
  vi.useFakeTimers();
  return {
    advanceTime: (ms: number) => vi.advanceTimersByTime(ms),
    cleanup: () => vi.useRealTimers(),
  };
}

/**
 * 非同期処理の完了を待つ
 */
export async function waitForAsyncOperations(timeout = 5000) {
  await waitFor(() => {
    // pending Promiseがないことを確認
    expect(Promise.resolve()).resolves.toBeUndefined();
  }, { timeout });
}

/**
 * デバウンス処理のテストヘルパー
 */
export async function testDebounce(
  callback: () => void,
  delay: number,
  timers: ReturnType<typeof setupTimers>
) {
  // 複数回呼び出し
  callback();
  callback();
  callback();
  
  // デバウンス期間内では実行されない
  timers.advanceTime(delay - 1);
  
  // デバウンス期間後に実行される
  timers.advanceTime(1);
  await vi.runAllTimersAsync();
}

// ==========================================
// TRPG-specific Test Helpers
// ==========================================

/**
 * ダイスロールのシミュレーション
 */
export function simulateDiceRoll(sides: number, count = 1): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

/**
 * キャラクターステータスの確認
 */
export function expectCharacterStatus(characterName: string, expectedHp: number, expectedAc: number) {
  const characterCard = document.querySelector(`[data-testid="character-${characterName}"]`);
  expect(characterCard).toBeInTheDocument();
  expect(characterCard).toHaveTextContent(`HP: ${expectedHp}`);
  expect(characterCard).toHaveTextContent(`AC: ${expectedAc}`);
}

/**
 * チャットメッセージの確認
 */
export function expectChatMessage(message: string, sender?: string) {
  const chatArea = document.querySelector('[data-testid="chat-messages"]');
  expect(chatArea).toBeInTheDocument();
  expect(chatArea).toHaveTextContent(message);
  
  if (sender) {
    expect(chatArea).toHaveTextContent(sender);
  }
}

/**
 * セッション状態の確認
 */
export function expectSessionState(expectedState: 'active' | 'paused' | 'ended') {
  const sessionIndicator = document.querySelector('[data-testid="session-status"]');
  expect(sessionIndicator).toBeInTheDocument();
  expect(sessionIndicator).toHaveAttribute('data-status', expectedState);
}

// ==========================================
// Cleanup Utilities
// ==========================================

/**
 * テスト後のクリーンアップ
 */
export function cleanupAfterTest() {
  // localStorage/sessionStorage をクリア
  localStorage.clear();
  sessionStorage.clear();
  
  // モックをクリア
  vi.clearAllMocks();
  
  // タイマーをリアルタイムに戻す
  vi.useRealTimers();
  
  // DOMの状態をリセット
  document.body.innerHTML = '';
}

/**
 * テストスイート用の包括的なセットアップ/クリーンアップ
 */
export function setupTestSuite() {
  return {
    user: setupUserEvent(),
    timers: setupTimers(),
    cleanup: cleanupAfterTest,
  };
}

// ==========================================
// Console Utilities
// ==========================================

/**
 * コンソールエラーの抑制（既知のエラーをテスト中に非表示にする）
 */
export function suppressConsoleError(patterns: (string | RegExp)[]) {
  const originalError = console.error;
  
  console.error = vi.fn((...args) => {
    const message = args.join(' ');
    const shouldSuppress = patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return message.includes(pattern);
      }
      return pattern.test(message);
    });
    
    if (!shouldSuppress) {
      originalError(...args);
    }
  });
  
  return () => {
    console.error = originalError;
  };
}

/**
 * デバッグ用のDOM状態出力
 */
export function debugDOM() {
  console.log('=== DOM Debug ===');
  console.log(document.body.innerHTML);
  console.log('=== End DOM Debug ===');
}

/**
 * デバッグ用のRecoil状態出力（開発中のみ）
 */
export function debugRecoilState() {
  // 開発環境でのみデバッグ情報を出力
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Recoil State Debug ===');
    // Recoil DevToolsが利用可能な場合の状態出力
    console.log('Use Recoil DevTools for state inspection');
    console.log('=== End Recoil State Debug ===');
  }
}