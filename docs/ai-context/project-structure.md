# AI Agent TRPG GM Project Structure

This document provides the complete technology stack and file tree structure for the AI-powered TRPG campaign management and game master assistance tool. **AI agents MUST read this file to understand the project organization before making any changes.**

## Technology Stack

### Monorepo Architecture
- **pnpm 8.6.2** - Package manager with workspaces for monorepo management
- **Turbo 1.10.12** - Build orchestration and caching for monorepo
- **TypeScript 5.0.0+** - Shared type system across all packages

### Backend Technologies (apps/proxy-server)
- **Node.js 18.0.0+** with **pnpm** - JavaScript runtime and package management
- **Express.js 4.18.0+** - Web framework with middleware ecosystem
- **TypeScript 5.0.0+** - Type safety and modern JavaScript features
- **SQLite3/better-sqlite3 11.10.0+** - Local database with Litestream backup support
- **nodemon 2.0.22+** with **ts-node 10.9.0+** - Development server with hot reload

### AI Services & Integrations
- **OpenAI SDK 4.0.0+** - GPT models integration
- **Anthropic SDK 0.20.0+** - Claude models integration
- **Google Generative AI 0.11.0+** - Gemini models integration
- **Mastra 0.10.7+** with libsql/memory** - AI agent framework for TRPG behaviors
- **ai SDK 4.3.16+** - Unified AI provider interface

### Frontend Technologies (apps/frontend)
- **React 18.2.0+** - UI library with hooks and concurrent features
- **Material UI 5.14.0+** - Component library for TRPG interface
- **Vite 4.3.0+** - Fast build tool and development server
- **Recoil 0.7.7** - State management for campaign and session state
- **React Router DOM 6.14.0+** - Client-side routing
- **Slate.js 0.94.1+** - Rich text editor for session notes
- **React Beautiful DnD 13.1.1** - Drag and drop for character organization

### Real-time Communication
- **Socket.io 4.8.1** - WebSocket communication for real-time session updates
- **axios 1.4.0+** - HTTP client for API communication
- **socket.io-client 4.8.1** - Frontend WebSocket client

### Development & Quality Tools
- **ESLint 8.37.0+** - Code quality and linting
- **@typescript-eslint 5.57.0+** - TypeScript-specific linting rules
- **Playwright 1.36.0+** - E2E testing framework
- **Jest 29.5.0+** - Unit testing framework (backend)
- **Storybook 7.1.0+** - Component development and documentation
- **Docker & Docker Compose** - Containerized development environment

### Data Storage & Management
- **SQLite with better-sqlite3** - Primary database for campaign data
- **Litestream** - SQLite replication and backup
- **Google Cloud Storage** - Image and asset storage (production)
- **localStorage** - Client-side API key storage

### Security & Infrastructure
- **helmet 7.0.0+** - Security headers middleware
- **cors 2.8.5+** - Cross-origin resource sharing
- **express-rate-limit 6.7.0+** - API rate limiting
- **compression 1.7.4+** - Response compression
- **dotenv 16.0.0+** - Environment configuration

### Observability & Logging
- **pino 9.7.0+** - Structured JSON logging
- **morgan 1.10.0+** - HTTP request logging

## Complete Project Structure

```
AIAgentTRPGGM2/
├── README.md                           # Project overview and setup instructions
├── CLAUDE.md                           # Master AI context file with project rules
├── package.json                        # Root package.json for monorepo
├── pnpm-workspace.yaml                 # pnpm workspace configuration
├── pnpm-lock.yaml                      # Lock file for dependencies
├── turbo.json                          # Turbo build configuration
├── docker-compose.yml                  # Docker development environment
├── start-dev.sh                        # Unified development startup script
├── Dockerfile.frontend                 # Frontend container configuration
├── Dockerfile.proxy-server             # Backend container configuration
├── claude.json                         # Claude Code configuration
├── dev.log                             # Development logs
├── .claude/                            # Claude Code workspace files
├── apps/                               # Application packages
│   ├── frontend/                       # React frontend application
│   │   ├── package.json                # Frontend dependencies
│   │   ├── tsconfig.json               # TypeScript configuration
│   │   ├── vite.config.ts              # Vite build configuration
│   │   ├── index.html                  # HTML entry point
│   │   ├── playwright.config.ts        # E2E test configuration
│   │   ├── src/                        # Source code
│   │   │   ├── main.tsx                # Application entry point
│   │   │   ├── App.tsx                 # Root component with routing
│   │   │   ├── vite-env.d.ts          # Vite type definitions
│   │   │   ├── api/                    # API client layer
│   │   │   │   ├── client.ts           # Axios client setup
│   │   │   │   ├── aiAgent.ts          # AI integration endpoints
│   │   │   │   ├── campaigns.ts        # Campaign management
│   │   │   │   ├── characters.ts       # Character operations
│   │   │   │   ├── sessions.ts         # TRPG session management
│   │   │   │   ├── locations.ts        # Location management
│   │   │   │   ├── milestones.ts       # Milestone tracking
│   │   │   │   └── [other API modules] # Additional API endpoints
│   │   │   ├── components/             # React components
│   │   │   │   ├── common/             # Shared components
│   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   ├── LoadingScreen.tsx
│   │   │   │   │   └── NotificationProvider.tsx
│   │   │   │   ├── layout/             # Layout components
│   │   │   │   │   └── AppLayout.tsx
│   │   │   │   ├── theme/              # Theme configuration
│   │   │   │   │   └── AppTheme.tsx
│   │   │   │   ├── characters/         # Character management UI
│   │   │   │   ├── locations/          # Location management UI
│   │   │   │   ├── trpg-session/       # Session interface components
│   │   │   │   │   ├── SessionInterface.tsx
│   │   │   │   │   ├── DiceRollUI.tsx
│   │   │   │   │   ├── ChatPanel.tsx
│   │   │   │   │   ├── AIGameMasterPanel.tsx
│   │   │   │   │   └── [other session components]
│   │   │   │   ├── ai-monitoring/      # AI monitoring dashboard
│   │   │   │   ├── party-movement/     # Party movement system
│   │   │   │   ├── exploration/        # Exploration features
│   │   │   │   └── scenario-editor/    # Scenario editing tools
│   │   │   ├── hooks/                  # Custom React hooks
│   │   │   │   ├── useSession.ts       # Session management
│   │   │   │   ├── useWebSocket.ts     # WebSocket connection
│   │   │   │   ├── useNotification.ts  # Notification system
│   │   │   │   └── [other hooks]       # Feature-specific hooks
│   │   │   ├── pages/                  # Page components
│   │   │   │   ├── HomePage.tsx        # Campaign listing
│   │   │   │   ├── CampaignSetupPage.tsx
│   │   │   │   ├── CharacterManagementPage.tsx
│   │   │   │   ├── TRPGSessionPage.tsx
│   │   │   │   └── [other pages]
│   │   │   ├── store/                  # State management
│   │   │   │   └── atoms.ts            # Recoil atoms
│   │   │   ├── types/                  # Local type definitions
│   │   │   └── utils/                  # Utility functions
│   │   │       └── logger.ts           # Frontend logging
│   │   ├── e2e/                        # E2E tests
│   │   │   ├── core/                   # Core functionality tests
│   │   │   ├── features/               # Feature tests
│   │   │   ├── pages/                  # Page tests
│   │   │   ├── data/                   # Test data
│   │   │   └── utils/                  # Test utilities
│   │   └── dist/                       # Build output
│   └── proxy-server/                   # Express.js backend
│       ├── package.json                # Backend dependencies
│       ├── tsconfig.json               # TypeScript configuration
│       ├── src/                        # Source code
│       │   ├── index.ts                # Server entry point
│       │   ├── app.ts                  # Express app setup
│       │   ├── database/               # Database layer
│       │   │   └── database.ts         # SQLite connection
│       │   ├── routes/                 # API routes
│       │   │   ├── index.ts            # Route registration
│       │   │   ├── aiAgent.ts          # AI agent endpoints
│       │   │   ├── campaigns.ts        # Campaign routes
│       │   │   ├── characters.ts       # Character routes
│       │   │   ├── sessions.ts         # Session routes
│       │   │   └── [other routes]      # Additional endpoints
│       │   ├── services/               # Business logic
│       │   │   ├── aiService.ts        # AI integration service
│       │   │   ├── aiProviderService.ts # Multi-provider support
│       │   │   ├── campaignService.ts  # Campaign operations
│       │   │   ├── sessionService.ts   # Session management
│       │   │   ├── ai-entity-engine/   # AI entity system
│       │   │   └── [other services]    # Feature services
│       │   ├── mastra/                 # Mastra AI agents
│       │   │   ├── index.ts            # Mastra configuration
│       │   │   ├── agents/             # TRPG AI agents
│       │   │   │   ├── gameMaster.ts
│       │   │   │   ├── companionAgent.ts
│       │   │   │   └── [other agents]
│       │   │   └── tools/              # Mastra tools
│       │   ├── middleware/             # Express middleware
│       │   │   ├── errorHandler.ts
│       │   │   ├── asyncHandler.ts
│       │   │   └── auth.middleware.ts
│       │   └── utils/                  # Utilities
│       │       ├── logger.ts           # Backend logging
│       │       └── systemPrompts.ts    # AI prompts
│       ├── data/                       # SQLite database files
│       │   ├── trpg.db
│       │   └── [database files]
│       ├── scripts/                    # Database scripts
│       └── dist/                       # Build output
├── packages/                           # Shared packages
│   └── types/                          # Shared TypeScript types
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts                # TRPG entity types
├── docs/                               # Documentation
│   ├── ai-context/                     # AI-specific documentation
│   │   ├── project-structure.md        # This file
│   │   ├── docs-overview.md            # Documentation architecture
│   │   ├── system-integration.md       # Integration patterns
│   │   ├── deployment-infrastructure.md # Infrastructure docs
│   │   └── handoff.md                  # Task management
│   ├── design/                         # System design documents
│   ├── testing/                        # Test documentation
│   ├── rules/                          # Development rules
│   ├── specs/                          # Feature specifications
│   ├── todos/                          # TODO lists
│   ├── プロジェクト概要/               # Project overview (Japanese)
│   ├── 機能要件定義/                   # Feature requirements (Japanese)
│   └── 非機能要件定義/                 # Non-functional requirements (Japanese)
└── node_modules/                       # Dependencies (git-ignored)
```

## Key Architecture Patterns

### TRPG-Specific Features
This project is specifically designed for TRPG (Tabletop Role-Playing Game) campaign management with:
- **Campaign Management**: Create and manage multiple TRPG campaigns
- **Character System**: Full character sheets for PCs, NPCs, and enemies
- **Session Interface**: Real-time TRPG session management with dice rolling
- **AI Game Master**: AI-powered assistance for narrative generation and NPC behavior
- **Timeline Management**: Session-based event tracking
- **Location System**: Interactive location management with entity placement
- **Milestone System**: Campaign progression tracking

### Development Patterns
- **Monorepo with pnpm workspaces**: Shared types and coordinated builds
- **TypeScript everywhere**: Full type safety across frontend and backend
- **AI Provider Abstraction**: Support for multiple AI providers (OpenAI, Anthropic, Google)
- **Real-time Updates**: WebSocket integration for live session updates
- **Secure API Key Management**: localStorage only, never exposed in frontend code
- **Component-based UI**: Modular React components with Material UI
- **State Management**: Recoil atoms for global state, local state for UI
- **Error Handling**: User-actionable error messages, no silent failures

### Important Notes
- Always use `./start-dev.sh` for development (prevents PC overload)
- API keys stored in localStorage per provider
- All shared types in `packages/types/index.ts`
- Follow Japanese documentation in `/docs/` folders for detailed requirements
- Test with production data types only (no test-specific types)

---

*This document reflects the actual structure of the AI Agent TRPG GM project. AI agents must read this file before making any changes to understand the complete technology stack and project organization.*