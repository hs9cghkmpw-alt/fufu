import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionResultForm } from './DiscussionResultForm';
import { WithdrawAction } from './WithdrawAction';

const mocks = vi.hoisted(() => ({
  recordDiscussionResult: vi.fn().mockResolvedValue('proposal-2'),
  withdrawRequest: vi.fn().mockResolvedValue('request-1')
}));
vi.mock('../services/negotiationService', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  ...mocks
}));

const proposal = {
  id: 'proposal-1',
  requestId: 'request-1',
  versionNo: 1,
  authorUserId: 'user-a',
  title: '話し合う内容',
  details: null,
  amount: null,
  amountType: null,
  scheduledAt: null,
  dueAt: null,
  counterReason: null,
  createdAt: '2026-08-25T00:00:00Z'
};

describe('negotiation actions', () => {
  it('registers discussion results as the next proposal', async () => {
    render(
      <DiscussionResultForm
        requestId="request-1"
        expectedVersion={1}
        category="other"
        proposal={proposal}
        onCompleted={vi.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '話し合った結果を登録する' }));
    fireEvent.change(screen.getByLabelText('変更理由'), { target: { value: '話し合った結果' } });
    fireEvent.click(screen.getByRole('button', { name: 'v2として相手に提案する' }));
    await waitFor(() => expect(mocks.recordDiscussionResult).toHaveBeenCalled());
  });

  it('requires confirmation before withdrawal', async () => {
    render(
      <WithdrawAction
        requestId="request-1"
        expectedVersion={2}
        onCompleted={vi.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '申請を取り下げる' }));
    expect(mocks.withdrawRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '取下げを確定する' }));
    await waitFor(() => expect(mocks.withdrawRequest).toHaveBeenCalledWith('request-1', 2));
  });
});
