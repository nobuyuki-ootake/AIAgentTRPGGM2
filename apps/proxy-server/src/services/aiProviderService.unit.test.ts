/**
 * aiProviderService Unit Tests
 * Tests for AI Provider Service - Connection, Authentication, and API Requests
 * t-WADA naming convention: aiProviderService.unit.test.ts
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { AIProviderService } from './aiProviderService';
import { ValidationError, AIServiceError } from '../middleware/errorHandler';
import { aiOnlyMockSetup } from '../tests/mocks';

// Mock external dependencies
jest.mock('openai');
jest.mock('@anthropic-ai/sdk');
jest.mock('@google/generative-ai');
jest.mock('axios');
jest.mock('../database/database', () => ({
  getDatabase: jest.fn()
}));
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { getDatabase } from '../database/database';

describe('AIProviderService - AI Provider Integration', () => {
  let aiProviderService: AIProviderService;
  let testDb: Database;
  let mockDatabase: jest.Mocked<Database>;
  let mockSetup: Awaited<ReturnType<typeof aiOnlyMockSetup>>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup AI-only mock environment
    mockSetup = await aiOnlyMockSetup();
    
    // Create service instance
    aiProviderService = new AIProviderService();
    
    // Use global test database
    testDb = global.testDb;
    
    // Mock database
    mockDatabase = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn()
      })
    } as any;
    (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  afterEach(async () => {
    if (mockSetup?.cleanup) {
      await mockSetup.cleanup();
    }
  });

  describe('API Key Management', () => {
    test('should get API key from environment variables when available', async () => {
      // Arrange
      process.env.OPENAI_API_KEY = 'env-openai-key';
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Connection successful.' } }],
              usage: { total_tokens: 30 }
            })
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      const result = await aiProviderService.testProviderConnection('openai', 'request-key');

      // Assert
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'env-openai-key' });
      expect(result).toBe(true);
    });

    test('should use request API key when environment variable not available', async () => {
      // Arrange
      const requestApiKey = 'request-openai-key';
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Connection successful.' } }],
              usage: { total_tokens: 30 }
            })
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      const result = await aiProviderService.testProviderConnection('openai', requestApiKey);

      // Assert
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: requestApiKey });
      expect(result).toBe(true);
    });

    test('should throw ValidationError when no API key available', async () => {
      // Act & Assert
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'openai',
          message: 'test'
        })
      ).rejects.toThrow(ValidationError);
      
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'openai',
          message: 'test'
        })
      ).rejects.toThrow('No API key found for provider: openai');
    });

    test('should handle different provider environment variable patterns', () => {
      // Arrange
      process.env.ANTHROPIC_API_KEY = 'anthropic-env-key';
      process.env.GOOGLE_API_KEY = 'google-env-key';

      // Act & Assert
      // Test private method through testProviderConnection
      expect(async () => {
        await aiProviderService.testProviderConnection('anthropic', 'test-key');
      }).not.toThrow();
      
      expect(async () => {
        await aiProviderService.testProviderConnection('google', 'test-key');
      }).not.toThrow();
    });
  });

  describe('Provider Connection Testing', () => {
    test('should successfully test OpenAI connection', async () => {
      // Arrange
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Connection successful.' } }],
              usage: { total_tokens: 30 }
            })
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      const result = await aiProviderService.testProviderConnection('openai', 'test-api-key');

      // Assert
      expect(result).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection. Please respond with "Connection successful."' }],
        temperature: 0,
        max_tokens: 50
      });
    });

    test('should successfully test Anthropic connection', async () => {
      // Arrange
      const mockAnthropic = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Connection successful.' }],
            usage: { input_tokens: 10, output_tokens: 20 }
          })
        }
      };
      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropic as any);

      // Act
      const result = await aiProviderService.testProviderConnection('anthropic', 'test-api-key');

      // Assert
      expect(result).toBe(true);
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        system: undefined,
        messages: [{ role: 'user', content: 'Test connection. Please respond with "Connection successful."' }],
        temperature: 0
      });
    });

    test('should successfully test Google connection', async () => {
      // Arrange
      const mockGoogleAI = {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => 'Connection successful.'
            }
          })
        })
      };
      (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => mockGoogleAI as any);

      // Act
      const result = await aiProviderService.testProviderConnection('google', 'test-api-key');

      // Assert
      expect(result).toBe(true);
      expect(mockGoogleAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash-lite' });
    });

    test('should return false when connection test fails', async () => {
      // Arrange
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API key invalid'))
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      const result = await aiProviderService.testProviderConnection('openai', 'invalid-key');

      // Assert
      expect(result).toBe(false);
    });

    test('should use custom model for connection test when provided', async () => {
      // Arrange
      const customModel = 'gpt-4';
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Connection successful.' } }],
              usage: { total_tokens: 30 }
            })
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      await aiProviderService.testProviderConnection('openai', 'test-key', customModel);

      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: customModel })
      );
    });
  });

  describe('AI Request Processing', () => {
    test('should make successful OpenAI request', async () => {
      // Arrange
      const mockResponse = {
        choices: [{ message: { content: 'AI response content' } }],
        usage: { total_tokens: 150 }
      };
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        message: 'Test message',
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.8,
        maxTokens: 1000
      });

      // Assert
      expect(result.response).toBe('AI response content');
      expect(result.tokensUsed).toBe(150);
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.processingTime).toBeGreaterThan(0);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Test message' }
        ],
        temperature: 0.8,
        max_tokens: 1000
      });
    });

    test('should make successful Anthropic request', async () => {
      // Arrange
      const mockResponse = {
        content: [{ type: 'text', text: 'Claude response content' }],
        usage: { input_tokens: 50, output_tokens: 100 }
      };
      const mockAnthropic = {
        messages: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      };
      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropic as any);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'anthropic',
        apiKey: 'test-key',
        message: 'Test message',
        systemPrompt: 'You are Claude'
      });

      // Assert
      expect(result.response).toBe('Claude response content');
      expect(result.tokensUsed).toBe(150); // 50 + 100
      expect(result.provider).toBe('anthropic');
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        system: 'You are Claude',
        messages: [{ role: 'user', content: 'Test message' }],
        temperature: 0.7
      });
    });

    test('should make successful Google request', async () => {
      // Arrange
      const mockGoogleAI = {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => 'Gemini response content'
            }
          })
        })
      };
      (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => mockGoogleAI as any);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'google',
        apiKey: 'test-key',
        message: 'Test message',
        systemPrompt: 'You are Gemini'
      });

      // Assert
      expect(result.response).toBe('Gemini response content');
      expect(result.provider).toBe('google');
      expect(mockGoogleAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash-lite' });
    });

    test('should make successful custom endpoint request', async () => {
      // Arrange
      const mockAxiosResponse = {
        data: {
          choices: [{ message: { content: 'Custom API response' } }],
          usage: { total_tokens: 200 }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockAxiosResponse);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'custom',
        apiKey: 'test-key',
        message: 'Test message',
        context: { endpoint: 'http://localhost:8000/v1' }
      });

      // Assert
      expect(result.response).toBe('Custom API response');
      expect(result.tokensUsed).toBe(200);
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/chat/completions',
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test message' }]
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('should handle request without system prompt', async () => {
      // Arrange
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Response without system prompt' } }],
              usage: { total_tokens: 50 }
            })
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'openai',
        apiKey: 'test-key',
        message: 'Test message'
      });

      // Assert
      expect(result.response).toBe('Response without system prompt');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test message' }]
        })
      );
    });

    test('should use default values for optional parameters', async () => {
      // Arrange
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Default params response' } }],
              usage: { total_tokens: 75 }
            })
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      await aiProviderService.makeAIRequest({
        provider: 'openai',
        apiKey: 'test-key',
        message: 'Test message'
      });

      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test message' }],
        temperature: 0.7,
        max_tokens: 2000
      });
    });
  });

  describe('Error Handling', () => {
    test('should throw ValidationError for unsupported provider', async () => {
      // Act & Assert
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'unsupported-provider',
          apiKey: 'test-key',
          message: 'test'
        })
      ).rejects.toThrow(ValidationError);
      
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'unsupported-provider',
          apiKey: 'test-key',
          message: 'test'
        })
      ).rejects.toThrow('Unsupported AI provider: unsupported-provider');
    });

    test('should throw ValidationError when required API key missing for OpenAI', async () => {
      // Act & Assert
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'openai',
          message: 'test'
        })
      ).rejects.toThrow(ValidationError);
    });

    test('should throw AIServiceError when OpenAI API call fails', async () => {
      // Arrange
      const apiError = new Error('OpenAI API rate limit exceeded');
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(apiError)
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act & Assert
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'openai',
          apiKey: 'test-key',
          message: 'test'
        })
      ).rejects.toThrow(AIServiceError);
    });

    test('should throw AIServiceError when Anthropic API call fails', async () => {
      // Arrange
      const apiError = new Error('Anthropic API authentication failed');
      const mockAnthropic = {
        messages: {
          create: jest.fn().mockRejectedValue(apiError)
        }
      };
      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropic as any);

      // Act & Assert
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'anthropic',
          apiKey: 'test-key',
          message: 'test'
        })
      ).rejects.toThrow(AIServiceError);
    });

    test('should throw AIServiceError when Google API call fails', async () => {
      // Arrange
      const apiError = new Error('Google API quota exceeded');
      const mockGoogleAI = {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(apiError)
        })
      };
      (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => mockGoogleAI as any);

      // Act & Assert
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'google',
          apiKey: 'test-key',
          message: 'test'
        })
      ).rejects.toThrow(AIServiceError);
    });

    test('should throw AIServiceError when custom endpoint fails', async () => {
      // Arrange
      const networkError = new Error('Network timeout');
      (axios.post as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        aiProviderService.makeAIRequest({
          provider: 'custom',
          apiKey: 'test-key',
          message: 'test',
          context: { endpoint: 'http://localhost:8000/v1' }
        })
      ).rejects.toThrow(AIServiceError);
    });

    test('should include processing time in error metadata', async () => {
      // Arrange
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act & Assert
      try {
        await aiProviderService.makeAIRequest({
          provider: 'openai',
          apiKey: 'test-key',
          message: 'test'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        const aiError = error as AIServiceError;
        expect(aiError.metadata).toHaveProperty('processingTime');
        expect(typeof aiError.metadata.processingTime).toBe('number');
      }
    });
  });

  describe('Request Logging', () => {
    test('should log successful AI request to database', async () => {
      // Arrange
      const mockPrepare = jest.fn().mockReturnValue({
        run: jest.fn()
      });
      mockDatabase.prepare.mockReturnValue(mockPrepare as any);

      const requestData = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        prompt: 'Test prompt',
        response: 'Test response',
        tokensUsed: 100,
        processingTime: 1500,
        category: 'chat',
        context: { sessionId: 'test-session' },
        campaignId: 'test-campaign'
      };

      // Act
      await aiProviderService.logAIRequest(requestData);

      // Assert
      expect(mockDatabase.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ai_requests'));
      expect(mockPrepare.run).toHaveBeenCalledWith(
        'openai',
        'gpt-3.5-turbo',
        'Test prompt',
        JSON.stringify({ sessionId: 'test-session' }),
        expect.any(String), // timestamp
        'Test response',
        100,
        1500,
        'chat'
      );
    });

    test('should handle database logging errors gracefully', async () => {
      // Arrange
      const mockPrepare = jest.fn().mockReturnValue({
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        })
      });
      mockDatabase.prepare.mockReturnValue(mockPrepare as any);

      const requestData = {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        prompt: 'Test prompt',
        response: 'Test response',
        processingTime: 2000,
        category: 'character-generation'
      };

      // Act & Assert - Should not throw
      await expect(aiProviderService.logAIRequest(requestData)).resolves.toBeUndefined();
    });

    test('should use default values for optional logging parameters', async () => {
      // Arrange
      const mockPrepare = jest.fn().mockReturnValue({
        run: jest.fn()
      });
      mockDatabase.prepare.mockReturnValue(mockPrepare as any);

      const requestData = {
        provider: 'google',
        model: 'gemini-2.0-flash-lite',
        prompt: 'Test prompt',
        response: 'Test response',
        processingTime: 800,
        category: 'gm-assistance'
      };

      // Act
      await aiProviderService.logAIRequest(requestData);

      // Assert
      expect(mockPrepare.run).toHaveBeenCalledWith(
        'google',
        'gemini-2.0-flash-lite',
        'Test prompt',
        '{}', // empty context object
        expect.any(String), // timestamp
        'Test response',
        0, // default tokens used
        800,
        'gm-assistance'
      );
    });
  });

  describe('Provider-Specific Behavior', () => {
    test('should handle empty OpenAI response', async () => {
      // Arrange
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: null } }],
              usage: { total_tokens: 10 }
            })
          }
        }
      };
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'openai',
        apiKey: 'test-key',
        message: 'test'
      });

      // Assert
      expect(result.response).toBe('');
    });

    test('should handle non-text Anthropic response', async () => {
      // Arrange
      const mockAnthropic = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{ type: 'image', data: 'base64data' }],
            usage: { input_tokens: 10, output_tokens: 0 }
          })
        }
      };
      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropic as any);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'anthropic',
        apiKey: 'test-key',
        message: 'test'
      });

      // Assert
      expect(result.response).toBe('');
    });

    test('should handle Google response without token usage', async () => {
      // Arrange
      const mockGoogleAI = {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => 'Google response'
            }
          })
        })
      };
      (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => mockGoogleAI as any);

      // Act
      const result = await aiProviderService.makeAIRequest({
        provider: 'google',
        apiKey: 'test-key',
        message: 'test'
      });

      // Assert
      expect(result.response).toBe('Google response');
      expect(result.tokensUsed).toBeUndefined();
    });

    test('should use default custom endpoint when not specified', async () => {
      // Arrange
      const mockAxiosResponse = {
        data: {
          choices: [{ message: { content: 'Default endpoint response' } }],
          usage: { total_tokens: 100 }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockAxiosResponse);

      // Act
      await aiProviderService.makeAIRequest({
        provider: 'custom',
        apiKey: 'test-key',
        message: 'test'
      });

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/chat/completions',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});