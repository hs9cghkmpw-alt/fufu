import { describe, expect, it } from 'vitest';
import { parseRequestForm } from './requestValidation';

const valid = {
  title: '家具を買いたい',
  category: 'purchase',
  amount: '4800',
  amountType: 'one_time',
  details: 'リビングで使うため',
  scheduledAt: '',
  dueAt: ''
};

describe('parseRequestForm', () => {
  it('normalizes optional values and integer yen', () => {
    expect(parseRequestForm(valid)).toMatchObject({
      title: '家具を買いたい',
      amount: 4800,
      amountType: 'one_time'
    });
  });

  it('rejects decimal and oversized amounts', () => {
    expect(() => parseRequestForm({ ...valid, amount: '1.5' })).toThrow('0以上の整数');
    expect(() => parseRequestForm({ ...valid, amount: '1000000000000' })).toThrow('上限');
  });

  it('allows a request without money', () => {
    expect(parseRequestForm({ ...valid, amount: '', amountType: '' })).toMatchObject({
      amount: null,
      amountType: null
    });
  });
});
