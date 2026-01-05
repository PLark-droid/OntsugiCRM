/**
 * LarkBase API クライアント
 *
 * Lark/Feishu Base APIとの連携を管理
 */

import type { LarkBaseConfig, LarkBaseRecord, ApiResponse, PaginatedResponse } from '../types/index.js';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

interface TokenResponse {
  tenant_access_token: string;
  expire: number;
}

interface LarkApiResponse<T = unknown> {
  code: number;
  msg?: string;
  data?: T;
}

export class LarkBaseClient {
  private config: LarkBaseConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private apiBase: string;

  constructor(config: LarkBaseConfig, region: 'global' | 'china' = 'global') {
    this.config = config;
    this.apiBase = region === 'china' ? FEISHU_API_BASE : LARK_API_BASE;
  }

  /**
   * アクセストークンを取得（キャッシュ付き）
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.accessToken && this.tokenExpiry > now + 60000) {
      return this.accessToken;
    }

    const response = await fetch(`${this.apiBase}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data = await response.json() as TokenResponse;
    this.accessToken = data.tenant_access_token;
    this.tokenExpiry = now + (data.expire * 1000);

    return this.accessToken;
  }

  /**
   * API リクエストを実行
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json() as LarkApiResponse<T>;

      if (data.code !== 0) {
        return {
          success: false,
          error: {
            code: String(data.code),
            message: data.msg || 'Unknown error',
          },
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * テーブルのレコード一覧を取得
   */
  async listRecords(options?: {
    pageSize?: number;
    pageToken?: string;
    filter?: string;
    sort?: Array<{ field_name: string; desc: boolean }>;
  }): Promise<ApiResponse<PaginatedResponse<LarkBaseRecord>>> {
    const { baseId, tableId } = this.config;
    const params = new URLSearchParams();

    if (options?.pageSize) {
      params.set('page_size', String(options.pageSize));
    }
    if (options?.pageToken) {
      params.set('page_token', options.pageToken);
    }

    const queryString = params.toString();
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<{
      items: LarkBaseRecord[];
      total: number;
      has_more: boolean;
      page_token?: string;
    }>('GET', endpoint);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: {
        items: response.data.items,
        total: response.data.total,
        page: 1,
        pageSize: options?.pageSize || 20,
        hasMore: response.data.has_more,
      },
    };
  }

  /**
   * レコードを取得
   */
  async getRecord(recordId: string): Promise<ApiResponse<LarkBaseRecord>> {
    const { baseId, tableId } = this.config;
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records/${recordId}`;

    return this.request<LarkBaseRecord>('GET', endpoint);
  }

  /**
   * レコードを作成
   */
  async createRecord(fields: Record<string, unknown>): Promise<ApiResponse<LarkBaseRecord>> {
    const { baseId, tableId } = this.config;
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records`;

    return this.request<LarkBaseRecord>('POST', endpoint, { fields });
  }

  /**
   * レコードを更新
   */
  async updateRecord(
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<ApiResponse<LarkBaseRecord>> {
    const { baseId, tableId } = this.config;
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records/${recordId}`;

    return this.request<LarkBaseRecord>('PUT', endpoint, { fields });
  }

  /**
   * レコードを削除
   */
  async deleteRecord(recordId: string): Promise<ApiResponse<void>> {
    const { baseId, tableId } = this.config;
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records/${recordId}`;

    return this.request<void>('DELETE', endpoint);
  }

  /**
   * 複数レコードを一括作成
   */
  async batchCreateRecords(
    records: Array<{ fields: Record<string, unknown> }>
  ): Promise<ApiResponse<LarkBaseRecord[]>> {
    const { baseId, tableId } = this.config;
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records/batch_create`;

    return this.request<LarkBaseRecord[]>('POST', endpoint, { records });
  }

  /**
   * 複数レコードを一括更新
   */
  async batchUpdateRecords(
    records: Array<{ record_id: string; fields: Record<string, unknown> }>
  ): Promise<ApiResponse<LarkBaseRecord[]>> {
    const { baseId, tableId } = this.config;
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records/batch_update`;

    return this.request<LarkBaseRecord[]>('POST', endpoint, { records });
  }

  /**
   * 複数レコードを一括削除
   */
  async batchDeleteRecords(recordIds: string[]): Promise<ApiResponse<void>> {
    const { baseId, tableId } = this.config;
    const endpoint = `/bitable/v1/apps/${baseId}/tables/${tableId}/records/batch_delete`;

    return this.request<void>('POST', endpoint, { records: recordIds });
  }
}

/**
 * LarkBase クライアントのシングルトンインスタンスを作成
 */
export function createLarkBaseClient(config: LarkBaseConfig, region?: 'global' | 'china'): LarkBaseClient {
  return new LarkBaseClient(config, region);
}
