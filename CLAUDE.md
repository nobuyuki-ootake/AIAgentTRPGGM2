# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered TRPG (Tabletop Role-Playing Game) campaign management and game master assistance tool built as a monorepo using pnpm workspaces. The project helps game masters create and run TRPG campaigns with integrated AI assistance for character generation, scenario planning, and session management.

## 🚀 Getting Started - Implementation Rules for New Development

### Phase 1: Project Understanding and Setup
1. **Read Documentation First**
   - Study `docs/プロジェクト概要/readme.md` for complete project overview
   - Review `docs/プロジェクト概要/要件定義.md` for comprehensive requirements
   - Understand all `docs/rules/` for development guidelines
   - Check `docs/機能要件定義/` and `docs/非機能要件定義/` for detailed specifications

2. **Environment Setup**
   - Clone repository and install dependencies with `pnpm install`
   - **NEVER use direct docker compose or pnpm run dev commands**
   - **ALWAYS use `./start-dev.sh` scripts to prevent PC overload**
   - Verify TypeScript configuration and shared types in `packages/types/`

3. **Code Quality Setup**
   - Enable TypeScript strict mode checks
   - Configure ESLint and Prettier according to project standards
   - Set up pre-commit hooks for quality gates
   - Verify test environment with `pnpm test:e2e`

### Phase 2: Implementation Priority Order
When implementing from scratch, follow this priority:

1. **Core Type Definitions** (`packages/types/index.ts`)
   - Implement all TRPG entity types (TRPGCampaign, TRPGCharacter, etc.)
   - Ensure cross-platform compatibility (frontend/backend)
   - **NEVER create test-specific types - use production types for tests**

2. **Backend Foundation** (`apps/proxy-server/`)
   - Set up Express.js with TypeScript
   - Implement Litestream database integration
   - Create AI provider abstraction layer
   - Add comprehensive error handling (NO silent failures)

3. **Frontend Foundation** (`apps/frontend/`)
   - Set up React 18 with Material UI
   - Configure Recoil for state management
   - Implement responsive layout structure
   - Add AI chat panel integration

4. **AI Integration** 
   - Multi-provider support (OpenAI, Anthropic, Google)
   - Secure API key management (localStorage only, NEVER expose in frontend)
   - Context management and prompt optimization
   - Error handling with user-actionable feedback

5. **Core Features Implementation**
   - Home page (campaign management)
   - Campaign setup wizard
   - Character management (PC/NPC/Enemy)
   - Timeline and event management
   - TRPG session interface

### Phase 3: Quality Assurance and Testing
1. **TDD Implementation**
   - Write tests for core logic BEFORE implementation
   - Use real production types for all test data
   - Achieve 80%+ code coverage
   - Add `data-testid` to all interactive components

2. **UI/UX Verification**
   - Use browsermcp for visual verification
   - Take before/after screenshots for all changes
   - Verify intended behavior visually
   - Test on multiple screen sizes and devices

3. **Performance Optimization**
   - Monitor bundle size and loading times
   - Optimize AI request patterns
   - Implement proper caching strategies
   - Verify memory usage stays within limits

## 🔧 Build and Development Commands

### Root Level Commands

```bash
# Development - 統一された安全起動スクリプト
# 🔒 多重起動防止機能付き - 必ずこのスクリプトを使用してください

./start-dev.sh                       # ローカル開発環境
./start-dev.sh --docker              # Docker開発環境
./start-dev.sh --docker --build      # Dockerビルド付き起動
./start-dev.sh --docker --clean      # Dockerキャッシュクリア付き起動

# ⚠️ 重要: docker composeやpnpm run devは直接実行しないでください
# PC負荷100%によるハングを防ぐため、必ずstart-dev.shを使用してください

# Build
pnpm build                 # Build all packages (using Turbo)
pnpm build:frontend       # Build only frontend
pnpm build:proxy         # Build only proxy server

# Testing
pnpm test:e2e             # Run Playwright E2E tests
pnpm test:e2e:ui          # Run Playwright tests with UI mode
pnpm test:trpg-session    # Run TRPG session functionality tests
pnpm test:ai-enhanced     # Run AI-enhanced feature tests

# Linting
pnpm lint                 # Lint all packages (using Turbo)

# Storybook
pnpm storybook           # Run Storybook development server
pnpm build-storybook     # Build Storybook static files
```

### Running a Single Test

```bash
# Run specific test file
cd apps/frontend
pnpm playwright test e2e/pages/trpg-session-page.spec.ts

# Run test with specific test name
pnpm playwright test -g "should create new campaign"

# Run test in headed mode (with browser UI)
pnpm playwright test --headed

# Run test with debugging
pnpm playwright test --debug
```

## 🏗️ High-Level Architecture

### Monorepo Structure

- **apps/frontend**: React 18 SPA with Material UI
  - State management: Recoil
  - Routing: React Router v7
  - Rich text editor: Slate.js for session notes
  - TRPG UI: Dice rolling, character sheets, session interface
  - Build tool: Vite
- **apps/proxy-server**: Express.js API server
  - AI integrations: OpenAI, Anthropic (Claude), Google (Gemini)
  - Framework: Express with TypeScript
  - Image storage: Google Cloud Storage
  - Database: Litestream
  - AI Agent framework: Mastra
- **packages/types**: Shared TypeScript type definitions for TRPG entities

### Key Architectural Patterns

1. **AI Integration Architecture**
   - Frontend makes requests to proxy server at `/api/ai-agent/*`
   - Proxy server handles API key management and provider selection
   - Multiple AI providers supported with unified interface
   - Context accumulation through "selected elements" pattern

2. **State Management Flow**
   - Global state in Recoil atoms (currentCampaignAtom, sessionStateAtom, etc.)
   - Local component state for UI interactions
   - Litestream database for campaign persistence
   - Cloud Storage for character images and base illustrations

3. **Screen Navigation Pattern**
   - Campaign creation flow: Home → Campaign Setup → Characters (PC/NPC) → World Building → Session Planning → TRPG Session
   - Developer mode toggle controls UI complexity
   - Each screen builds upon campaign context for AI assistance

4. **TRPG Session Interface Architecture**
   - Main session view with character display, chat interface, and interaction panels
   - Integrated dice rolling, skill checks, and power check mini-games
   - Real-time session state management
   - AI-driven game master assistance and NPC behavior

## 🎯 Implementation Guidelines

### AI Provider Configuration
- API keys stored in localStorage per provider
- Provider selection in AI Settings tab
- Test endpoint available at `/api/ai-agent/test-key`
- Custom endpoint support for self-hosted models

### Error Handling Patterns
- AI requests wrapped in try-catch with user-friendly error messages
- Loading states managed through Recoil atoms
- Snackbar notifications for user feedback
- Comprehensive error logging in proxy server

### Testing Strategy
- E2E tests using Playwright for critical TRPG workflows
- Screenshot-based visual regression tests
- AI-enhanced test scenarios for character generation and session management
- Session functionality tests for TRPG mechanics

### Deployment Configurations
- **Google Cloud Run**: Primary deployment platform
- **Google Cloud Storage**: Image and asset storage
- **Litestream**: Database with automated backups
- **Docker Compose**: Local development with Redis and Cloud Storage emulation

## 🛠️ Implementation Workflows

### When implementing new AI features:

1. **Backend First**
   - Add endpoint to `apps/proxy-server/src/routes/aiAgent.ts`
   - Implement secure API key handling
   - Add proper error handling (NO silent failures)
   - Test with multiple AI providers

2. **Frontend Integration**
   - Add corresponding function to `apps/frontend/src/api/aiAgent.ts`
   - Create or update React hook for the feature
   - Integrate with AIChatPanel assist tab if applicable
   - Add loading states and error handling

3. **Quality Assurance**
   - Write tests using production types
   - Add `data-testid` for testing
   - Verify with browsermcp screenshots
   - Document in appropriate `/docs/` folder

### When adding new TRPG screens:

1. **Planning and Design**
   - Review requirements in `docs/機能要件定義/`
   - Design component hierarchy following single responsibility
   - Plan state management approach

2. **Implementation**
   - Create page component in `apps/frontend/src/pages/`
   - Add route in `App.tsx`
   - Create context provider if needed
   - Add navigation item to sidebar (consider developer mode visibility)

3. **Integration and Enhancement**
   - Implement AI assistance integration
   - Add appropriate TRPG-specific UI components (dice, character sheets, etc.)
   - Ensure responsive design
   - Add comprehensive testing

4. **Documentation and Verification**
   - Document in `/docs/` folder
   - Update README if needed
   - Verify with visual testing
   - Ensure accessibility compliance

### When working with shared types:

1. **Type Definition Priority**
   - All shared types go in `packages/types/index.ts`
   - **NEVER create local type variants or "compatible" types**
   - Update all consuming code when types change

2. **Test Data Creation**
   - **ALWAYS use production types for test data**
   - Create test data files with `.ts` extension
   - Store test data files for error tracing
   - **NO test-specific type definitions allowed**

3. **Type Safety Enforcement**
   - Avoid `any` type usage
   - Use TypeScript strict mode
   - Fix type errors properly, don't bypass them

## 📁 Critical Files to Understand

### Core Architecture
- `apps/frontend/src/components/ai/AIChatPanel.tsx`: Core AI interaction component with developer mode toggle
- `apps/frontend/src/hooks/useAIChatIntegration.ts`: AI chat state management
- `apps/proxy-server/src/utils/systemPrompts.ts`: TRPG-specific AI persona definitions

### TRPG-Specific Components
- `apps/frontend/src/pages/TRPGSessionPage.tsx`: Main session interface
- `apps/frontend/src/components/trpg-session/SessionInterface.tsx`: Core session UI
- `apps/frontend/src/components/trpg-session/DiceRollUI.tsx`: Dice rolling mechanics
- `apps/frontend/src/components/characters/CharacterForm.tsx`: TRPG character sheet management

### Data Models
- `packages/types/index.ts`: TRPG entity type definitions (TRPGCampaign, TRPGCharacter, etc.)
- `apps/frontend/src/store/atoms.ts`: Campaign and session state management

### Key Architectural Changes from Novel Tool
- Campaign-focused instead of novel-focused data structures
- PC/NPC character distinction with full character sheets
- Session-based timeline instead of chronological narrative
- Developer mode UI visibility controls
- Real-time session state management for live play

## 🔒 Security and Quality Standards

### Security Requirements
- **API キーをフロントに開示するような実装は"セキュリティ上重大なインシデント"です**
- Store API keys only in localStorage, never in code
- Use HTTPS for all communications
- Implement proper input validation and sanitization
- Follow OWASP security guidelines

### Code Quality Standards
- **フォールバック機能、特に try{}catch{}の構文で、エラーを返さずに一時的なメッセージをフロントに返す仕様は「ガチでクソ」実装です**
- Always provide actionable error messages to users
- No silent error handling - users must be able to resolve issues
- Write honest, transparent implementations
- Remove unused code and components actively

### Testing Standards
- **「テストは、正常な動作で UI の動作チェックを行う」のが大事です**
- Never force-click disabled buttons or use normally inaccessible elements
- Always test with real user workflows
- Take before/after screenshots for UI changes
- Use production data types for all tests

## 📋 Development Rules (Must Follow)

### 最重要ルール (Most Important Rules)

- **"""テストデータ用の型定義は絶対にしないでください。"""**
- **"""テストデータは、本番と同じ型を使って作成してください。「有効なテストデータ=本番で使う型定義と一致した構造のデータ」です。"""**
- **テストデータとプロジェクト共通型が異なる場合、"""修正するべきはテストデータ"""です**

### 型安全性ルール (Type Safety Rules)

- プロジェクト共通型は `packages/types/index.ts` を参照
- フロントエンド・バックエンド共通型を修正する場合、使用箇所も同時修正
- ローカルでヘルパー関数を作って型変換するのではなく、適切に型運用を修正
- any 型の使用を避け、TypeScript の型システムの恩恵を受ける

### 開発フローの必須事項

- このプロジェクトはバイブコーディングを学ぶための学習プロジェクト
- 文書と会話は日本語で行う
- コアロジックは TDD で実装
- UI は TDD 不要だが、リアルタイムで画面確認
- 変更後 UI チェックは browsermcp で意図確認
- **視覚的検証必須**: 動作前後のスクリーンショット確認

### コミット前の必須作業

1. **ドキュメント更新**: `docs/chat.md` と `docs/tasks.md` ファイル更新
2. **チュートリアル**: `docs/tutorial.md` にプロンプトと変更内容をチュートリアル形式で整理（目的も記載）
3. **品質チェック**: lint および typecheck 実行
4. **README 更新**: 新ドキュメント追加時はリンクと説明を追加

### UI とコンポーネント設計

- UI とロジックの分離を行い、適切なソースコードの長さを保つ
- コンポーネント単一責任の原則に従い適切な粒度でコンポーネント作成
- 800 行程度を目安にファイル分割を検討
- `data-testid` を積極的に設定し、テスト時に優先使用

### エラーハンドリングとユーザー体験

- フォールバック実装を避け、ユーザー解消可能エラーの提示
- proxy-server でのフォールバックは厳禁
- リトライまたはエラー解消ヒント含むエラー表示（API キー開示は除く）
- 常に「誠実な」実装者であること

### テストとデバッグ

- テスト用ドキュメント `docs/TRPG_SESSION_TEST_GUIDE.md` を参照
- テスト実行時はブラウザコンソール情報を取得・解析
- UIテスト時は docker の開発サーバーを使用
- 同じ失敗を繰り返さないためのナレッジ蓄積

### プロジェクト特性

- 未使用・目的不明な機能やコンポーネントは積極削除
- 後方互換機能は不要（TRPG AI agent として単体動作）
- 改善提案を積極的に行う
- 同じミス防止のための提案歓迎

## 🎓 Learning Project Guidelines

このプロジェクトは **バイブコーディング学習** のための教育的プロジェクトです：

### 学習目標
- **TDD**: コアロジックのテスト駆動開発
- **型安全性**: TypeScript の効果的活用
- **リアルタイム確認**: UI の継続的視覚確認
- **ドキュメント重視**: 変更内容の詳細記録
- **品質向上**: 継続的な改善と学習

### 開発アプローチ
- 正常動作での UI 動作チェックを重視
- 押下不可ボタンの強制押下等の非正常手段は禁止
- 常にユーザー使用データでテスト実行
- エラー隠蔽ではなく解決可能な状況提供

### 継続改善
- 同じミスの再発防止策検討
- プロセス改善の積極提案
- ナレッジ共有と文書化
- 品質向上のための継続学習

---

This project represents a comprehensive approach to building modern, AI-integrated TRPG tools with emphasis on code quality, user experience, and maintainable architecture. Follow these guidelines to ensure consistent, high-quality development that serves both the learning objectives and the practical needs of TRPG game masters.