import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvitationForm } from './InvitationForm';

describe('InvitationForm', () => {
  it('submits an invitation code', async () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    render(<InvitationForm onJoin={onJoin} />);
    fireEvent.change(screen.getByLabelText('招待コード'), { target: { value: 'abc123' } });
    fireEvent.click(screen.getByRole('button', { name: '招待コードで参加' }));
    await waitFor(() => expect(onJoin).toHaveBeenCalledWith('abc123'));
  });

  it('shows a safe domain error', async () => {
    render(<InvitationForm onJoin={vi.fn().mockRejectedValue(new Error('期限切れです。'))} />);
    fireEvent.change(screen.getByLabelText('招待コード'), { target: { value: 'expired' } });
    fireEvent.click(screen.getByRole('button', { name: '招待コードで参加' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('期限切れです。');
  });
});
