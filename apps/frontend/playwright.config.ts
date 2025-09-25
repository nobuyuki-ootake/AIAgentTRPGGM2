import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定 - AIドリブンTRPGアプリケーション用
 * 
 * 重要な設計方針：
 * - Dockerの開発サーバーを使用（start-dev.sh --docker）
 * - 正常な動作でのUI動作チェックを重視
 * - 押下不可ボタンの強制押下等は禁止
 * - テストデータは本番と同じ型定義を使用
 */
export default defineConfig({
  testDir: './e2e',
  
  /* 並列実行を制限（AI API呼び出し負荷を考慮） */
  fullyParallel: false,
  workers: 1,
  
  /* CI環境での失敗時リトライ */
  retries: process.env.CI ? 2 : 0,
  
  /* レポート設定 */
  reporter: [
    ['html'],
    ['line'],
    ['json', { outputFile: 'test-results.json' }]
  ],

  /* スクリーンショット・動画録画設定 */
  use: {
    /* ベースURL - Dockerの開発サーバー */
    baseURL: 'http://localhost:3000',

    /* スクリーンショット（失敗時＋終了時） */
    screenshot: 'only-on-failure',
    
    /* 動画録画（失敗時のみ） */
    video: 'retain-on-failure',
    
    /* トレース（失敗時のみ） */
    trace: 'retain-on-failure',

    /* タイムアウト設定（AI処理を考慮して長めに設定） */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* グローバルタイムアウト設定 */
  timeout: 60000, // 1分（AI API呼び出しを考慮）
  expect: {
    timeout: 10000 // アサーション用タイムアウト
  },

  /* テスト実行前のセットアップ */
  globalSetup: './e2e/setup/global-setup.ts',
  globalTeardown: './e2e/setup/global-teardown.ts',

  /* プロジェクト設定 */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    /* Critical Priority Tests - 基本機能（常時実行） */
    {
      name: 'critical',
      testMatch: /.*\/(core|pages)\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },

    /* AI Integration Tests - AI機能（長時間実行を考慮） */
    {
      name: 'ai-integration',
      testMatch: /.*\/ai-integration\/.*\.e2e\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
      timeout: 120000, // AI処理のため2分に延長
    },

    /* WebSocket Tests - リアルタイム機能 */
    {
      name: 'websocket',
      testMatch: /.*\/websocket\/.*\.e2e\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
      timeout: 90000, // WebSocket接続テストのため1.5分
    },

    /* Error Handling Tests - エラー処理 */
    {
      name: 'error-handling',
      testMatch: /.*\/error-handling\/.*\.e2e\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },

    /* Feature Tests - その他機能テスト */
    {
      name: 'features',
      testMatch: /.*\/features\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },

    /* Cross-browser Tests - クロスブラウザ検証（重要なテストのみ） */
    {
      name: 'firefox-critical',
      testMatch: /.*\/(core|pages)\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit-critical',
      testMatch: /.*\/(core|pages)\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },

    /* Mobile Tests - モバイル対応確認 */
    {
      name: 'mobile-chrome',
      testMatch: /.*\/(core|pages)\/.*\.spec\.ts$/,
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },

    {
      name: 'mobile-safari',
      testMatch: /.*\/(core|pages)\/.*\.spec\.ts$/,
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
  ],

  /* 開発サーバー設定 */
  webServer: {
    command: '../../start-dev.sh --docker',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2分（Docker起動を考慮）
    stdout: 'pipe',
    stderr: 'pipe',
  },
});