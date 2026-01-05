/**
 * InvoiceService テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InvoiceService } from '../src/services/invoice.service.js';

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(() => {
    service = new InvoiceService();
  });

  describe('create', () => {
    it('should create an invoice with correct calculations', async () => {
      const result = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'サービスA',
            quantity: 2,
            unit: '件',
            unitPrice: 10000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
          {
            description: 'サービスB',
            quantity: 1,
            unit: '式',
            unitPrice: 5000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(2);
      expect(result.data!.items[0].amount).toBe(20000);
      expect(result.data!.items[1].amount).toBe(5000);
      expect(result.data!.subtotal).toBe(25000);
      expect(result.data!.taxAmount).toBe(2500);
      expect(result.data!.totalAmount).toBe(27500);
      expect(result.data!.paidAmount).toBe(0);
    });

    it('should generate invoice number', async () => {
      const result = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 1000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data!.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
    });

    it('should set default payment terms', async () => {
      const result = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 1000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data!.paymentTerms).toBe('請求書発行日より30日以内');
    });
  });

  describe('recordPayment', () => {
    it('should record partial payment', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 10000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      // Update status to 発行済み first
      await service.updateStatus(createResult.data!.id, '発行済み');

      const paymentResult = await service.recordPayment(createResult.data!.id, 5000);

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.data!.paidAmount).toBe(5000);
      expect(paymentResult.data!.status).toBe('一部入金');
    });

    it('should mark as fully paid when payment equals total', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 10000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      const totalAmount = createResult.data!.totalAmount;
      const paymentResult = await service.recordPayment(createResult.data!.id, totalAmount);

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.data!.paidAmount).toBe(totalAmount);
      expect(paymentResult.data!.status).toBe('入金済み');
    });

    it('should mark as overpaid when payment exceeds total', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 10000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      const totalAmount = createResult.data!.totalAmount;
      const paymentResult = await service.recordPayment(createResult.data!.id, totalAmount + 1000);

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.data!.status).toBe('過払い');
    });
  });

  describe('getUnpaid', () => {
    it('should return unpaid invoices', async () => {
      await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 10000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      const listResult = await service.list();
      const invoice = listResult.data!.items[0];

      await service.updateStatus(invoice.id, '発行済み');

      const unpaidResult = await service.getUnpaid();

      expect(unpaidResult.success).toBe(true);
      expect(unpaidResult.data!.length).toBeGreaterThan(0);
      expect(unpaidResult.data!.some((inv) => inv.id === invoice.id)).toBe(true);
    });
  });

  describe('getMonthlySummary', () => {
    it('should calculate monthly summary', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 10000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      const summaryResult = await service.getMonthlySummary(year, month);

      expect(summaryResult.success).toBe(true);
      expect(summaryResult.data!.invoiceCount).toBeGreaterThan(0);
      expect(summaryResult.data!.totalInvoiced).toBeGreaterThan(0);
    });
  });

  describe('delete', () => {
    it('should delete invoice', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 1000,
            taxable: true,
            taxCategory: '課税売上10%',
          },
        ],
      });

      const deleteResult = await service.delete(createResult.data!.id);
      expect(deleteResult.success).toBe(true);

      const getResult = await service.get(createResult.data!.id);
      expect(getResult.success).toBe(false);
    });
  });
});
