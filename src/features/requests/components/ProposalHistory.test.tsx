import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProposalHistory } from './ProposalHistory';

const proposal = {
  id: 'proposal-1',
  requestId: 'request-1',
  versionNo: 1,
  authorUserId: 'user-a',
  title: '予算案',
  details: '最初の案',
  amount: 4800,
  amountType: 'one_time' as const,
  scheduledAt: null,
  dueAt: null,
  counterReason: null,
  createdAt: '2026-08-25T00:00:00Z'
};

describe('ProposalHistory', () => {
  it('shows versions in order and highlights only the current proposal', () => {
    render(
      <ProposalHistory
        proposals={[
          proposal,
          {
            ...proposal,
            id: 'proposal-2',
            versionNo: 2,
            authorUserId: 'user-b',
            amount: 2000,
            counterReason: '予算を抑えたい'
          }
        ]}
        currentVersion={2}
        currentUserId="user-a"
      />
    );
    expect(screen.getByText('v1')).toBeVisible();
    expect(screen.getByText('v2')).toBeVisible();
    expect(screen.getByText('予算を抑えたい')).toBeVisible();
    expect(screen.getAllByText('現在の提案')).toHaveLength(1);
  });
});
