/**
 * 案件明細サービス
 *
 * LarkBase Tableと直接連携する案件明細の管理サービス
 */

import type { LarkBaseRecord, ApiResponse, PaginatedResponse } from '../types/index.js';
import { LarkBaseClient } from '../api/larkbase.js';
import {
  type ProjectItem,
  type ProjectStatus,
  type ContentType,
  type ClientName,
} from '../config/larkbase-mapping.js';

export class ProjectItemService {
  private client: LarkBaseClient;

  constructor(client: LarkBaseClient) {
    this.client = client;
  }

  /**
   * LarkBaseレコードをProjectItemに変換
   *
   * 注意: LarkBase APIはフィールド名（日本語）をキーとして返す
   */
  private recordToProjectItem(record: LarkBaseRecord): ProjectItem {
    const fields = record.fields as Record<string, unknown>;

    // 単一選択フィールドの値を取得（文字列またはオブジェクト形式に対応）
    const getSelectValue = <T extends string>(
      fieldName: string,
      defaultValue: T
    ): T => {
      const value = fields[fieldName];
      if (typeof value === 'string') {
        return value as T;
      }
      if (value && typeof value === 'object') {
        // { text: "値", id: "xxx" } 形式の場合
        if ('text' in value) {
          return (value as { text: string }).text as T;
        }
        // 配列形式の場合（複数選択）
        if (Array.isArray(value) && value.length > 0) {
          const first = value[0];
          if (typeof first === 'string') return first as T;
          if (first && typeof first === 'object' && 'text' in first) {
            return (first as { text: string }).text as T;
          }
        }
      }
      return defaultValue;
    };

    // 日付フィールドの変換
    const getDateValue = (fieldName: string): Date | undefined => {
      const value = fields[fieldName];
      if (typeof value === 'number') {
        return new Date(value);
      }
      if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!isNaN(parsed)) {
          return new Date(parsed);
        }
      }
      return undefined;
    };

    // 数値フィールドの変換（文字列の場合も考慮）
    const getNumberValue = (fieldName: string): number => {
      const value = fields[fieldName];
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        return parseFloat(value) || 0;
      }
      return 0;
    };

    return {
      recordId: record.record_id,
      projectName: String(fields['案件名'] || ''),
      contentType: getSelectValue('内容', '編集') as ContentType,
      quantity: getNumberValue('数量'),
      unitPrice: getNumberValue('単価'),
      amount: getNumberValue('金額'),
      scheduledDate: getDateValue('初稿予定日'),
      submissionDate: getDateValue('初稿提出日'),
      status: getSelectValue('案件状況', '未着手') as ProjectStatus,
      isInvoiced: Boolean(fields['請求済']),
      clientName: getSelectValue('クライアント名', '株式会社ontsugi') as ClientName,
      notes: fields['備考'] as string | undefined,
      invoiceDate: getDateValue('請求日'),
      invoiceMonth: fields['請求月'] as string | undefined,
      createdAt: record.created_time ? new Date(record.created_time) : undefined,
      updatedAt: record.last_modified_time ? new Date(record.last_modified_time) : undefined,
    };
  }

  /**
   * ProjectItemをLarkBaseフィールドに変換
   *
   * 注意: LarkBase APIはフィールド名（日本語）を使用
   */
  private projectItemToFields(
    item: Partial<ProjectItem>
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};

    if (item.projectName !== undefined) {
      fields['案件名'] = item.projectName;
    }
    if (item.contentType !== undefined) {
      fields['内容'] = item.contentType;
    }
    if (item.quantity !== undefined) {
      fields['数量'] = item.quantity;
    }
    if (item.unitPrice !== undefined) {
      fields['単価'] = item.unitPrice;
    }
    if (item.scheduledDate !== undefined) {
      fields['初稿予定日'] = item.scheduledDate.getTime();
    }
    if (item.submissionDate !== undefined) {
      fields['初稿提出日'] = item.submissionDate.getTime();
    }
    if (item.status !== undefined) {
      fields['案件状況'] = item.status;
    }
    if (item.isInvoiced !== undefined) {
      fields['請求済'] = item.isInvoiced;
    }
    if (item.clientName !== undefined) {
      fields['クライアント名'] = item.clientName;
    }
    if (item.notes !== undefined) {
      fields['備考'] = item.notes;
    }
    if (item.invoiceDate !== undefined) {
      fields['請求日'] = item.invoiceDate.getTime();
    }

    return fields;
  }

  /**
   * 案件明細一覧を取得
   */
  async list(options?: {
    pageSize?: number;
    pageToken?: string;
    clientName?: ClientName;
    status?: ProjectStatus;
    isInvoiced?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<ProjectItem>>> {
    const response = await this.client.listRecords({
      pageSize: options?.pageSize,
      pageToken: options?.pageToken,
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    let items = response.data.items.map((record) =>
      this.recordToProjectItem(record)
    );

    // フィルタリング
    if (options?.clientName) {
      items = items.filter((item) => item.clientName === options.clientName);
    }
    if (options?.status) {
      items = items.filter((item) => item.status === options.status);
    }
    if (options?.isInvoiced !== undefined) {
      items = items.filter((item) => item.isInvoiced === options.isInvoiced);
    }

    return {
      success: true,
      data: {
        items,
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
        hasMore: response.data.hasMore,
      },
    };
  }

  /**
   * 案件明細を取得
   */
  async get(recordId: string): Promise<ApiResponse<ProjectItem>> {
    const response = await this.client.getRecord(recordId);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: this.recordToProjectItem(response.data),
    };
  }

  /**
   * 案件明細を作成
   */
  async create(
    data: Omit<ProjectItem, 'recordId' | 'amount' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<ProjectItem>> {
    const fields = this.projectItemToFields(data);
    const response = await this.client.createRecord(fields);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: this.recordToProjectItem(response.data),
    };
  }

  /**
   * 案件明細を更新
   */
  async update(
    recordId: string,
    data: Partial<ProjectItem>
  ): Promise<ApiResponse<ProjectItem>> {
    const fields = this.projectItemToFields(data);
    const response = await this.client.updateRecord(recordId, fields);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: this.recordToProjectItem(response.data),
    };
  }

  /**
   * 案件明細を削除
   */
  async delete(recordId: string): Promise<ApiResponse<void>> {
    return this.client.deleteRecord(recordId);
  }

  /**
   * 請求済みフラグを更新
   */
  async markAsInvoiced(
    recordId: string,
    invoiceDate: Date
  ): Promise<ApiResponse<ProjectItem>> {
    return this.update(recordId, {
      isInvoiced: true,
      invoiceDate,
    });
  }

  /**
   * クライアント×月でグルーピングして請求書用データを取得
   */
  async getInvoiceGroups(options?: {
    clientName?: ClientName;
    year?: number;
    month?: number;
    onlyUnInvoiced?: boolean;
  }): Promise<
    ApiResponse<
      Array<{
        clientName: ClientName;
        invoiceMonth: string;
        items: ProjectItem[];
        totalAmount: number;
        itemCount: number;
      }>
    >
  > {
    const listResult = await this.list({
      pageSize: 500,
      clientName: options?.clientName,
      isInvoiced: options?.onlyUnInvoiced ? false : undefined,
    });

    if (!listResult.success || !listResult.data) {
      return {
        success: false,
        error: listResult.error,
      };
    }

    // 納品済みのみを対象
    let items = listResult.data.items.filter(
      (item) => item.status === '納品'
    );

    // 年月でフィルタリング
    if (options?.year && options?.month) {
      const targetMonth = `${options.year}年${String(options.month).padStart(2, '0')}月`;
      items = items.filter((item) => {
        if (item.invoiceMonth) {
          return item.invoiceMonth.includes(targetMonth);
        }
        if (item.invoiceDate) {
          const date = item.invoiceDate;
          return (
            date.getFullYear() === options.year &&
            date.getMonth() + 1 === options.month
          );
        }
        return false;
      });
    }

    // クライアント×月でグルーピング
    const groups = new Map<
      string,
      {
        clientName: ClientName;
        invoiceMonth: string;
        items: ProjectItem[];
      }
    >();

    for (const item of items) {
      const month = item.invoiceMonth || this.getMonthString(item.submissionDate || new Date());
      const key = `${item.clientName}|${month}`;

      if (!groups.has(key)) {
        groups.set(key, {
          clientName: item.clientName,
          invoiceMonth: month,
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }

    // 結果を配列に変換
    const result = Array.from(groups.values()).map((group) => ({
      ...group,
      totalAmount: group.items.reduce((sum, item) => sum + item.amount, 0),
      itemCount: group.items.length,
    }));

    // 月でソート（降順）
    result.sort((a, b) => b.invoiceMonth.localeCompare(a.invoiceMonth));

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 日付から月文字列を生成
   */
  private getMonthString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}年${month}月`;
  }

  /**
   * クライアント別の集計を取得
   */
  async getSummaryByClient(): Promise<
    ApiResponse<
      Array<{
        clientName: ClientName;
        totalAmount: number;
        invoicedAmount: number;
        unInvoicedAmount: number;
        itemCount: number;
      }>
    >
  > {
    const listResult = await this.list({ pageSize: 500 });

    if (!listResult.success || !listResult.data) {
      return {
        success: false,
        error: listResult.error,
      };
    }

    const summaryMap = new Map<
      ClientName,
      {
        clientName: ClientName;
        totalAmount: number;
        invoicedAmount: number;
        unInvoicedAmount: number;
        itemCount: number;
      }
    >();

    for (const item of listResult.data.items) {
      if (!summaryMap.has(item.clientName)) {
        summaryMap.set(item.clientName, {
          clientName: item.clientName,
          totalAmount: 0,
          invoicedAmount: 0,
          unInvoicedAmount: 0,
          itemCount: 0,
        });
      }

      const summary = summaryMap.get(item.clientName)!;
      summary.totalAmount += item.amount;
      summary.itemCount++;

      if (item.isInvoiced) {
        summary.invoicedAmount += item.amount;
      } else {
        summary.unInvoicedAmount += item.amount;
      }
    }

    return {
      success: true,
      data: Array.from(summaryMap.values()),
    };
  }
}

/**
 * ProjectItemServiceのファクトリ関数
 */
export function createProjectItemService(
  client: LarkBaseClient
): ProjectItemService {
  return new ProjectItemService(client);
}
