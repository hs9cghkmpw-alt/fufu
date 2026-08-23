import { describe, expect, it } from 'vitest';
import { formatTokyoDateTime, toTokyoDateKey } from './tokyo';

describe('Tokyo date utilities', () => {
  it('uses Asia/Tokyo across a UTC date boundary', () => {
    expect(toTokyoDateKey('2026-08-22T16:00:00Z')).toBe('2026-08-23');
  });
  it('formats a Japanese date and time', () => {
    expect(formatTokyoDateTime('2026-08-22T15:00:00Z')).toContain('2026');
  });
});
