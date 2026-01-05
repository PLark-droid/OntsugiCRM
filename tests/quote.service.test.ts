/**
 * QuoteService テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuoteService } from '../src/services/quote.service.js';

describe('QuoteService', () => {
  let service: QuoteService;

  beforeEach(() => {
    service = new QuoteService();
  });

  describe('create', () => {
    it('should create a quote with correct calculations', async () => {
      const result = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'サービスA',
            quantity: 2,
            unit: '件',
            unitPrice: 10000,
            taxable: true,
          },
          {
            description: 'サービスB',
            quantity: 1,
            unit: '式',
            unitPrice: 5000,
            taxable: true,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(2);
      expect(result.data!.items[0].amount).toBe(20000);
      expect(result.data!.items[1].amount).toBe(5000);
      expect(result.data!.subtotal).toBe(25000);
      expect(result.data!.taxAmount).toBe(2500); // 10% tax
      expect(result.data!.totalAmount).toBe(27500);
    });

    it('should generate quote number', async () => {
      const result = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 1000,
            taxable: true,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data!.quoteNumber).toMatch(/^Q-\d{6}-\d{4}$/);
    });

    it('should handle non-taxable items', async () => {
      const result = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: '課税品目',
            quantity: 1,
            unit: '式',
            unitPrice: 10000,
            taxable: true,
          },
          {
            description: '非課税品目',
            quantity: 1,
            unit: '式',
            unitPrice: 5000,
            taxable: false,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data!.subtotal).toBe(15000);
      expect(result.data!.taxAmount).toBe(1000); // 10% of 10000 only
      expect(result.data!.totalAmount).toBe(16000);
    });
  });

  describe('get', () => {
    it('should return quote by id', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 1000,
            taxable: true,
          },
        ],
      });

      const getResult = await service.get(createResult.data!.id);

      expect(getResult.success).toBe(true);
      expect(getResult.data!.id).toBe(createResult.data!.id);
    });

    it('should return error for non-existent quote', async () => {
      const result = await service.get('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('update', () => {
    it('should update quote status', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 1000,
            taxable: true,
          },
        ],
      });

      const updateResult = await service.updateStatus(createResult.data!.id, '送付済み');

      expect(updateResult.success).toBe(true);
      expect(updateResult.data!.status).toBe('送付済み');
    });
  });

  describe('duplicate', () => {
    it('should duplicate quote with new id and number', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            description: 'テスト',
            quantity: 1,
            unit: '式',
            unitPrice: 1000,
            taxable: true,
          },
        ],
        notes: 'オリジナルの備考',
      });

      const duplicateResult = await service.duplicate(createResult.data!.id);

      expect(duplicateResult.success).toBe(true);
      expect(duplicateResult.data!.id).not.toBe(createResult.data!.id);
      expect(duplicateResult.data!.quoteNumber).not.toBe(createResult.data!.quoteNumber);
      expect(duplicateResult.data!.status).toBe('下書き');
      expect(duplicateResult.data!.notes).toBe('オリジナルの備考');
      expect(duplicateResult.data!.items).toHaveLength(1);
    });
  });

  describe('list', () => {
    it('should filter by projectId', async () => {
      await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{ description: 'A', quantity: 1, unit: '式', unitPrice: 1000, taxable: true }],
      });

      await service.create({
        projectId: 'project-2',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{ description: 'B', quantity: 1, unit: '式', unitPrice: 1000, taxable: true }],
      });

      const result = await service.list({ projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.data!.items.every((q) => q.projectId === 'project-1')).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete quote', async () => {
      const createResult = await service.create({
        projectId: 'project-1',
        clientId: 'client-1',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{ description: 'A', quantity: 1, unit: '式', unitPrice: 1000, taxable: true }],
      });

      const deleteResult = await service.delete(createResult.data!.id);
      expect(deleteResult.success).toBe(true);

      const getResult = await service.get(createResult.data!.id);
      expect(getResult.success).toBe(false);
    });
  });
});
