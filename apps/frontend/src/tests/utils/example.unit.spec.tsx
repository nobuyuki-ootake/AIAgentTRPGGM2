/**
 * Example Unit Test - Testing Infrastructure Demo
 * 
 * このファイルは設定したテストインフラの使用例を示します。
 * t-WADA naming conventions に従い、*.unit.spec.tsx として命名
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { 
  renderWithProviders, 
  renderWithRecoil,
  createTestCampaign, 
  createTestCharacter, 
  setupUserEvent,
  expectLoadingState,
  cleanupAfterTest 
} from './index';
import { currentCampaignAtom, charactersAtom } from '@/store/atoms';

// シンプルなテストコンポーネント
const TestComponent: React.FC = () => {
  return (
    <div data-testid="test-component">
      <h1>Test Component</h1>
      <button data-testid="test-button">Click me</button>
    </div>
  );
};

// Recoil状態を使用するテストコンポーネント
const RecoilTestComponent: React.FC = () => {
  // 実際のコンポーネントではuseRecoilValueなどを使用
  return (
    <div data-testid="recoil-test-component">
      <h1>Recoil Test Component</h1>
    </div>
  );
};

describe('Testing Infrastructure Examples', () => {
  let user: ReturnType<typeof setupUserEvent>;

  beforeEach(() => {
    user = setupUserEvent();
  });

  afterEach(() => {
    cleanupAfterTest();
  });

  describe('Basic Component Rendering', () => {
    it('should render component with full providers', () => {
      const { getByTestId } = renderWithProviders(<TestComponent />);
      
      expect(getByTestId('test-component')).toBeInTheDocument();
      expect(getByTestId('test-button')).toBeInTheDocument();
    });

    it('should handle user interactions', async () => {
      const { getByTestId } = renderWithProviders(<TestComponent />);
      const button = getByTestId('test-button');
      
      await user.click(button);
      
      // ボタンがクリック可能であることを確認
      expect(button).toBeEnabled();
    });
  });

  describe('Recoil State Management', () => {
    it('should render with initial Recoil state', () => {
      const testCampaign = createTestCampaign();
      const testCharacter = createTestCharacter();

      const { getByTestId } = renderWithRecoil(
        <RecoilTestComponent />,
        {
          recoilState: [
            { recoilState: currentCampaignAtom, initialValue: testCampaign },
            { recoilState: charactersAtom, initialValue: [testCharacter] }
          ]
        }
      );

      expect(getByTestId('recoil-test-component')).toBeInTheDocument();
    });
  });

  describe('Test Data Factories', () => {
    it('should create valid campaign data using production types', () => {
      const campaign = createTestCampaign();
      
      // 本番型との互換性確認
      expect(campaign).toHaveProperty('id');
      expect(campaign).toHaveProperty('title');
      expect(campaign).toHaveProperty('gameSystem');
      expect(campaign.status).toBe('active');
      expect(campaign.playerIds).toHaveLength(2);
    });

    it('should create valid character data using production types', () => {
      const character = createTestCharacter();
      
      // 本番型との互換性確認
      expect(character).toHaveProperty('id');
      expect(character).toHaveProperty('name');
      expect(character).toHaveProperty('type');
      expect(character.stats).toHaveProperty('strength');
      expect(character.stats).toHaveProperty('dexterity');
      expect(character.level).toBe(1);
      expect(character.hitPoints).toBe(10);
    });

    it('should allow override of factory defaults', () => {
      const customCampaign = createTestCampaign({
        title: 'カスタムキャンペーン',
        status: 'draft'
      });
      
      expect(customCampaign.title).toBe('カスタムキャンペーン');
      expect(customCampaign.status).toBe('draft');
      // その他のプロパティはデフォルト値を保持
      expect(customCampaign.gameSystem).toBe('D&D 5e');
    });
  });

  describe('Async Operations and Loading States', () => {
    it('should handle loading states correctly', async () => {
      // ローディング状態のテスト例
      const { rerender } = renderWithProviders(<TestComponent />);
      
      // 初期状態：ローディングなし
      expectLoadingState(false);
      
      // ローディング要素を追加
      rerender(
        <div>
          <TestComponent />
          <div className="loading" data-testid="loading">Loading...</div>
        </div>
      );
      
      expectLoadingState(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle and display errors appropriately', () => {
      // エラーハンドリングのテスト例
      const ErrorComponent: React.FC = () => {
        return (
          <div role="alert" data-testid="error-message">
            エラーが発生しました
          </div>
        );
      };

      const { getByRole, getByTestId } = renderWithProviders(<ErrorComponent />);
      
      expect(getByRole('alert')).toBeInTheDocument();
      expect(getByTestId('error-message')).toHaveTextContent('エラーが発生しました');
    });
  });

  describe('API Mocking Examples', () => {
    it('should mock fetch responses', async () => {
      const mockData = { message: 'Success' };
      
      // fetchのモック
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockData),
      });

      const response = await fetch('/api/test');
      const data = await response.json();
      
      expect(data).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/test');
    });
  });
});

describe('Performance and Accessibility', () => {
  it('should have proper ARIA labels and test IDs', () => {
    const { getByTestId } = renderWithProviders(<TestComponent />);
    
    // data-testid の設定確認
    expect(getByTestId('test-component')).toBeInTheDocument();
    expect(getByTestId('test-button')).toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const user = setupUserEvent();
    const { getByTestId } = renderWithProviders(<TestComponent />);
    const button = getByTestId('test-button');
    
    // フォーカス確認
    button.focus();
    expect(button).toHaveFocus();
    
    // キーボード操作
    await user.keyboard('{Enter}');
    // 実際のアプリケーションでは適切なキーボード操作の結果を確認
  });
});