/**
 * 案件管理サービス
 *
 * LarkBaseの案件データを管理するサービス
 */

import type { Project, ProjectStatus, ApiResponse, PaginatedResponse, LarkBaseRecord } from '../types/index.js';
import { LarkBaseClient } from '../api/larkbase.js';

// LarkBaseフィールドマッピング
const FIELD_MAPPING = {
  projectNumber: '案件番号',
  name: '案件名',
  clientId: '顧客ID',
  clientName: '顧客名',
  status: 'ステータス',
  description: '説明',
  startDate: '開始日',
  endDate: '終了日',
  totalAmount: '合計金額',
  createdAt: '作成日時',
  updatedAt: '更新日時',
} as const;

export class ProjectService {
  private client: LarkBaseClient;

  constructor(client: LarkBaseClient) {
    this.client = client;
  }

  /**
   * LarkBaseレコードをProjectオブジェクトに変換
   */
  private recordToProject(record: LarkBaseRecord): Project {
    const fields = record.fields as Record<string, unknown>;

    return {
      id: record.record_id,
      projectNumber: String(fields[FIELD_MAPPING.projectNumber] || ''),
      name: String(fields[FIELD_MAPPING.name] || ''),
      clientId: String(fields[FIELD_MAPPING.clientId] || ''),
      clientName: String(fields[FIELD_MAPPING.clientName] || ''),
      status: (fields[FIELD_MAPPING.status] as ProjectStatus) || '見込み',
      description: fields[FIELD_MAPPING.description] as string | undefined,
      startDate: fields[FIELD_MAPPING.startDate]
        ? new Date(fields[FIELD_MAPPING.startDate] as number)
        : undefined,
      endDate: fields[FIELD_MAPPING.endDate]
        ? new Date(fields[FIELD_MAPPING.endDate] as number)
        : undefined,
      totalAmount: Number(fields[FIELD_MAPPING.totalAmount]) || 0,
      createdAt: new Date(record.created_time || Date.now()),
      updatedAt: new Date(record.last_modified_time || Date.now()),
    };
  }

  /**
   * ProjectオブジェクトをLarkBaseフィールドに変換
   */
  private projectToFields(project: Partial<Project>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};

    if (project.projectNumber !== undefined) {
      fields[FIELD_MAPPING.projectNumber] = project.projectNumber;
    }
    if (project.name !== undefined) {
      fields[FIELD_MAPPING.name] = project.name;
    }
    if (project.clientId !== undefined) {
      fields[FIELD_MAPPING.clientId] = project.clientId;
    }
    if (project.clientName !== undefined) {
      fields[FIELD_MAPPING.clientName] = project.clientName;
    }
    if (project.status !== undefined) {
      fields[FIELD_MAPPING.status] = project.status;
    }
    if (project.description !== undefined) {
      fields[FIELD_MAPPING.description] = project.description;
    }
    if (project.startDate !== undefined) {
      fields[FIELD_MAPPING.startDate] = project.startDate.getTime();
    }
    if (project.endDate !== undefined) {
      fields[FIELD_MAPPING.endDate] = project.endDate.getTime();
    }
    if (project.totalAmount !== undefined) {
      fields[FIELD_MAPPING.totalAmount] = project.totalAmount;
    }

    return fields;
  }

  /**
   * 案件一覧を取得
   */
  async list(options?: {
    pageSize?: number;
    pageToken?: string;
    status?: ProjectStatus;
  }): Promise<ApiResponse<PaginatedResponse<Project>>> {
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

    let projects = response.data.items.map((record) => this.recordToProject(record));

    // ステータスでフィルタリング
    if (options?.status) {
      projects = projects.filter((p) => p.status === options.status);
    }

    return {
      success: true,
      data: {
        items: projects,
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
        hasMore: response.data.hasMore,
      },
    };
  }

  /**
   * 案件を取得
   */
  async get(id: string): Promise<ApiResponse<Project>> {
    const response = await this.client.getRecord(id);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: this.recordToProject(response.data),
    };
  }

  /**
   * 案件を作成
   */
  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Project>> {
    const fields = this.projectToFields(data);
    const response = await this.client.createRecord(fields);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: this.recordToProject(response.data),
    };
  }

  /**
   * 案件を更新
   */
  async update(id: string, data: Partial<Project>): Promise<ApiResponse<Project>> {
    const fields = this.projectToFields(data);
    const response = await this.client.updateRecord(id, fields);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: this.recordToProject(response.data),
    };
  }

  /**
   * 案件を削除
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.deleteRecord(id);
  }

  /**
   * 案件番号を生成
   */
  generateProjectNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PRJ-${year}${month}-${random}`;
  }

  /**
   * ステータス別の案件数を取得
   */
  async getStatusSummary(): Promise<ApiResponse<Record<ProjectStatus, number>>> {
    const response = await this.list({ pageSize: 500 });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    const summary: Record<ProjectStatus, number> = {
      '見込み': 0,
      '商談中': 0,
      '受注': 0,
      '進行中': 0,
      '完了': 0,
      '失注': 0,
      'キャンセル': 0,
    };

    for (const project of response.data.items) {
      summary[project.status]++;
    }

    return {
      success: true,
      data: summary,
    };
  }
}

/**
 * ProjectServiceのファクトリ関数
 */
export function createProjectService(client: LarkBaseClient): ProjectService {
  return new ProjectService(client);
}
