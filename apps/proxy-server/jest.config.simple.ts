import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: [
    '**/*.test.ts',
    '**/*.unit.test.ts',
    '**/*.integration.test.ts'
  ],
  collectCoverage: false,
  moduleNameMapper: {
    '^@ai-agent-trpg/types$': '<rootDir>/../../packages/types/src/index.ts'
  },
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

export default config;