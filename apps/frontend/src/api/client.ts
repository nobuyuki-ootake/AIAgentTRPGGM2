import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIResponse } from '@ai-agent-trpg/types';

// グローバル通知システム用のコールバック
let globalNotificationCallback: ((type: '404-error' | 'error', message: string, options?: { details?: string }) => void) | null = null;

// 通知システムとの連携
export const setGlobalNotificationCallback = (callback: typeof globalNotificationCallback) => {
  globalNotificationCallback = callback;
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    // Docker環境では直接バックエンドURLを使用、それ以外はViteプロキシを使用
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30秒
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        // 開発環境でのロギング
        if (import.meta.env.DEV) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            params: config.params,
          });
        }
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      },
    );

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response: AxiosResponse<APIResponse<any>>) => {
        // 開発環境でのロギング
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        // APIレスポンスの成功フラグをチェック
        if (response.data && !response.data.success) {
          throw new Error(response.data.error || 'API request failed');
        }

        return response;
      },
      (error) => {
        // エラーレスポンスの処理
        if (error.response) {
          // サーバーからのエラーレスポンス
          const status = error.response.status;
          const method = error.config?.method?.toUpperCase() || 'GET';
          const url = error.config?.url || 'Unknown URL';
          const errorMessage = error.response.data?.error || 
                              `HTTP ${status}: ${error.response.statusText}`;
          
          console.error(`❌ API Error: ${method} ${url}`, {
            status,
            error: errorMessage,
            data: error.response.data,
          });

          // 404エラーの場合は特別な通知を表示
          if (status === 404) {
            if (globalNotificationCallback) {
              const details = `Request Details:
• Method: ${method}
• URL: ${url}
• Status: ${status} ${error.response.statusText}
• Server Response: ${JSON.stringify(error.response.data, null, 2)}

This error indicates that the API endpoint is not implemented on the server.`;
              
              globalNotificationCallback('404-error', `${method} ${url}`, { details });
            }
          }
          // その他のエラーも通知
          else if (status >= 500) {
            if (globalNotificationCallback) {
              globalNotificationCallback('error', `Server Error (${status}): ${errorMessage}`, {
                details: `Request: ${method} ${url}\nStatus: ${status}\nResponse: ${JSON.stringify(error.response.data, null, 2)}`
              });
            }
          }

          // ユーザーフレンドリーなエラーメッセージを設定
          error.message = errorMessage;
        } else if (error.request) {
          // ネットワークエラー
          console.error('🌐 Network Error:', error.request);
          error.message = 'Network error. Please check your connection and try again.';
          
          if (globalNotificationCallback) {
            globalNotificationCallback('error', 'Network connection failed', {
              details: 'Unable to connect to the server. Please check your internet connection and try again.'
            });
          }
        } else {
          // その他のエラー
          console.error('⚠️ Unknown Error:', error.message);
          
          if (globalNotificationCallback) {
            globalNotificationCallback('error', 'Unexpected error occurred', {
              details: error.message
            });
          }
        }

        return Promise.reject(error);
      },
    );
  }

  // GET リクエスト
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<APIResponse<T>>(url, config);
    if (!response.data.data) {
      throw new Error('No data received from API');
    }
    return response.data.data;
  }

  // POST リクエスト
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<APIResponse<T>>(url, data, config);
    if (!response.data.data) {
      throw new Error('No data received from API');
    }
    return response.data.data;
  }

  // PUT リクエスト
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<APIResponse<T>>(url, data, config);
    if (!response.data.data) {
      throw new Error('No data received from API');
    }
    return response.data.data;
  }

  // PATCH リクエスト
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<APIResponse<T>>(url, data, config);
    if (!response.data.data) {
      throw new Error('No data received from API');
    }
    return response.data.data;
  }

  // DELETE リクエスト
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<APIResponse<T>>(url, config);
    return response.data.data!;
  }

  // ファイルアップロード用
  async uploadFile<T>(url: string, file: File, progressCallback?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressCallback && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          progressCallback(progress);
        }
      },
    };

    const response = await this.client.post<APIResponse<T>>(url, formData, config);
    return response.data.data!;
  }

  // Raw レスポンス取得（APIResponseラッパーなし）
  async getRaw<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  // リクエストキャンセル用のトークン作成
  createCancelToken(): { token: any; cancel: (reason?: string) => void } {
    const source = axios.CancelToken.source();
    return {
      token: source.token,
      cancel: source.cancel,
    };
  }

  // ヘルスチェック
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();