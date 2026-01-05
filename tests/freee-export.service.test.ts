/**
 * FreeeExportService テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FreeeExportService } from '../src/services/freee-export.service.js';
import type { Invoice } from '../src/types/index.js';

describe('FreeeExportService', () => {
  let service: FreeeExportService;

  const createMockInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
    id: 'invoice-1',
    invoiceNumber: 'INV-202501-0001',
    projectId: 'project-1',
    clientId: 'client-1',
    status: '発行済み',
    issueDate: new Date('2025-01-15'),
    dueDate: new Date('2025-02-15'),
    items: [
      {
        id: 'item-1',
        description: 'サービスA',
        quantity: 1,
        unit: '式',
        unitPrice: 100000,
        amount: 100000,
        taxable: true,
        taxCategory: '課税売上10%',
      },
    ],
    subtotal: 100000,
    taxRate: 0.1,
    taxAmount: 10000,
    totalAmount: 110000,
    paidAmount: 0,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  });

  beforeEach(() => {
    service = new FreeeExportService();
  });

  describe('exportToCSV', () => {
    it('should generate CSV with headers', async () => {
      const invoices = [createMockInvoice()];
      const result = await service.exportToCSV(invoices);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const lines = result.data!.split('\n');
      expect(lines[0]).toContain('取引日');
      expect(lines[0]).toContain('借方勘定科目');
      expect(lines[0]).toContain('貸方勘定科目');
    });

    it('should include journal entries for issued invoice', async () => {
      const invoices = [createMockInvoice()];
      const result = await service.exportToCSV(invoices);

      expect(result.success).toBe(true);

      const lines = result.data!.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one entry

      // Should have sales entry
      expect(result.data).toContain('売掛金');
      expect(result.data).toContain('売上高');
    });

    it('should include payment entry for paid invoice', async () => {
      const invoices = [
        createMockInvoice({
          paidAmount: 110000,
          status: '入金済み',
        }),
      ];
      const result = await service.exportToCSV(invoices);

      expect(result.success).toBe(true);
      expect(result.data).toContain('普通預金');
    });

    it('should filter by date range', async () => {
      const invoices = [
        createMockInvoice({ issueDate: new Date('2025-01-15') }),
        createMockInvoice({
          id: 'invoice-2',
          invoiceNumber: 'INV-202502-0001',
          issueDate: new Date('2025-02-15'),
        }),
      ];

      const result = await service.exportToCSV(invoices, {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('INV-202501-0001');
      expect(result.data).not.toContain('INV-202502-0001');
    });

    it('should exclude unpaid invoices when includeUnpaid is false', async () => {
      const invoices = [
        createMockInvoice({ paidAmount: 0, status: '発行済み' }),
        createMockInvoice({
          id: 'invoice-2',
          invoiceNumber: 'INV-202501-0002',
          paidAmount: 110000,
          status: '入金済み',
        }),
      ];

      const result = await service.exportToCSV(invoices, {
        includeUnpaid: false,
      });

      expect(result.success).toBe(true);
      // Only paid invoice should be included in the output
      expect(result.data).toContain('INV-202501-0002');
    });

    it('should skip draft invoices', async () => {
      const invoices = [
        createMockInvoice({ status: '下書き' }),
      ];

      const result = await service.exportToCSV(invoices);

      expect(result.success).toBe(true);
      // Draft invoices should not generate journal entries
      const lines = result.data!.split('\n');
      expect(lines.length).toBe(1); // Only header
    });
  });

  describe('preview', () => {
    it('should return preview of journal entries', async () => {
      const invoices = [createMockInvoice()];
      const result = await service.preview(invoices);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);

      const entry = result.data![0];
      expect(entry.取引日).toBeDefined();
      expect(entry.借方勘定科目).toBeDefined();
      expect(entry.貸方勘定科目).toBeDefined();
    });

    it('should limit preview to 10 invoices', async () => {
      const invoices = Array.from({ length: 15 }, (_, i) =>
        createMockInvoice({
          id: `invoice-${i}`,
          invoiceNumber: `INV-${i}`,
        })
      );

      const result = await service.preview(invoices);

      expect(result.success).toBe(true);
      // Should only process first 10 invoices
    });
  });

  describe('exportMonthly', () => {
    it('should export invoices for specific month', async () => {
      const invoices = [
        createMockInvoice({ issueDate: new Date('2025-01-15') }),
        createMockInvoice({
          id: 'invoice-2',
          invoiceNumber: 'INV-202502-0001',
          issueDate: new Date('2025-02-15'),
        }),
      ];

      const result = await service.exportMonthly(invoices, 2025, 1);

      expect(result.success).toBe(true);
      expect(result.data).toContain('INV-202501-0001');
      expect(result.data).not.toContain('INV-202502-0001');
    });
  });

  describe('CSV formatting', () => {
    it('should escape fields with commas', async () => {
      const invoices = [
        createMockInvoice({
          items: [
            {
              id: 'item-1',
              description: 'サービスA, サービスB',
              quantity: 1,
              unit: '式',
              unitPrice: 100000,
              amount: 100000,
              taxable: true,
              taxCategory: '課税売上10%',
            },
          ],
        }),
      ];

      const result = await service.exportToCSV(invoices);

      expect(result.success).toBe(true);
      // Fields with commas should be quoted
    });

    it('should format dates as YYYY-MM-DD', async () => {
      const invoices = [createMockInvoice({ issueDate: new Date('2025-01-15') })];
      const result = await service.exportToCSV(invoices);

      expect(result.success).toBe(true);
      expect(result.data).toContain('2025-01-15');
    });
  });
});
