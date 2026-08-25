import { describe, expect, it } from 'vitest';
import { getAgreementDisplayStatus, isAgreementOverdue } from './agreementFormatting';
import type { Agreement } from '../types/agreement';

const agreement = {
  executionStatus: 'pending',
  dueAt: '2026-08-25T00:00:00Z'
} as Agreement;

describe('agreement formatting', () => {
  it('derives overdue without persisting a new state', () => {
    expect(isAgreementOverdue(agreement, new Date('2026-08-25T00:00:01Z'))).toBe(true);
    expect(getAgreementDisplayStatus(agreement, new Date('2026-08-25T00:00:01Z'))).toBe(
      '期限超過・未実行'
    );
    expect(agreement.executionStatus).toBe('pending');
  });
});
