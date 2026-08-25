import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgreementDetail } from './AgreementDetail';

const completeAgreement = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../services/agreementService', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  completeAgreement
}));

const agreement = {
  id: 'agreement-1',
  coupleId: 'couple-1',
  sourceRequestId: 'request-1',
  sourceProposalVersionId: 'proposal-3',
  approvedResponseId: 'response-1',
  lifecycleStatus: 'active' as const,
  executionStatus: 'pending' as const,
  scheduledAt: null,
  dueAt: '2026-08-26T00:00:00Z',
  completedAt: null,
  completedByUserId: null,
  createdAt: '2026-08-25T00:00:00Z',
  proposal: {
    id: 'proposal-3',
    requestId: 'request-1',
    versionNo: 3,
    authorUserId: 'user-a',
    title: '確定案',
    details: '内容',
    amount: 3000,
    amountType: 'one_time' as const,
    scheduledAt: null,
    dueAt: '2026-08-26T00:00:00Z',
    counterReason: '理由',
    createdAt: '2026-08-25T00:00:00Z'
  }
};

describe('AgreementDetail', () => {
  it('shows the fixed version and completes pending execution', async () => {
    const completed = vi.fn().mockResolvedValue(undefined);
    render(<AgreementDetail agreement={agreement} onCompleted={completed} />);
    expect(screen.getByText('v3')).toBeVisible();
    expect(screen.getByText('3,000円')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '実行済みにする' }));
    await waitFor(() => expect(completeAgreement).toHaveBeenCalledWith('agreement-1'));
    expect(completed).toHaveBeenCalled();
  });

  it('shows completed state without completion action', () => {
    render(
      <AgreementDetail
        agreement={{
          ...agreement,
          executionStatus: 'completed',
          completedAt: '2026-08-26T01:00:00Z',
          completedByUserId: 'user-b'
        }}
        onCompleted={vi.fn()}
      />
    );
    expect(screen.getByText('実行済み')).toBeVisible();
    expect(screen.queryByRole('button', { name: '実行済みにする' })).not.toBeInTheDocument();
  });
});
