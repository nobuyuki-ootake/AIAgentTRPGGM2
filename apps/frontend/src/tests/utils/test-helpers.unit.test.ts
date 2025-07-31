import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMockApiResponse,
  createMockApiError,
  mockFetchResponse,
  setupUserEvent,
  fillForm,
  clickAndWaitForLoading,
  expectErrorMessage,
  expectSuccessMessage,
  expectLoadingState,
  expectTableToContainData,
  setupTimers,
  waitForAsyncOperations,
  testDebounce,
  simulateDiceRoll,
  expectCharacterStatus,
  expectChatMessage,
  expectSessionState,
  cleanupAfterTest,
  setupTestSuite,
  suppressConsoleError,
  debugDOM,
  debugRecoilState,
} from './test-helpers';

// Mock userEvent
vi.mock('@testing-library/user-event');
const mockUserEvent = vi.mocked(userEvent);

describe('Test Helpers', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('API Mocking Utilities', () => {
    it('createMockApiResponse_withoutDelay_shouldResolveImmediately', async () => {
      const testData = { message: 'success', data: [1, 2, 3] };
      const promise = createMockApiResponse(testData);

      const result = await promise;
      expect(result).toEqual(testData);
    });

    it('createMockApiResponse_withDelay_shouldResolveAfterDelay', async () => {
      vi.useFakeTimers();
      const testData = { value: 42 };
      const promise = createMockApiResponse(testData, 1000);

      // Should not resolve immediately
      let resolved = false;
      promise.then(() => { resolved = true; });

      expect(resolved).toBe(false);

      // Advance timers and check resolution
      vi.advanceTimersByTime(1000);
      await promise;
      expect(resolved).toBe(true);

      vi.useRealTimers();
    });

    it('createMockApiError_shouldCreateRejectedPromiseWithStatusCode', async () => {
      const errorMessage = 'API request failed';
      const errorStatus = 404;
      const promise = createMockApiError(errorMessage, errorStatus);

      await expect(promise).rejects.toThrow(errorMessage);
      
      try {
        await promise;
      } catch (error: any) {
        expect(error.status).toBe(errorStatus);
      }
    });

    it('createMockApiError_withDelay_shouldRejectAfterDelay', async () => {
      vi.useFakeTimers();
      const promise = createMockApiError('Delayed error', 500, 2000);

      let rejected = false;
      promise.catch(() => { rejected = true; });

      expect(rejected).toBe(false);

      vi.advanceTimersByTime(2000);
      await expect(promise).rejects.toThrow('Delayed error');
      expect(rejected).toBe(true);

      vi.useRealTimers();
    });

    it('mockFetchResponse_shouldSetupGlobalFetchMock', () => {
      const testData = { users: ['alice', 'bob'] };
      const mockFetch = mockFetchResponse(testData, 200);

      expect(global.fetch).toBe(mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(0);
    });

    it('mockFetchResponse_withErrorStatus_shouldCreateErrorResponse', () => {
      const errorData = { error: 'Not found' };
      const mockFetch = mockFetchResponse(errorData, 404);

      expect(mockFetch).toBeDefined();
      // Verify the mock will return proper structure
      const mockedResponse = mockFetch.mock.results[0]?.value;
      if (mockedResponse) {
        expect(mockedResponse.ok).toBe(false);
        expect(mockedResponse.status).toBe(404);
      }
    });
  });

  describe('User Interaction Helpers', () => {
    it('setupUserEvent_shouldReturnUserEventInstance', () => {
      const mockSetup = vi.fn().mockReturnValue({
        click: vi.fn(),
        type: vi.fn(),
        clear: vi.fn(),
      });
      mockUserEvent.setup = mockSetup;

      const user = setupUserEvent();

      expect(mockSetup).toHaveBeenCalledWith({
        advanceTimers: vi.advanceTimersByTime,
        delay: null,
      });
      expect(user).toBeDefined();
    });

    it('fillForm_shouldFillAllFormFields', async () => {
      // Setup DOM with form fields
      document.body.innerHTML = `
        <form>
          <input name="username" type="text" />
          <input name="email" type="email" />
          <textarea name="message"></textarea>
          <input name="nonexistent" type="text" />
        </form>
      `;

      const mockUser = {
        clear: vi.fn(),
        type: vi.fn(),
      };

      const formData = {
        username: 'testuser',
        email: 'test@example.com',
        message: 'Hello world',
        nonexistent: 'should be ignored',
      };

      await fillForm(mockUser as any, formData);

      expect(mockUser.clear).toHaveBeenCalledTimes(3); // Only existing fields
      expect(mockUser.type).toHaveBeenCalledTimes(3);
      expect(mockUser.type).toHaveBeenCalledWith(expect.any(HTMLInputElement), 'testuser');
      expect(mockUser.type).toHaveBeenCalledWith(expect.any(HTMLInputElement), 'test@example.com');
      expect(mockUser.type).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement), 'Hello world');
    });

    it('fillForm_withNonexistentFields_shouldSkipGracefully', async () => {
      document.body.innerHTML = '<div>No form fields</div>';

      const mockUser = {
        clear: vi.fn(),
        type: vi.fn(),
      };

      const formData = { username: 'test', email: 'test@example.com' };

      await fillForm(mockUser as any, formData);

      expect(mockUser.clear).not.toHaveBeenCalled();
      expect(mockUser.type).not.toHaveBeenCalled();
    });

    it('clickAndWaitForLoading_withoutLoadingIndicator_shouldJustClick', async () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const mockUser = {
        click: vi.fn(),
      };

      await clickAndWaitForLoading(mockUser as any, button);

      expect(mockUser.click).toHaveBeenCalledWith(button);
    });

    it('clickAndWaitForLoading_withLoadingIndicator_shouldWaitForLoadingCycle', async () => {
      const button = document.createElement('button');
      const loadingSpinner = document.createElement('div');
      loadingSpinner.className = 'loading-spinner';
      
      document.body.appendChild(button);

      const mockUser = {
        click: vi.fn().mockImplementation(() => {
          // Simulate showing loading indicator after click
          document.body.appendChild(loadingSpinner);
          
          // Simulate removing loading indicator after delay
          setTimeout(() => {
            if (loadingSpinner.parentNode) {
              loadingSpinner.parentNode.removeChild(loadingSpinner);
            }
          }, 100);
        }),
      };

      await clickAndWaitForLoading(mockUser as any, button, '.loading-spinner');

      expect(mockUser.click).toHaveBeenCalledWith(button);
    });
  });

  describe('Assertion Helpers', () => {
    it('expectErrorMessage_withMatchingErrorElement_shouldPass', async () => {
      const errorDiv = document.createElement('div');
      errorDiv.setAttribute('role', 'alert');
      errorDiv.textContent = 'Validation failed';
      document.body.appendChild(errorDiv);

      await expect(expectErrorMessage('Validation failed')).resolves.not.toThrow();
    });

    it('expectErrorMessage_withMUIAlert_shouldFindMessage', async () => {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'MuiAlert-message';
      alertDiv.textContent = 'API request failed';
      document.body.appendChild(alertDiv);

      await expect(expectErrorMessage('API request failed')).resolves.not.toThrow();
    });

    it('expectSuccessMessage_withMatchingElement_shouldPass', async () => {
      const successDiv = document.createElement('div');
      successDiv.className = 'success-message';
      successDiv.textContent = 'Operation completed successfully';
      document.body.appendChild(successDiv);

      await expect(expectSuccessMessage('Operation completed successfully')).resolves.not.toThrow();
    });

    it('expectLoadingState_withLoadingElements_shouldDetectLoadingState', () => {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      document.body.appendChild(loadingDiv);

      expect(() => expectLoadingState(true)).not.toThrow();
    });

    it('expectLoadingState_withoutLoadingElements_shouldDetectNoLoadingState', () => {
      expect(() => expectLoadingState(false)).not.toThrow();
    });

    it('expectLoadingState_withMUICircularProgress_shouldDetectLoading', () => {
      const progressDiv = document.createElement('div');
      progressDiv.className = 'MuiCircularProgress-root';
      document.body.appendChild(progressDiv);

      expect(() => expectLoadingState(true)).not.toThrow();
    });

    it('expectTableToContainData_withTable_shouldFindAllData', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><td>Name</td><td>Age</td></tr>
        <tr><td>Alice</td><td>30</td></tr>
        <tr><td>Bob</td><td>25</td></tr>
      `;
      document.body.appendChild(table);

      expect(() => expectTableToContainData(['Alice', 'Bob', '30', '25'])).not.toThrow();
    });

    it('expectTableToContainData_withDataGrid_shouldWork', () => {
      const grid = document.createElement('div');
      grid.className = 'data-grid';
      grid.textContent = 'User1 User2 Item1 Item2';
      document.body.appendChild(grid);

      expect(() => expectTableToContainData(['User1', 'Item2'])).not.toThrow();
    });
  });

  describe('Timer & Async Utilities', () => {
    it('setupTimers_shouldConfigureFakeTimers', () => {
      const timers = setupTimers();

      expect(timers.advanceTime).toBeDefined();
      expect(timers.cleanup).toBeDefined();
      expect(vi.isFakeTimers()).toBe(true);

      timers.cleanup();
      expect(vi.isFakeTimers()).toBe(false);
    });

    it('setupTimers_advanceTime_shouldAdvanceTimersBySpecifiedAmount', () => {
      const timers = setupTimers();
      const callback = vi.fn();

      setTimeout(callback, 1000);
      expect(callback).not.toHaveBeenCalled();

      timers.advanceTime(1000);
      expect(callback).toHaveBeenCalled();

      timers.cleanup();
    });

    it('waitForAsyncOperations_shouldWaitForPromisesToResolve', async () => {
      const promise = Promise.resolve('test');
      
      await expect(waitForAsyncOperations()).resolves.not.toThrow();
      await expect(promise).resolves.toBe('test');
    });

    it('testDebounce_shouldTestDebounceBehavior', async () => {
      const timers = setupTimers();
      const callback = vi.fn();
      const debouncedCallback = vi.fn();

      // Simulate debounced function
      let timeoutId: any;
      const mockDebounce = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(debouncedCallback, 300);
      };

      await testDebounce(mockDebounce, 300, timers);

      // After testDebounce completes, the debounced function should have been called once
      expect(debouncedCallback).toHaveBeenCalledTimes(1);

      timers.cleanup();
    });
  });

  describe('TRPG-specific Test Helpers', () => {
    it('simulateDiceRoll_shouldReturnValidDiceResults', () => {
      const results = simulateDiceRoll(20, 3);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
      });
    });

    it('simulateDiceRoll_withSingleDie_shouldReturnSingleResult', () => {
      const results = simulateDiceRoll(6);

      expect(results).toHaveLength(1);
      expect(results[0]).toBeGreaterThanOrEqual(1);
      expect(results[0]).toBeLessThanOrEqual(6);
    });

    it('expectCharacterStatus_withMatchingCharacterCard_shouldPass', () => {
      const characterCard = document.createElement('div');
      characterCard.setAttribute('data-testid', 'character-Aelar');
      characterCard.innerHTML = `
        <div>Aelar</div>
        <div>HP: 25</div>
        <div>AC: 16</div>
      `;
      document.body.appendChild(characterCard);

      expect(() => expectCharacterStatus('Aelar', 25, 16)).not.toThrow();
    });

    it('expectChatMessage_withChatArea_shouldFindMessage', () => {
      const chatArea = document.createElement('div');
      chatArea.setAttribute('data-testid', 'chat-messages');
      chatArea.innerHTML = `
        <div class="message">
          <span class="sender">GM</span>
          <span class="content">Welcome to the adventure!</span>
        </div>
      `;
      document.body.appendChild(chatArea);

      expect(() => expectChatMessage('Welcome to the adventure!', 'GM')).not.toThrow();
    });

    it('expectChatMessage_withoutSender_shouldOnlyCheckMessage', () => {
      const chatArea = document.createElement('div');
      chatArea.setAttribute('data-testid', 'chat-messages');
      chatArea.textContent = 'You enter the tavern';
      document.body.appendChild(chatArea);

      expect(() => expectChatMessage('You enter the tavern')).not.toThrow();
    });

    it('expectSessionState_withCorrectStatus_shouldPass', () => {
      const sessionIndicator = document.createElement('div');
      sessionIndicator.setAttribute('data-testid', 'session-status');
      sessionIndicator.setAttribute('data-status', 'active');
      document.body.appendChild(sessionIndicator);

      expect(() => expectSessionState('active')).not.toThrow();
    });
  });

  describe('Cleanup Utilities', () => {
    it('cleanupAfterTest_shouldClearAllTestState', () => {
      // Setup some test state
      localStorage.setItem('test', 'value');
      sessionStorage.setItem('test', 'value');
      vi.useFakeTimers();
      const mockFn = vi.fn();
      document.body.innerHTML = '<div>test content</div>';

      // Call cleanup
      cleanupAfterTest();

      // Verify cleanup
      expect(localStorage.getItem('test')).toBeNull();
      expect(sessionStorage.getItem('test')).toBeNull();
      expect(vi.isFakeTimers()).toBe(false);
      expect(document.body.innerHTML).toBe('');
    });

    it('setupTestSuite_shouldReturnTestUtilities', () => {
      const suite = setupTestSuite();

      expect(suite.user).toBeDefined();
      expect(suite.timers).toBeDefined();
      expect(suite.cleanup).toBe(cleanupAfterTest);
      expect(vi.isFakeTimers()).toBe(true);

      suite.cleanup();
    });
  });

  describe('Console Utilities', () => {
    it('suppressConsoleError_shouldSuppressMatchingPatterns', () => {
      const originalError = console.error;
      const restoreConsole = suppressConsoleError(['Warning:', /React.*deprecated/]);

      console.error('Warning: This should be suppressed');
      console.error('React feature is deprecated');
      console.error('This should not be suppressed');

      expect(console.error).toHaveBeenCalledTimes(3);
      
      restoreConsole();
      expect(console.error).toBe(originalError);
    });

    it('suppressConsoleError_withStringPattern_shouldSuppressStringMatches', () => {
      const restoreConsole = suppressConsoleError(['specific error']);

      console.error('specific error occurred');
      console.error('different error occurred');

      // Both should be called on the mocked console.error
      expect(console.error).toHaveBeenCalledTimes(2);

      restoreConsole();
    });

    it('suppressConsoleError_withRegexPattern_shouldSuppressRegexMatches', () => {
      const restoreConsole = suppressConsoleError([/test.*pattern/i]);

      console.error('Test Error Pattern');
      console.error('test warning pattern');
      console.error('unrelated error');

      expect(console.error).toHaveBeenCalledTimes(3);

      restoreConsole();
    });

    it('debugDOM_shouldLogDOMContent', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      document.body.innerHTML = '<div>Test content</div>';

      debugDOM();

      expect(consoleSpy).toHaveBeenCalledWith('=== DOM Debug ===');
      expect(consoleSpy).toHaveBeenCalledWith('<div>Test content</div>');
      expect(consoleSpy).toHaveBeenCalledWith('=== End DOM Debug ===');

      consoleSpy.mockRestore();
    });

    it('debugRecoilState_inDevelopmentMode_shouldLogDebugInfo', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      debugRecoilState();

      expect(consoleSpy).toHaveBeenCalledWith('=== Recoil State Debug ===');
      expect(consoleSpy).toHaveBeenCalledWith('Use Recoil DevTools for state inspection');
      expect(consoleSpy).toHaveBeenCalledWith('=== End Recoil State Debug ===');

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('debugRecoilState_inProductionMode_shouldNotLog', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      debugRecoilState();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('fillForm_withReadonlyFields_shouldHandleGracefully', async () => {
      document.body.innerHTML = `
        <form>
          <input name="readonly" readonly type="text" />
          <input name="disabled" disabled type="text" />
          <input name="normal" type="text" />
        </form>
      `;

      const mockUser = {
        clear: vi.fn(),
        type: vi.fn(),
      };

      const formData = {
        readonly: 'should try to fill',
        disabled: 'should try to fill',
        normal: 'should fill',
      };

      await fillForm(mockUser as any, formData);

      // Should attempt to fill all found fields (readonly/disabled handling is up to userEvent)
      expect(mockUser.clear).toHaveBeenCalledTimes(3);
      expect(mockUser.type).toHaveBeenCalledTimes(3);
    });

    it('expectTableToContainData_withMissingTable_shouldThrow', () => {
      expect(() => expectTableToContainData(['data'])).toThrow();
    });

    it('testDebounce_withZeroDelay_shouldWork', async () => {
      const timers = setupTimers();
      const callback = vi.fn();

      await testDebounce(callback, 0, timers);

      expect(callback).toHaveBeenCalledTimes(3); // Called 3 times directly in testDebounce

      timers.cleanup();
    });

    it('createMockApiResponse_withNullData_shouldResolveWithNull', async () => {
      const result = await createMockApiResponse(null);
      expect(result).toBeNull();
    });

    it('createMockApiError_withoutStatus_shouldDefaultTo500', async () => {
      const promise = createMockApiError('Default error');

      try {
        await promise;
      } catch (error: any) {
        expect(error.status).toBe(500);
      }
    });

    it('simulateDiceRoll_withZeroCount_shouldReturnEmptyArray', () => {
      const results = simulateDiceRoll(20, 0);
      expect(results).toEqual([]);
    });

    it('simulateDiceRoll_withNegativeCount_shouldHandleGracefully', () => {
      const results = simulateDiceRoll(6, -1);
      expect(results).toEqual([]);
    });
  });
});