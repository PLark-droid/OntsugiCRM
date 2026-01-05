/**
 * 見積管理サービス
 */

import type {
  Quote,
  QuoteItem,
  QuoteStatus,
  ApiResponse,
  PaginatedResponse,
} from '../types/index.js';

// インメモリストレージ（本番環境ではLarkBaseまたはDBに置き換え）
const quotes = new Map<string, Quote>();

export class QuoteService {
  /**
   * 見積一覧を取得
   */
  async list(options?: {
    projectId?: string;
    clientId?: string;
    status?: QuoteStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Quote>>> {
    let items = Array.from(quotes.values());

    // フィルタリング
    if (options?.projectId) {
      items = items.filter((q) => q.projectId === options.projectId);
    }
    if (options?.clientId) {
      items = items.filter((q) => q.clientId === options.clientId);
    }
    if (options?.status) {
      items = items.filter((q) => q.status === options.status);
    }

    // ソート（発行日降順）
    items.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());

    // ページネーション
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    return {
      success: true,
      data: {
        items: paginatedItems,
        total: items.length,
        page,
        pageSize,
        hasMore: start + pageSize < items.length,
      },
    };
  }

  /**
   * 見積を取得
   */
  async get(id: string): Promise<ApiResponse<Quote>> {
    const quote = quotes.get(id);

    if (!quote) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Quote ${id} not found`,
        },
      };
    }

    return {
      success: true,
      data: quote,
    };
  }

  /**
   * 見積を作成
   */
  async create(data: {
    projectId: string;
    clientId: string;
    validUntil: Date;
    items: Omit<QuoteItem, 'id' | 'amount'>[];
    notes?: string;
    taxRate?: number;
  }): Promise<ApiResponse<Quote>> {
    const id = this.generateId();
    const quoteNumber = this.generateQuoteNumber();
    const taxRate = data.taxRate ?? 0.1;

    // 明細の金額を計算
    const items: QuoteItem[] = data.items.map((item, index) => ({
      id: `${id}-item-${index + 1}`,
      ...item,
      amount: item.quantity * item.unitPrice,
    }));

    // 小計・消費税・合計を計算
    const subtotal = items
      .filter((item) => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const nonTaxableAmount = items
      .filter((item) => !item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.floor(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount + nonTaxableAmount;

    const quote: Quote = {
      id,
      quoteNumber,
      projectId: data.projectId,
      clientId: data.clientId,
      status: '下書き',
      issueDate: new Date(),
      validUntil: data.validUntil,
      items,
      subtotal: subtotal + nonTaxableAmount,
      taxRate,
      taxAmount,
      totalAmount,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    quotes.set(id, quote);

    return {
      success: true,
      data: quote,
    };
  }

  /**
   * 見積を更新
   */
  async update(id: string, data: Partial<Quote>): Promise<ApiResponse<Quote>> {
    const quote = quotes.get(id);

    if (!quote) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Quote ${id} not found`,
        },
      };
    }

    // 明細が更新された場合は金額を再計算
    let items = data.items || quote.items;
    if (data.items) {
      items = data.items.map((item) => ({
        ...item,
        amount: item.quantity * item.unitPrice,
      }));
    }

    const taxRate = data.taxRate ?? quote.taxRate;
    const subtotal = items
      .filter((item) => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const nonTaxableAmount = items
      .filter((item) => !item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.floor(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount + nonTaxableAmount;

    const updated: Quote = {
      ...quote,
      ...data,
      items,
      subtotal: subtotal + nonTaxableAmount,
      taxRate,
      taxAmount,
      totalAmount,
      updatedAt: new Date(),
    };

    quotes.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * 見積を削除
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    if (!quotes.has(id)) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Quote ${id} not found`,
        },
      };
    }

    quotes.delete(id);

    return {
      success: true,
    };
  }

  /**
   * 見積ステータスを更新
   */
  async updateStatus(id: string, status: QuoteStatus): Promise<ApiResponse<Quote>> {
    return this.update(id, { status });
  }

  /**
   * 見積を複製
   */
  async duplicate(id: string): Promise<ApiResponse<Quote>> {
    const original = quotes.get(id);

    if (!original) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Quote ${id} not found`,
        },
      };
    }

    const newId = this.generateId();
    const newQuoteNumber = this.generateQuoteNumber();

    const duplicate: Quote = {
      ...original,
      id: newId,
      quoteNumber: newQuoteNumber,
      status: '下書き',
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      items: original.items.map((item, index) => ({
        ...item,
        id: `${newId}-item-${index + 1}`,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    quotes.set(newId, duplicate);

    return {
      success: true,
      data: duplicate,
    };
  }

  /**
   * IDを生成
   */
  private generateId(): string {
    return `quote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 見積番号を生成
   */
  private generateQuoteNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequence = String(quotes.size + 1).padStart(4, '0');
    return `Q-${year}${month}-${sequence}`;
  }
}

/**
 * QuoteServiceのシングルトンインスタンス
 */
let quoteServiceInstance: QuoteService | null = null;

export function getQuoteService(): QuoteService {
  if (!quoteServiceInstance) {
    quoteServiceInstance = new QuoteService();
  }
  return quoteServiceInstance;
}
