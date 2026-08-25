import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NegotiationProposalForm } from './NegotiationProposalForm';

const proposal = {
  id: 'proposal-1',
  requestId: 'request-1',
  versionNo: 1,
  authorUserId: 'user-a',
  title: '掃除機',
  details: '家で使う',
  amount: 4800,
  amountType: 'one_time' as const,
  scheduledAt: null,
  dueAt: null,
  counterReason: null,
  createdAt: '2026-08-25T00:00:00Z'
};

describe('NegotiationProposalForm', () => {
  it('uses the current proposal as defaults and requires a reason', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <NegotiationProposalForm
        proposal={proposal}
        category="purchase"
        submitLabel="対案を送る"
        onSubmit={submit}
      />
    );
    expect(screen.getByLabelText('タイトル')).toHaveValue('掃除機');
    expect(screen.getByLabelText('金額（任意・円）')).toHaveValue('4800');
    const button = screen.getByRole('button', { name: '対案を送る' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('変更理由'), { target: { value: '予算を抑えたい' } });
    fireEvent.click(button);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4800, reason: '予算を抑えたい' })
      )
    );
  });
});
