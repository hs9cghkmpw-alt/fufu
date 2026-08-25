import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseActions } from './ResponseActions';
import { ResponseServiceError } from '../services/responseService';

const mocks = vi.hoisted(() => ({
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  scheduleDiscussion: vi.fn()
}));
vi.mock('../services/responseService', async (importOriginal) => {
  const original = await importOriginal();
  return { ...(original as object), ...mocks };
});
const { approveRequest, rejectRequest, scheduleDiscussion } = mocks;

describe('ResponseActions', () => {
  beforeEach(() => {
    approveRequest.mockReset().mockResolvedValue(undefined);
    rejectRequest.mockReset().mockResolvedValue(undefined);
    scheduleDiscussion.mockReset().mockResolvedValue(undefined);
  });

  it('requires confirmation before approval', async () => {
    const completed = vi.fn().mockResolvedValue(undefined);
    render(<ResponseActions requestId="request-1" expectedVersion={1} onCompleted={completed} />);
    fireEvent.click(screen.getByRole('button', { name: '承認する' }));
    expect(approveRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '内容を確認して承認する' }));
    await waitFor(() => expect(approveRequest).toHaveBeenCalledWith('request-1', 1));
  });

  it('submits a required rejection reason', async () => {
    render(<ResponseActions requestId="request-1" expectedVersion={1} onCompleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '却下する' }));
    const submit = screen.getByRole('button', { name: '理由を記録して却下する' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('却下する理由'), {
      target: { value: '今回は見送ります' }
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(rejectRequest).toHaveBeenCalledWith('request-1', 1, '今回は見送ります')
    );
  });

  it('submits a discussion date', async () => {
    render(<ResponseActions requestId="request-1" expectedVersion={1} onCompleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '家で話す' }));
    fireEvent.change(screen.getByLabelText('話し合う日時'), {
      target: { value: '2026-08-26T20:00' }
    });
    fireEvent.click(screen.getByRole('button', { name: '話し合う日時を記録する' }));
    await waitFor(() =>
      expect(scheduleDiscussion).toHaveBeenCalledWith('request-1', 1, '2026-08-26T20:00')
    );
  });

  it('refreshes and explains stale state', async () => {
    approveRequest.mockRejectedValue(
      new ResponseServiceError('内容が更新されています。最新の状態を読み込みました。', 'stale')
    );
    const completed = vi.fn().mockResolvedValue(undefined);
    render(<ResponseActions requestId="request-1" expectedVersion={1} onCompleted={completed} />);
    fireEvent.click(screen.getByRole('button', { name: '承認する' }));
    fireEvent.click(screen.getByRole('button', { name: '内容を確認して承認する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('内容が更新されています');
    expect(completed).toHaveBeenCalledWith('内容が更新されています。最新の状態を読み込みました。');
  });
});
