/**
 * Example test file
 *
 * Run tests: npm test
 * Watch mode: npm test -- --watch
 * Coverage: npm test -- --coverage
 */

import { describe, it, expect } from 'vitest';
import { OntsugiCRM } from '../src/index.js';

describe('OntsugiCRM', () => {
  it('should return app info', () => {
    const app = OntsugiCRM.getInstance();
    const info = app.getInfo();
    expect(info.name).toBe('OntsugiCRM');
    expect(info.version).toBe('0.1.0');
  });

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });

  it('should validate async operations', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });
});

describe('Environment', () => {
  it('should have Node.js environment', () => {
    expect(typeof process).toBe('object');
    expect(process.env).toBeDefined();
  });
});
