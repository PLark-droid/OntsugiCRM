/**
 * LarkBase連携 請求書サービス
 *
 * LarkBaseの案件データをクライアント×月単位でグルーピングして
 * 請求書を生成するサービス
 */

import type { Invoice, InvoiceItem, BankAccount, ApiResponse } from '../types/index.js';
import { ProjectItemService } from './project-item.service.js';
import type { ProjectItem, ClientName } from '../config/larkbase-mapping.js';
import { FREEE_EXPORT_CONFIG } from '../config/larkbase-mapping.js';

// 請求書生成オプション
export interface InvoiceGenerationOptions {
  clientName?: ClientName;
  year: number;
  month: number;
  dueDate: Date;
  paymentTerms?: string;
  bankAccount?: BankAccount;
  notes?: string;
}

// グループ化された請求書プレビュー
export interface InvoicePreview {
  clientName: ClientName;
  invoiceMonth: string;
  items: ProjectItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
}

export class LarkBaseInvoiceService {
  private projectItemService: ProjectItemService;

  constructor(projectItemService: ProjectItemService) {
    this.projectItemService = projectItemService;
  }

  /**
   * 請求書プレビューを取得（クライアント×月単位）
   */
  async getInvoicePreviews(options?: {
    clientName?: ClientName;
    year?: number;
    month?: number;
    onlyUnInvoiced?: boolean;
  }): Promise<ApiResponse<InvoicePreview[]>> {
    const groupsResult = await this.projectItemService.getInvoiceGroups({
      clientName: options?.clientName,
      year: options?.year,
      month: options?.month,
      onlyUnInvoiced: options?.onlyUnInvoiced ?? true,
    });

    if (!groupsResult.success || !groupsResult.data) {
      return {
        success: false,
        error: groupsResult.error,
      };
    }

    const taxRate = FREEE_EXPORT_CONFIG.taxRate;

    const previews: InvoicePreview[] = groupsResult.data.map((group) => {
      const subtotal = group.totalAmount;
      const taxAmount = Math.floor(subtotal * taxRate);
      const totalAmount = subtotal + taxAmount;

      return {
        clientName: group.clientName,
        invoiceMonth: group.invoiceMonth,
        items: group.items,
        subtotal,
        taxAmount,
        totalAmount,
        itemCount: group.itemCount,
      };
    });

    return {
      success: true,
      data: previews,
    };
  }

  /**
   * 請求書を生成（クライアント×月単位）
   */
  async generateInvoice(
    clientName: ClientName,
    invoiceMonth: string,
    options: Omit<InvoiceGenerationOptions, 'clientName' | 'year' | 'month'>
  ): Promise<ApiResponse<Invoice>> {
    // 対象の案件明細を取得
    const groupsResult = await this.projectItemService.getInvoiceGroups({
      clientName,
      onlyUnInvoiced: true,
    });

    if (!groupsResult.success || !groupsResult.data) {
      return {
        success: false,
        error: groupsResult.error,
      };
    }

    // 指定月のグループを取得
    const targetGroup = groupsResult.data.find(
      (g) => g.clientName === clientName && g.invoiceMonth === invoiceMonth
    );

    if (!targetGroup) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `No uninvoiced items found for ${clientName} in ${invoiceMonth}`,
        },
      };
    }

    // 請求書明細を生成
    const taxRate = FREEE_EXPORT_CONFIG.taxRate;
    const invoiceItems: InvoiceItem[] = targetGroup.items.map((item, index) => ({
      id: `item-${index + 1}`,
      description: `${item.projectName} - ${item.contentType}`,
      quantity: item.quantity,
      unit: '件',
      unitPrice: item.unitPrice,
      amount: item.amount,
      taxable: true,
      taxCategory: '課税売上10%',
    }));

    const subtotal = targetGroup.totalAmount;
    const taxAmount = Math.floor(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount;

    // 請求書番号を生成
    const invoiceNumber = this.generateInvoiceNumber(clientName, invoiceMonth);

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      projectId: `${clientName}-${invoiceMonth}`,
      clientId: clientName,
      status: '下書き',
      issueDate: new Date(),
      dueDate: options.dueDate,
      items: invoiceItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      notes: options.notes,
      paymentTerms: options.paymentTerms || '請求書発行日より30日以内',
      bankAccount: options.bankAccount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: invoice,
    };
  }

  /**
   * 請求書を発行し、LarkBaseの請求済フラグを更新
   */
  async issueInvoice(
    clientName: ClientName,
    invoiceMonth: string,
    options: Omit<InvoiceGenerationOptions, 'clientName' | 'year' | 'month'>
  ): Promise<ApiResponse<Invoice>> {
    // 請求書を生成
    const invoiceResult = await this.generateInvoice(
      clientName,
      invoiceMonth,
      options
    );

    if (!invoiceResult.success || !invoiceResult.data) {
      return {
        success: false,
        error: invoiceResult.error,
      };
    }

    // 対象の案件明細を取得
    const groupsResult = await this.projectItemService.getInvoiceGroups({
      clientName,
      onlyUnInvoiced: true,
    });

    if (!groupsResult.success || !groupsResult.data) {
      return {
        success: false,
        error: groupsResult.error,
      };
    }

    const targetGroup = groupsResult.data.find(
      (g) => g.clientName === clientName && g.invoiceMonth === invoiceMonth
    );

    if (!targetGroup) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `No uninvoiced items found for ${clientName} in ${invoiceMonth}`,
        },
      };
    }

    // LarkBaseの請求済フラグを更新
    const invoiceDate = new Date();
    for (const item of targetGroup.items) {
      await this.projectItemService.markAsInvoiced(item.recordId, invoiceDate);
    }

    // 請求書ステータスを更新
    invoiceResult.data.status = '発行済み';
    invoiceResult.data.issueDate = invoiceDate;

    return {
      success: true,
      data: invoiceResult.data,
    };
  }

  /**
   * 請求書番号を生成
   */
  private generateInvoiceNumber(
    clientName: ClientName,
    invoiceMonth: string
  ): string {
    // クライアント名の頭文字を取得
    const clientPrefix = this.getClientPrefix(clientName);

    // 月を YYYYMM 形式に変換
    const monthMatch = invoiceMonth.match(/(\d{4})年(\d{2})月/);
    const monthStr = monthMatch ? `${monthMatch[1]}${monthMatch[2]}` : '';

    // シーケンス番号（実際にはDBから取得）
    const sequence = String(Date.now()).slice(-4);

    return `INV-${clientPrefix}-${monthStr}-${sequence}`;
  }

  /**
   * クライアント名から接頭辞を生成
   */
  private getClientPrefix(clientName: ClientName): string {
    const prefixMap: Record<string, string> = {
      '中村 香菜枝様': 'NKM',
      '株式会社ontsugi': 'ONT',
      '上野 優作様': 'UEN',
      '株式会社 マウントブラン': 'MTB',
    };
    return prefixMap[clientName] || 'OTH';
  }

  /**
   * 月次請求書一括生成
   */
  async generateMonthlyInvoices(
    year: number,
    month: number,
    options: Omit<InvoiceGenerationOptions, 'clientName' | 'year' | 'month'>
  ): Promise<ApiResponse<Invoice[]>> {
    const previewsResult = await this.getInvoicePreviews({
      year,
      month,
      onlyUnInvoiced: true,
    });

    if (!previewsResult.success || !previewsResult.data) {
      return {
        success: false,
        error: previewsResult.error,
      };
    }

    const invoices: Invoice[] = [];

    for (const preview of previewsResult.data) {
      const invoiceResult = await this.generateInvoice(
        preview.clientName,
        preview.invoiceMonth,
        options
      );

      if (invoiceResult.success && invoiceResult.data) {
        invoices.push(invoiceResult.data);
      }
    }

    return {
      success: true,
      data: invoices,
    };
  }
}

/**
 * LarkBaseInvoiceServiceのファクトリ関数
 */
export function createLarkBaseInvoiceService(
  projectItemService: ProjectItemService
): LarkBaseInvoiceService {
  return new LarkBaseInvoiceService(projectItemService);
}
