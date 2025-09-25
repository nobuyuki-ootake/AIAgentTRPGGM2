# t-WADA式テスト命名規則

このドキュメントは、AIAgentTRPGGMプロジェクトにおけるt-WADA式テスト駆動開発（TDD）のファイル命名規則を定義します。
和田卓人氏が提唱するテスト手法に基づき、保守性と可読性の高いテスト構造を実現します。

## 前提条件

- このドキュメントは[testing-rules.md](./testing-rules.md)と併せて使用されます
- テストの実装方針については[testing-rules.md](./testing-rules.md)を参照してください
- 本ドキュメントは命名規則とファイル構造に特化しています

## ファイル命名規則

### テストファイルの基本命名規則

```
{対象ファイル名}.{テスト種別}.{spec|test}.{拡張子}
```

#### 例

```
// ユニットテスト
CharacterForm.unit.spec.tsx
aiGameMasterService.unit.test.ts

// 統合テスト
TRPGSessionPage.integration.spec.tsx
campaignService.integration.test.ts

// E2Eテスト
campaign-creation.e2e.spec.ts
trpg-session-flow.e2e.spec.ts
```

### テスト種別の定義

| 種別 | 略称 | 説明 | 配置場所 |
|------|------|------|----------|
| ユニットテスト | unit | 単一の関数/クラス/コンポーネントのテスト | 対象ファイルと同じディレクトリ |
| 統合テスト | integration | 複数のモジュール間の連携テスト | `__tests__/integration/` |
| E2Eテスト | e2e | エンドツーエンドのシナリオテスト | `e2e/` または `__tests__/e2e/` |

## ディレクトリ構造

### 推奨構造

```
apps/frontend/
├── src/
│   ├── components/
│   │   ├── characters/
│   │   │   ├── CharacterForm.tsx
│   │   │   └── CharacterForm.unit.spec.tsx  # 同一ディレクトリ配置
│   │   └── trpg-session/
│   │       ├── SessionInterface.tsx
│   │       └── SessionInterface.unit.spec.tsx
│   ├── hooks/
│   │   ├── useSession.ts
│   │   └── useSession.unit.test.ts
│   └── __tests__/
│       └── integration/
│           ├── character-creation.integration.spec.tsx
│           └── session-flow.integration.spec.tsx
├── e2e/
│   ├── pages/
│   │   └── trpg-session-page.e2e.spec.ts
│   └── scenarios/
│       └── campaign-creation.e2e.spec.ts
└── test-data/                          # テストデータ専用ディレクトリ
    ├── campaigns/
    │   └── mockCampaign.ts
    └── characters/
        └── mockCharacters.ts

apps/proxy-server/
├── src/
│   ├── services/
│   │   ├── aiGameMasterService.ts
│   │   └── aiGameMasterService.unit.test.ts
│   └── routes/
│       ├── aiAgent.ts
│       └── aiAgent.unit.test.ts
└── src/tests/                          # 統合・E2Eテスト
    ├── integration/
    │   └── ai-service.integration.test.ts
    └── e2e/
        └── api-flow.e2e.test.ts
```

## テストケースの命名規則

### describe/itの構造

```typescript
// t-WADA式の「何を」「どのような条件で」「どうなるか」を明確化
describe('対象名（クラス/関数/コンポーネント名）', () => {
  describe('メソッド名または機能名', () => {
    describe('前提条件（given/when）', () => {
      it('期待される結果（then）', () => {
        // Arrange（準備）
        // Act（実行）
        // Assert（検証）
      });
    });
  });
});
```

### 実装例

```typescript
// CharacterForm.unit.spec.tsx
describe('CharacterForm', () => {
  describe('onSubmit', () => {
    describe('必須項目が全て入力されている場合', () => {
      it('キャラクターデータが正しく送信される', async () => {
        // Arrange
        const mockOnSubmit = jest.fn();
        const { getByTestId } = render(
          <CharacterForm onSubmit={mockOnSubmit} />
        );
        
        // Act
        fireEvent.change(getByTestId('character-name'), {
          target: { value: 'テストキャラクター' }
        });
        fireEvent.click(getByTestId('submit-button'));
        
        // Assert
        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'テストキャラクター'
            })
          );
        });
      });
    });
    
    describe('必須項目が未入力の場合', () => {
      it('エラーメッセージが表示される', () => {
        // テスト実装
      });
    });
  });
});
```

## テストデータファイルの命名規則

### 基本規則

```
mock{エンティティ名}.ts
fixture{エンティティ名}.ts
stub{エンティティ名}.ts
```

### 用途別の使い分け

| 種類 | 接頭辞 | 用途 | 例 |
|------|--------|------|-----|
| モックデータ | mock | テスト用の完全なダミーデータ | mockCampaign.ts |
| フィクスチャ | fixture | 実際のデータに近い固定データ | fixtureCampaignList.ts |
| スタブ | stub | 最小限の代替実装 | stubAIService.ts |

### テストデータファイルの実装例

```typescript
// test-data/campaigns/mockCampaign.ts
import { TRPGCampaign } from '@/packages/types';

// 本番と同じ型を使用（最重要ルール）
export const mockCampaign: TRPGCampaign = {
  id: 'test-campaign-001',
  title: 'テストキャンペーン',
  description: 'これはテスト用のキャンペーンです',
  gameSystem: 'D&D5e',
  // ... 他の必須フィールド
};

// 複数パターンの準備
export const mockCampaignWithCharacters: TRPGCampaign = {
  ...mockCampaign,
  characters: [
    // キャラクターデータ
  ]
};
```

## 重複防止のためのルール

### 1. 命名の一意性確保

- 同一機能に対して複数のテストファイルを作成しない
- ファイル名には必ずテスト種別（unit/integration/e2e）を含める
- 曖昧な名前（test.ts、spec.ts単体）は使用禁止

### 2. テストの配置ルール

- ユニットテストは対象ファイルと同じディレクトリに配置
- 統合テストは専用の`__tests__/integration/`ディレクトリに配置
- E2Eテストは`e2e/`ディレクトリに配置
- テストデータは`test-data/`ディレクトリに集約

### 3. インポートパスの管理

```typescript
// ✅ 良い例：相対パスで明確
import { CharacterForm } from './CharacterForm';
import { mockCharacter } from '../../test-data/characters/mockCharacter';

// ❌ 悪い例：エイリアスが曖昧
import { CharacterForm } from '@/components/CharacterForm';
import { mockCharacter } from '@/test/data/character';
```

## CI/CD連携の考慮事項

### テスト実行順序

```json
// package.jsonのスクリプト例
{
  "scripts": {
    "test:unit": "jest --testMatch='**/*.unit.{spec,test}.{ts,tsx}'",
    "test:integration": "jest --testMatch='**/*.integration.{spec,test}.{ts,tsx}'",
    "test:e2e": "playwright test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### ファイル名パターンによる自動実行

- CI/CDツールでファイル名パターンに基づいて適切なテストスイートを実行
- PRごとに関連するテストのみを実行する最適化が可能

## まとめ

t-WADA式の命名規則を採用することで：

1. **テストの意図が明確**になる
2. **重複実装を防止**できる
3. **保守性が向上**する
4. **チーム内での一貫性**が保たれる

これらの規則は、[testing-rules.md](./testing-rules.md)で定義されている実装方針と組み合わせて使用してください。