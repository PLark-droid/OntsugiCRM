/**
 * 請求書管理サービス
 */

import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  BankAccount,
  Quote,
  ApiResponse,
  PaginatedResponse,
} from '../types/index.js';

// インメモリストレージ（本番環境ではLarkBaseまたはDBに置き換え）
const invoices = new Map<string, Invoice>();

// デフォルトの振込先口座
const DEFAULT_BANK_ACCOUNT: BankAccount = {
  bankName: '',
  branchName: '',
  accountType: '普通',
  accountNumber: '',
  accountHolder: '',
};

export class InvoiceService {
  /**
   * 請求書一覧を取得
   */
  async list(options?: {
    projectId?: string;
    clientId?: string;
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Invoice>>> {
    let items = Array.from(invoices.values());

    // フィルタリング
    if (options?.projectId) {
      items = items.filter((inv) => inv.projectId === options.projectId);
    }
    if (options?.clientId) {
      items = items.filter((inv) => inv.clientId === options.clientId);
    }
    if (options?.status) {
      items = items.filter((inv) => inv.status === options.status);
    }
    if (options?.startDate) {
      items = items.filter((inv) => inv.issueDate >= options.startDate!);
    }
    if (options?.endDate) {
      items = items.filter((inv) => inv.issueDate <= options.endDate!);
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
   * 請求書を取得
   */
  async get(id: string): Promise<ApiResponse<Invoice>> {
    const invoice = invoices.get(id);

    if (!invoice) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Invoice ${id} not found`,
        },
      };
    }

    return {
      success: true,
      data: invoice,
    };
  }

  /**
   * 請求書を作成
   */
  async create(data: {
    projectId: string;
    clientId: string;
    quoteId?: string;
    dueDate: Date;
    items: Omit<InvoiceItem, 'id' | 'amount'>[];
    notes?: string;
    paymentTerms?: string;
    bankAccount?: BankAccount;
    taxRate?: number;
  }): Promise<ApiResponse<Invoice>> {
    const id = this.generateId();
    const invoiceNumber = this.generateInvoiceNumber();
    const taxRate = data.taxRate ?? 0.1;

    // 明細の金額を計算
    const items: InvoiceItem[] = data.items.map((item, index) => ({
      id: `${id}-item-${index + 1}`,
      ...item,
      amount: item.quantity * item.unitPrice,
    }));

    // 小計・消費税・合計を計算
    const taxableAmount = items
      .filter((item) => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const nonTaxableAmount = items
      .filter((item) => !item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.floor(taxableAmount * taxRate);
    const totalAmount = taxableAmount + taxAmount + nonTaxableAmount;

    const invoice: Invoice = {
      id,
      invoiceNumber,
      projectId: data.projectId,
      quoteId: data.quoteId,
      clientId: data.clientId,
      status: '下書き',
      issueDate: new Date(),
      dueDate: data.dueDate,
      items,
      subtotal: taxableAmount + nonTaxableAmount,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      notes: data.notes,
      paymentTerms: data.paymentTerms || '請求書発行日より30日以内',
      bankAccount: data.bankAccount || DEFAULT_BANK_ACCOUNT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    invoices.set(id, invoice);

    return {
      success: true,
      data: invoice,
    };
  }

  /**
   * 見積から請求書を作成
   */
  async createFromQuote(
    quote: Quote,
    options: {
      dueDate: Date;
      paymentTerms?: string;
      bankAccount?: BankAccount;
    }
  ): Promise<ApiResponse<Invoice>> {
    const items: Omit<InvoiceItem, 'id' | 'amount'>[] = quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxable: item.taxable,
      taxCategory: item.taxable ? '課税売上10%' : '非課税売上',
    }));

    return this.create({
      projectId: quote.projectId,
      clientId: quote.clientId,
      quoteId: quote.id,
      dueDate: options.dueDate,
      items,
      notes: quote.notes,
      paymentTerms: options.paymentTerms,
      bankAccount: options.bankAccount,
      taxRate: quote.taxRate,
    });
  }

  /**
   * 請求書を更新
   */
  async update(id: string, data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    const invoice = invoices.get(id);

    if (!invoice) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Invoice ${id} not found`,
        },
      };
    }

    // 明細が更新された場合は金額を再計算
    let items = data.items || invoice.items;
    if (data.items) {
      items = data.items.map((item) => ({
        ...item,
        amount: item.quantity * item.unitPrice,
      }));
    }

    const taxRate = data.taxRate ?? invoice.taxRate;
    const taxableAmount = items
      .filter((item) => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const nonTaxableAmount = items
      .filter((item) => !item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.floor(taxableAmount * taxRate);
    const totalAmount = taxableAmount + taxAmount + nonTaxableAmount;

    const updated: Invoice = {
      ...invoice,
      ...data,
      items,
      subtotal: taxableAmount + nonTaxableAmount,
      taxRate,
      taxAmount,
      totalAmount,
      updatedAt: new Date(),
    };

    invoices.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * 請求書を削除
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    if (!invoices.has(id)) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Invoice ${id} not found`,
        },
      };
    }

    invoices.delete(id);

    return {
      success: true,
    };
  }

  /**
   * 請求書ステータスを更新
   */
  async updateStatus(id: string, status: InvoiceStatus): Promise<ApiResponse<Invoice>> {
    return this.update(id, { status });
  }

  /**
   * 入金を記録
   */
  async recordPayment(id: string, amount: number): Promise<ApiResponse<Invoice>> {
    const invoice = invoices.get(id);

    if (!invoice) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Invoice ${id} not found`,
        },
      };
    }

    const paidAmount = invoice.paidAmount + amount;
    let status: InvoiceStatus = invoice.status;

    if (paidAmount >= invoice.totalAmount) {
      status = paidAmount > invoice.totalAmount ? '過払い' : '入金済み';
    } else if (paidAmount > 0) {
      status = '一部入金';
    }

    return this.update(id, { paidAmount, status });
  }

  /**
   * 未入金の請求書を取得
   */
  async getUnpaid(): Promise<ApiResponse<Invoice[]>> {
    const unpaidStatuses: InvoiceStatus[] = ['発行済み', '送付済み', '一部入金'];
    const items = Array.from(invoices.values())
      .filter((inv) => unpaidStatuses.includes(inv.status))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      success: true,
      data: items,
    };
  }

  /**
   * 支払期日を過ぎた請求書を取得
   */
  async getOverdue(): Promise<ApiResponse<Invoice[]>> {
    const now = new Date();
    const unpaidStatuses: InvoiceStatus[] = ['発行済み', '送付済み', '一部入金'];
    const items = Array.from(invoices.values())
      .filter((inv) => unpaidStatuses.includes(inv.status) && inv.dueDate < now)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      success: true,
      data: items,
    };
  }

  /**
   * 月次売上サマリーを取得
   */
  async getMonthlySummary(year: number, month: number): Promise<ApiResponse<{
    totalInvoiced: number;
    totalPaid: number;
    totalUnpaid: number;
    invoiceCount: number;
  }>> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const items = Array.from(invoices.values())
      .filter((inv) => inv.issueDate >= startDate && inv.issueDate <= endDate);

    const totalInvoiced = items.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = items.reduce((sum, inv) => sum + inv.paidAmount, 0);

    return {
      success: true,
      data: {
        totalInvoiced,
        totalPaid,
        totalUnpaid: totalInvoiced - totalPaid,
        invoiceCount: items.length,
      },
    };
  }

  /**
   * IDを生成
   */
  private generateId(): string {
    return `invoice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 請求書番号を生成
   */
  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequence = String(invoices.size + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }
}

/**
 * InvoiceServiceのシングルトンインスタンス
 */
let invoiceServiceInstance: InvoiceService | null = null;

export function getInvoiceService(): InvoiceService {
  if (!invoiceServiceInstance) {
    invoiceServiceInstance = new InvoiceService();
  }
  return invoiceServiceInstance;
}
