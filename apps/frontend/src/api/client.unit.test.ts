import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiClient, apiClient, setGlobalNotificationCallback } from './client';
import { APIResponse } from '@ai-agent-trpg/types';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ApiClient', () => {
  let client: ApiClient;
  let mockNotificationCallback: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockInterceptors: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock notification callback
    mockNotificationCallback = vi.fn();
    setGlobalNotificationCallback(mockNotificationCallback);

    // Mock axios instance and interceptors
    mockInterceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    };

    mockCreate = vi.fn().mockReturnValue({
      interceptors: mockInterceptors,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });

    mockedAxios.create = mockCreate;
    mockedAxios.CancelToken = {
      source: vi.fn().mockReturnValue({
        token: 'mock-token',
        cancel: vi.fn(),
      }),
    } as any;

    // Mock import.meta.env
    vi.stubGlobal('import.meta', {
      env: {
        DEV: true,
        VITE_API_BASE_URL: undefined,
      },
    });

    client = new ApiClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setGlobalNotificationCallback(null);
  });

  describe('constructor', () => {
    it('createApiClient_withDefaultConfig_shouldUseDefaultBaseURL', () => {
      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: '/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('createApiClient_withCustomBaseURL_shouldUseCustomBaseURL', () => {
      vi.stubGlobal('import.meta', {
        env: {
          VITE_API_BASE_URL: 'https://custom-api.example.com',
        },
      });

      new ApiClient();

      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: 'https://custom-api.example.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('setupInterceptors_onConstruction_shouldSetupRequestAndResponseInterceptors', () => {
      expect(mockInterceptors.request.use).toHaveBeenCalled();
      expect(mockInterceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('request interceptor', () => {
    let requestInterceptor: (config: any) => any;
    let requestErrorInterceptor: (error: any) => Promise<any>;

    beforeEach(() => {
      const requestInterceptorCall = mockInterceptors.request.use.mock.calls[0];
      requestInterceptor = requestInterceptorCall[0];
      requestErrorInterceptor = requestInterceptorCall[1];
    });

    it('requestInterceptor_inDevelopmentMode_shouldLogRequestDetails', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const config = {
        method: 'GET',
        url: '/test',
        data: { test: 'data' },
        params: { param: 'value' },
      };

      const result = requestInterceptor(config);

      expect(result).toBe(config);
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚀 API Request: GET /test',
        {
          data: { test: 'data' },
          params: { param: 'value' },
        }
      );

      consoleSpy.mockRestore();
    });

    it('requestInterceptor_inProductionMode_shouldNotLog', () => {
      vi.stubGlobal('import.meta', {
        env: { DEV: false },
      });
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const config = { method: 'GET', url: '/test' };

      requestInterceptor(config);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('requestErrorInterceptor_withError_shouldLogAndRejectError', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Request error');

      await expect(requestErrorInterceptor(error)).rejects.toBe(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ API Request Error:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('response interceptor', () => {
    let responseInterceptor: (response: AxiosResponse<APIResponse<any>>) => AxiosResponse<APIResponse<any>>;
    let responseErrorInterceptor: (error: any) => Promise<any>;

    beforeEach(() => {
      const responseInterceptorCall = mockInterceptors.response.use.mock.calls[0];
      responseInterceptor = responseInterceptorCall[0];
      responseErrorInterceptor = responseInterceptorCall[1];
    });

    it('responseInterceptor_withSuccessfulResponse_shouldLogAndReturnResponse', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const response: AxiosResponse<APIResponse<any>> = {
        data: { success: true, data: { result: 'test' } },
        status: 200,
        config: { method: 'GET', url: '/test' },
      } as any;

      const result = responseInterceptor(response);

      expect(result).toBe(response);
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ API Response: GET /test',
        {
          status: 200,
          data: { success: true, data: { result: 'test' } },
        }
      );

      consoleSpy.mockRestore();
    });

    it('responseInterceptor_withFailedAPIResponse_shouldThrowError', () => {
      const response: AxiosResponse<APIResponse<any>> = {
        data: { success: false, error: 'API operation failed' },
        status: 200,
        config: { method: 'POST', url: '/test' },
      } as any;

      expect(() => responseInterceptor(response)).toThrow('API operation failed');
    });

    it('responseInterceptor_withFailedAPIResponseNoError_shouldThrowDefaultError', () => {
      const response: AxiosResponse<APIResponse<any>> = {
        data: { success: false },
        status: 200,
        config: { method: 'POST', url: '/test' },
      } as any;

      expect(() => responseInterceptor(response)).toThrow('API request failed');
    });

    describe('error handling', () => {
      beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => {
        vi.mocked(console.error).mockRestore();
      });

      it('responseErrorInterceptor_with404Error_shouldTriggerSpecific404Notification', async () => {
        const error: AxiosError = {
          response: {
            status: 404,
            statusText: 'Not Found',
            data: { error: 'Endpoint not found' },
          },
          config: {
            method: 'GET',
            url: '/non-existent',
          },
        } as any;

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);

        expect(mockNotificationCallback).toHaveBeenCalledWith(
          '404-error',
          'GET /non-existent',
          expect.objectContaining({
            details: expect.stringContaining('Request Details:'),
          })
        );
        expect(error.message).toBe('Endpoint not found');
      });

      it('responseErrorInterceptor_with500Error_shouldTriggerServerErrorNotification', async () => {
        const error: AxiosError = {
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            data: { error: 'Server crashed' },
          },
          config: {
            method: 'POST',
            url: '/server-error',
          },
        } as any;

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);

        expect(mockNotificationCallback).toHaveBeenCalledWith(
          'error',
          'Server Error (500): Server crashed',
          expect.objectContaining({
            details: expect.stringContaining('Request: POST /server-error'),
          })
        );
      });

      it('responseErrorInterceptor_withNetworkError_shouldTriggerNetworkErrorNotification', async () => {
        const error: AxiosError = {
          request: {}, // Network error has request but no response
          config: {
            method: 'GET',
            url: '/network-fail',
          },
        } as any;

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);

        expect(mockNotificationCallback).toHaveBeenCalledWith(
          'error',
          'Network connection failed',
          expect.objectContaining({
            details: 'Unable to connect to the server. Please check your internet connection and try again.',
          })
        );
        expect(error.message).toBe('Network error. Please check your connection and try again.');
      });

      it('responseErrorInterceptor_withUnknownError_shouldTriggerUnexpectedErrorNotification', async () => {
        const error = new Error('Unknown error');

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);

        expect(mockNotificationCallback).toHaveBeenCalledWith(
          'error',
          'Unexpected error occurred',
          expect.objectContaining({
            details: 'Unknown error',
          })
        );
      });

      it('responseErrorInterceptor_withoutNotificationCallback_shouldStillProcessError', async () => {
        setGlobalNotificationCallback(null);
        
        const error: AxiosError = {
          response: {
            status: 404,
            statusText: 'Not Found',
            data: { error: 'Not found' },
          },
          config: {
            method: 'GET',
            url: '/test',
          },
        } as any;

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);
        expect(error.message).toBe('Not found');
      });
    });
  });

  describe('HTTP methods', () => {
    let mockAxiosInstance: {
      get: ReturnType<typeof vi.fn>;
      post: ReturnType<typeof vi.fn>;
      put: ReturnType<typeof vi.fn>;
      patch: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      };

      mockCreate.mockReturnValue({
        ...mockAxiosInstance,
        interceptors: mockInterceptors,
      });
    });

    describe('get method', () => {
      it('get_withValidResponse_shouldReturnData', async () => {
        const responseData = { result: 'success' };
        const apiResponse: APIResponse<typeof responseData> = {
          success: true,
          data: responseData,
        };
        
        mockAxiosInstance.get.mockResolvedValue({
          data: apiResponse,
        });

        const result = await client.get<typeof responseData>('/test');

        expect(result).toEqual(responseData);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      });

      it('get_withNoData_shouldThrowError', async () => {
        const apiResponse: APIResponse<any> = {
          success: true,
          data: null,
        };
        
        mockAxiosInstance.get.mockResolvedValue({
          data: apiResponse,
        });

        await expect(client.get('/test')).rejects.toThrow('No data received from API');
      });

      it('get_withConfig_shouldPassConfigToAxios', async () => {
        const config = { headers: { 'Custom-Header': 'value' } };
        const apiResponse: APIResponse<any> = {
          success: true,
          data: { result: 'test' },
        };
        
        mockAxiosInstance.get.mockResolvedValue({
          data: apiResponse,
        });

        await client.get('/test', config);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', config);
      });
    });

    describe('post method', () => {
      it('post_withDataAndConfig_shouldCallAxiosPost', async () => {
        const requestData = { name: 'test' };
        const responseData = { id: 1, name: 'test' };
        const config = { timeout: 5000 };
        const apiResponse: APIResponse<typeof responseData> = {
          success: true,
          data: responseData,
        };
        
        mockAxiosInstance.post.mockResolvedValue({
          data: apiResponse,
        });

        const result = await client.post('/test', requestData, config);

        expect(result).toEqual(responseData);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', requestData, config);
      });

      it('post_withNoResponseData_shouldThrowError', async () => {
        const apiResponse: APIResponse<any> = {
          success: true,
          data: undefined,
        };
        
        mockAxiosInstance.post.mockResolvedValue({
          data: apiResponse,
        });

        await expect(client.post('/test')).rejects.toThrow('No data received from API');
      });
    });

    describe('put method', () => {
      it('put_withValidRequest_shouldReturnData', async () => {
        const requestData = { name: 'updated' };
        const responseData = { id: 1, name: 'updated' };
        const apiResponse: APIResponse<typeof responseData> = {
          success: true,
          data: responseData,
        };
        
        mockAxiosInstance.put.mockResolvedValue({
          data: apiResponse,
        });

        const result = await client.put('/test/1', requestData);

        expect(result).toEqual(responseData);
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', requestData, undefined);
      });
    });

    describe('patch method', () => {
      it('patch_withValidRequest_shouldReturnData', async () => {
        const requestData = { name: 'patched' };
        const responseData = { id: 1, name: 'patched' };
        const apiResponse: APIResponse<typeof responseData> = {
          success: true,
          data: responseData,
        };
        
        mockAxiosInstance.patch.mockResolvedValue({
          data: apiResponse,
        });

        const result = await client.patch('/test/1', requestData);

        expect(result).toEqual(responseData);
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', requestData, undefined);
      });
    });

    describe('delete method', () => {
      it('delete_withValidRequest_shouldReturnData', async () => {
        const responseData = { success: true };
        const apiResponse: APIResponse<typeof responseData> = {
          success: true,
          data: responseData,
        };
        
        mockAxiosInstance.delete.mockResolvedValue({
          data: apiResponse,
        });

        const result = await client.delete('/test/1');

        expect(result).toEqual(responseData);
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      });

      it('delete_withNullData_shouldReturnUndefined', async () => {
        const apiResponse: APIResponse<any> = {
          success: true,
          data: null,
        };
        
        mockAxiosInstance.delete.mockResolvedValue({
          data: apiResponse,
        });

        const result = await client.delete('/test/1');

        expect(result).toBeNull();
      });
    });
  });

  describe('file upload', () => {
    let mockAxiosInstance: {
      post: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockAxiosInstance = {
        post: vi.fn(),
      };

      mockCreate.mockReturnValue({
        ...mockAxiosInstance,
        interceptors: mockInterceptors,
      });
    });

    it('uploadFile_withValidFile_shouldUploadWithFormData', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const responseData = { fileId: 'file-123', url: 'https://example.com/file.txt' };
      const apiResponse: APIResponse<typeof responseData> = {
        success: true,
        data: responseData,
      };
      
      mockAxiosInstance.post.mockResolvedValue({
        data: apiResponse,
      });

      const result = await client.uploadFile('/upload', file);

      expect(result).toEqual(responseData);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: expect.any(Function),
        })
      );

      // Verify FormData contains the file
      const formData = mockAxiosInstance.post.mock.calls[0][1];
      expect(formData).toBeInstanceOf(FormData);
    });

    it('uploadFile_withProgressCallback_shouldCallProgressCallback', async () => {
      const file = new File(['test content'], 'test.txt');
      const progressCallback = vi.fn();
      const apiResponse: APIResponse<any> = {
        success: true,
        data: { fileId: 'test' },
      };
      
      mockAxiosInstance.post.mockImplementation((url, data, config) => {
        // Simulate progress event
        if (config?.onUploadProgress) {
          config.onUploadProgress({
            loaded: 50,
            total: 100,
          });
        }
        return Promise.resolve({ data: apiResponse });
      });

      await client.uploadFile('/upload', file, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(50);
    });

    it('uploadFile_withoutProgressTotal_shouldNotCallProgressCallback', async () => {
      const file = new File(['test content'], 'test.txt');
      const progressCallback = vi.fn();
      const apiResponse: APIResponse<any> = {
        success: true,
        data: { fileId: 'test' },
      };
      
      mockAxiosInstance.post.mockImplementation((url, data, config) => {
        // Simulate progress event without total
        if (config?.onUploadProgress) {
          config.onUploadProgress({
            loaded: 50,
            // total is undefined
          });
        }
        return Promise.resolve({ data: apiResponse });
      });

      await client.uploadFile('/upload', file, progressCallback);

      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    let mockAxiosInstance: {
      get: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockAxiosInstance = {
        get: vi.fn(),
      };

      mockCreate.mockReturnValue({
        ...mockAxiosInstance,
        interceptors: mockInterceptors,
      });
    });

    it('getRaw_shouldReturnRawAxiosResponse', async () => {
      const rawResponse = {
        data: { raw: 'data' },
        status: 200,
        headers: {},
      };
      
      mockAxiosInstance.get.mockResolvedValue(rawResponse);

      const result = await client.getRaw('/raw-endpoint');

      expect(result).toBe(rawResponse);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/raw-endpoint', undefined);
    });

    it('createCancelToken_shouldReturnTokenAndCancelFunction', () => {
      const mockCancelFunction = vi.fn();
      mockedAxios.CancelToken.source = vi.fn().mockReturnValue({
        token: 'test-token',
        cancel: mockCancelFunction,
      });

      const { token, cancel } = client.createCancelToken();

      expect(token).toBe('test-token');
      expect(cancel).toBe(mockCancelFunction);
    });

    it('healthCheck_shouldCallHealthEndpoint', async () => {
      const healthData = { status: 'ok', timestamp: '2023-01-01T00:00:00Z' };
      
      mockAxiosInstance.get.mockResolvedValue({
        data: healthData,
      });

      const result = await client.healthCheck();

      expect(result).toEqual(healthData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
    });
  });

  describe('error edge cases', () => {
    let mockAxiosInstance: {
      get: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockAxiosInstance = {
        get: vi.fn(),
      };

      mockCreate.mockReturnValue({
        ...mockAxiosInstance,
        interceptors: mockInterceptors,
      });
    });

    it('get_withAxiosThrowingError_shouldPropagateError', async () => {
      const axiosError = new Error('Axios internal error');
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      await expect(client.get('/test')).rejects.toBe(axiosError);
    });

    it('get_withMalformedAPIResponse_shouldHandleGracefully', async () => {
      // Response without proper APIResponse structure
      mockAxiosInstance.get.mockResolvedValue({
        data: { notAnAPIResponse: true },
      });

      await expect(client.get('/test')).rejects.toThrow('No data received from API');
    });
  });

  describe('global singleton instance', () => {
    it('apiClient_shouldBeInstanceOfApiClient', () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });

    it('apiClient_shouldBeSingleton', () => {
      // Import the singleton again
      const { apiClient: apiClient2 } = require('./client');
      expect(apiClient).toBe(apiClient2);
    });
  });

  describe('notification callback management', () => {
    it('setGlobalNotificationCallback_withValidCallback_shouldSetCallback', () => {
      const testCallback = vi.fn();
      setGlobalNotificationCallback(testCallback);

      // Test that the callback is used by triggering an error
      const error: AxiosError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Test error' },
        },
        config: {
          method: 'GET',
          url: '/test',
        },
      } as any;

      const responseInterceptorCall = mockInterceptors.response.use.mock.calls[0];
      const responseErrorInterceptor = responseInterceptorCall[1];
      
      responseErrorInterceptor(error);

      expect(testCallback).toHaveBeenCalled();
    });

    it('setGlobalNotificationCallback_withNull_shouldDisableNotifications', () => {
      setGlobalNotificationCallback(null);

      const error: AxiosError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Test error' },
        },
        config: {
          method: 'GET',
          url: '/test',
        },
      } as any;

      const responseInterceptorCall = mockInterceptors.response.use.mock.calls[0];
      const responseErrorInterceptor = responseInterceptorCall[1];
      
      expect(() => responseErrorInterceptor(error)).not.toThrow();
    });
  });
});