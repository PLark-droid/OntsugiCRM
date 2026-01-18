/**
 * PDF生成ユーティリティのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  generateQuoteHTML,
  generateInvoiceHTML,
  generatePDF,
  generateQuotePDF,
  generateInvoicePDF,
} from '../src/utils/pdf-generator.js';
import type { Quote, Invoice, Client } from '../src/types/index.js';
import type { CompanyInfo } from '../src/utils/pdf-generator.js';

describe('PDF Generator', () => {
  const mockCompany: CompanyInfo = {
    name: '株式会社ontsugi',
    address: '東京都渋谷区1-1-1',
    postalCode: '150-0001',
    phone: '03-1234-5678',
    email: 'info@ontsugi.com',
    taxId: 'T1234567890123',
  };

  const mockClient: Client = {
    id: 'client-1',
    name: 'テスト太郎',
    companyName: '株式会社テスト',
    email: 'test@example.com',
    address: '東京都新宿区2-2-2',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockQuote: Quote = {
    id: 'quote-1',
    quoteNumber: 'Q-2026-001',
    clientId: 'client-1',
    projectId: 'project-1',
    status: '下書き',
    items: [
      {
        id: 'item-1',
        description: 'YouTube動画編集',
        quantity: 5,
        unit: '本',
        unitPrice: 35000,
        amount: 175000,
        taxable: true,
      },
      {
        id: 'item-2',
        description: 'サムネイル制作',
        quantity: 5,
        unit: '枚',
        unitPrice: 5000,
        amount: 25000,
        taxable: true,
      },
    ],
    subtotal: 200000,
    taxRate: 0.1,
    taxAmount: 20000,
    totalAmount: 220000,
    issueDate: new Date('2026-01-15'),
    validUntil: new Date('2026-02-14'),
    notes: 'テスト備考',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  };

  const mockInvoice: Invoice = {
    id: 'invoice-1',
    invoiceNumber: 'INV-2026-001',
    clientId: 'client-1',
    projectId: 'project-1',
    quoteId: 'quote-1',
    status: '下書き',
    items: [
      {
        id: 'item-1',
        description: 'YouTube動画編集',
        quantity: 5,
        unit: '本',
        unitPrice: 35000,
        amount: 175000,
        taxable: true,
        taxCategory: '課税売上10%',
      },
    ],
    subtotal: 175000,
    taxRate: 0.1,
    taxAmount: 17500,
    totalAmount: 192500,
    issueDate: new Date('2026-01-20'),
    dueDate: new Date('2026-02-28'),
    paidAmount: 0,
    bankAccount: {
      bankName: 'みずほ銀行',
      branchName: '渋谷支店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolder: 'カ）オンツギ',
    },
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-20'),
  };

  describe('formatCurrency', () => {
    it('金額を日本円形式でフォーマットする', () => {
      expect(formatCurrency(1000)).toBe('￥1,000');
      expect(formatCurrency(0)).toBe('￥0');
      expect(formatCurrency(1234567)).toBe('￥1,234,567');
    });
  });

  describe('formatDate', () => {
    it('日付を日本語形式でフォーマットする', () => {
      const date = new Date('2026-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('1');
      expect(formatted).toContain('15');
    });
  });

  describe('generateQuoteHTML', () => {
    it('見積書のHTMLを生成する', () => {
      const html = generateQuoteHTML(mockQuote, mockClient, mockCompany);

      expect(html).toContain('御 見 積 書');
      expect(html).toContain(mockQuote.quoteNumber);
      expect(html).toContain(mockClient.companyName);
      expect(html).toContain(mockCompany.name);
      expect(html).toContain('YouTube動画編集');
      expect(html).toContain('テスト備考');
    });

    it('XSS対策としてHTMLエスケープされる', () => {
      const xssQuote = {
        ...mockQuote,
        notes: '<script>alert("xss")</script>',
      };
      const html = generateQuoteHTML(xssQuote, mockClient, mockCompany);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('generateInvoiceHTML', () => {
    it('請求書のHTMLを生成する', () => {
      const html = generateInvoiceHTML(mockInvoice, mockClient, mockCompany);

      expect(html).toContain('請 求 書');
      expect(html).toContain(mockInvoice.invoiceNumber);
      expect(html).toContain(mockClient.companyName);
      expect(html).toContain(mockCompany.name);
      expect(html).toContain('みずほ銀行');
      expect(html).toContain('渋谷支店');
    });
  });

  describe('generatePDF', () => {
    it('HTMLからPDFバッファを生成する', async () => {
      const html = '<html><body><h1>Test PDF</h1></body></html>';
      const result = await generatePDF(html);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Buffer);
      // PDFヘッダーを確認
      expect(result.data?.toString('utf-8', 0, 4)).toBe('%PDF');
    }, 30000); // タイムアウトを30秒に設定
  });

  describe('generateQuotePDF', () => {
    it('見積書PDFを生成する', async () => {
      const result = await generateQuotePDF(mockQuote, mockClient, mockCompany);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.data?.toString('utf-8', 0, 4)).toBe('%PDF');
    }, 30000);
  });

  describe('generateInvoicePDF', () => {
    it('請求書PDFを生成する', async () => {
      const result = await generateInvoicePDF(mockInvoice, mockClient, mockCompany);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.data?.toString('utf-8', 0, 4)).toBe('%PDF');
    }, 30000);
  });
});
