import type { Config } from 'jest';

const config: Config = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Root directory for tests
  rootDir: './src',
  
  // Test file patterns with t-WADA naming conventions
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.unit.test.ts',
    '**/*.integration.test.ts',
    '**/*.test.ts'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@ai-agent-trpg/types$': '<rootDir>/../../packages/types/src/index.ts'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'CommonJS',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        downlevelIteration: true,
        // Test-specific overrides
        noImplicitAny: false, // Allow more flexible test data creation
        noUnusedLocals: false,
        noUnusedParameters: false
      }
    }]
  },
  
  // Coverage configuration
  collectCoverage: false, // Disable by default, enable with --coverage flag
  coverageDirectory: '../coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  collectCoverageFrom: [
    'services/**/*.ts',
    'routes/**/*.ts',
    'middleware/**/*.ts',
    'utils/**/*.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/tests/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!index.ts', // Entry points
    '!**/migrations/**', // Database migrations
    '!**/scripts/**' // CLI scripts
  ],
  
  // Test timeouts for AI operations
  testTimeout: 10000, // 10 seconds for most tests
  
  // Test environment configuration
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Global variables removed - ts-jest config moved to transform
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Error reporting
  errorOnDeprecated: true,
  
  // Parallel test execution
  maxWorkers: '50%'
};

export default config;