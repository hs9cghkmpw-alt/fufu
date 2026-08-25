import { describe, expect, it } from 'vitest';
import { formatAmount } from './requestFormatting';

describe('formatAmount', () => {
  it('formats one-time and monthly yen clearly', () => {
    expect(formatAmount(4800, 'one_time')).toBe('4,800円');
    expect(formatAmount(1200, 'monthly')).toBe('1,200円/月');
    expect(formatAmount(null, null)).toBe('金額なし');
  });
});
