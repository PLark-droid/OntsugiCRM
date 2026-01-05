/**
 * freee会計 CSVエクスポートサービス
 *
 * 請求書データをfreee会計インポート用のCSVフォーマットに変換
 */

import type { Invoice, FreeeJournalEntry, FreeeExportOptions, ApiResponse } from '../types/index.js';

// freee会計 仕訳インポートCSVのヘッダー
const FREEE_CSV_HEADERS = [
  '取引日',
  '借方勘定科目',
  '借方補助科目',
  '借方部門',
  '借方金額',
  '借方税区分',
  '貸方勘定科目',
  '貸方補助科目',
  '貸方部門',
  '貸方金額',
  '貸方税区分',
  '摘要',
  'タグ',
] as const;

// 税区分マッピング（将来の拡張用）
const _TAX_CATEGORY_MAP: Record<string, string> = {
  '課税売上10%': '課売上10%',
  '課税売上8%（軽減税率）': '課売上8%(軽)',
  '非課税売上': '非売上',
  '不課税売上': '対象外',
};

export class FreeeExportService {
  /**
   * 請求書を仕訳データに変換
   */
  private invoiceToJournalEntries(invoice: Invoice): FreeeJournalEntry[] {
    const entries: FreeeJournalEntry[] = [];
    const issueDate = this.formatDate(invoice.issueDate);

    // 売掛金計上仕訳（発行時）
    if (invoice.status !== '下書き') {
      // 課税売上
      const taxableAmount = invoice.items
        .filter((item) => item.taxable)
        .reduce((sum, item) => sum + item.amount, 0);

      if (taxableAmount > 0) {
        entries.push({
          取引日: issueDate,
          借方勘定科目: '売掛金',
          借方補助科目: '',
          借方部門: '',
          借方金額: taxableAmount + invoice.taxAmount,
          借方税区分: '対象外',
          貸方勘定科目: '売上高',
          貸方補助科目: '',
          貸方部門: '',
          貸方金額: taxableAmount,
          貸方税区分: '課売上10%',
          摘要: `${invoice.invoiceNumber} 売上計上`,
          タグ: invoice.projectId,
        });

        // 消費税
        if (invoice.taxAmount > 0) {
          entries.push({
            取引日: issueDate,
            借方勘定科目: '売掛金',
            借方補助科目: '',
            借方部門: '',
            借方金額: 0,
            借方税区分: '対象外',
            貸方勘定科目: '仮受消費税',
            貸方補助科目: '',
            貸方部門: '',
            貸方金額: invoice.taxAmount,
            貸方税区分: '対象外',
            摘要: `${invoice.invoiceNumber} 消費税`,
            タグ: invoice.projectId,
          });
        }
      }

      // 非課税売上
      const nonTaxableAmount = invoice.items
        .filter((item) => !item.taxable)
        .reduce((sum, item) => sum + item.amount, 0);

      if (nonTaxableAmount > 0) {
        entries.push({
          取引日: issueDate,
          借方勘定科目: '売掛金',
          借方補助科目: '',
          借方部門: '',
          借方金額: nonTaxableAmount,
          借方税区分: '対象外',
          貸方勘定科目: '売上高',
          貸方補助科目: '',
          貸方部門: '',
          貸方金額: nonTaxableAmount,
          貸方税区分: '非売上',
          摘要: `${invoice.invoiceNumber} 売上計上（非課税）`,
          タグ: invoice.projectId,
        });
      }
    }

    // 入金仕訳（入金があった場合）
    if (invoice.paidAmount > 0) {
      entries.push({
        取引日: this.formatDate(invoice.updatedAt),
        借方勘定科目: '普通預金',
        借方補助科目: '',
        借方部門: '',
        借方金額: invoice.paidAmount,
        借方税区分: '対象外',
        貸方勘定科目: '売掛金',
        貸方補助科目: '',
        貸方部門: '',
        貸方金額: invoice.paidAmount,
        貸方税区分: '対象外',
        摘要: `${invoice.invoiceNumber} 入金`,
        タグ: invoice.projectId,
      });
    }

    return entries;
  }

  /**
   * 仕訳データをCSV行に変換
   */
  private journalEntryToRow(entry: FreeeJournalEntry): string[] {
    return [
      entry.取引日,
      entry.借方勘定科目,
      entry.借方補助科目 || '',
      entry.借方部門 || '',
      String(entry.借方金額),
      entry.借方税区分,
      entry.貸方勘定科目,
      entry.貸方補助科目 || '',
      entry.貸方部門 || '',
      String(entry.貸方金額),
      entry.貸方税区分,
      entry.摘要,
      entry.タグ || '',
    ];
  }

  /**
   * 日付をYYYY-MM-DD形式にフォーマット
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * CSVエスケープ
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * 複数の請求書をfreee形式CSVにエクスポート
   */
  async exportToCSV(
    invoices: Invoice[],
    options?: Partial<FreeeExportOptions>
  ): Promise<ApiResponse<string>> {
    try {
      const startDate = options?.startDate;
      const endDate = options?.endDate;
      const includeUnpaid = options?.includeUnpaid ?? true;

      // フィルタリング
      let filteredInvoices = invoices;

      if (startDate) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.issueDate >= startDate
        );
      }
      if (endDate) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.issueDate <= endDate
        );
      }
      if (!includeUnpaid) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.status === '入金済み' || inv.status === '過払い'
        );
      }

      // 仕訳データに変換
      const allEntries: FreeeJournalEntry[] = [];
      for (const invoice of filteredInvoices) {
        const entries = this.invoiceToJournalEntries(invoice);
        allEntries.push(...entries);
      }

      // 取引日でソート
      allEntries.sort((a, b) => a.取引日.localeCompare(b.取引日));

      // CSV生成
      const rows: string[][] = [
        FREEE_CSV_HEADERS as unknown as string[],
        ...allEntries.map((entry) => this.journalEntryToRow(entry)),
      ];

      const csv = rows
        .map((row) => row.map((cell) => this.escapeCSV(cell)).join(','))
        .join('\n');

      return {
        success: true,
        data: csv,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * CSVをファイルに保存（Node.js環境用）
   */
  async saveToFile(
    invoices: Invoice[],
    filePath: string,
    options?: Partial<FreeeExportOptions>
  ): Promise<ApiResponse<void>> {
    const result = await this.exportToCSV(invoices, options);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
      };
    }

    try {
      const { writeFile } = await import('fs/promises');
      const encoding = options?.encoding || 'utf-8';

      if (encoding === 'shift-jis') {
        // Shift-JIS変換が必要な場合は別途iconvなどのライブラリが必要
        // ここではUTF-8で出力
        await writeFile(filePath, '\uFEFF' + result.data, 'utf-8');
      } else {
        await writeFile(filePath, '\uFEFF' + result.data, 'utf-8');
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_WRITE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * エクスポートのプレビュー（最初の10件）
   */
  async preview(
    invoices: Invoice[],
    _options?: Partial<FreeeExportOptions>
  ): Promise<ApiResponse<FreeeJournalEntry[]>> {
    try {
      const allEntries: FreeeJournalEntry[] = [];

      for (const invoice of invoices.slice(0, 10)) {
        const entries = this.invoiceToJournalEntries(invoice);
        allEntries.push(...entries);
      }

      return {
        success: true,
        data: allEntries,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * 月次エクスポート
   */
  async exportMonthly(
    invoices: Invoice[],
    year: number,
    month: number
  ): Promise<ApiResponse<string>> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return this.exportToCSV(invoices, { startDate, endDate });
  }
}

/**
 * FreeeExportServiceのシングルトンインスタンス
 */
let freeeExportServiceInstance: FreeeExportService | null = null;

export function getFreeeExportService(): FreeeExportService {
  if (!freeeExportServiceInstance) {
    freeeExportServiceInstance = new FreeeExportService();
  }
  return freeeExportServiceInstance;
}
