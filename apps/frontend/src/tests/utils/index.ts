/**
 * Test Utilities - Frontend Testing Infrastructure
 * 
 * このファイルは t-WADA naming conventions と CLAUDE.md の指針に従い、
 * 本番型を使用した包括的なテスト環境を提供します。
 */

// Render utilities with all providers
export * from './render';

// WebSocket mocking for real-time features
export * from './websocket-mock';

// Test data factories using production types
export * from './test-data-factories';

// Additional test utilities
export * from './test-helpers';

// Re-export common testing utilities
export { vi, expect } from 'vitest';
export { screen, waitFor, fireEvent, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';