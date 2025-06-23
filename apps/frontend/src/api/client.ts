import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIResponse } from '@ai-agent-trpg/types';

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
          const errorMessage = error.response.data?.error || 
                              `HTTP ${error.response.status}: ${error.response.statusText}`;
          
          console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response.status,
            error: errorMessage,
            data: error.response.data,
          });

          // ユーザーフレンドリーなエラーメッセージを設定
          error.message = errorMessage;
        } else if (error.request) {
          // ネットワークエラー
          console.error('🌐 Network Error:', error.request);
          error.message = 'Network error. Please check your connection and try again.';
        } else {
          // その他のエラー
          console.error('⚠️ Unknown Error:', error.message);
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