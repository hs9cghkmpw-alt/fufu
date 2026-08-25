import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { RequestSummary } from '../types/request';
import { RequestsPage } from './RequestsPage';

const useRequests = vi.fn();
vi.mock('../hooks/useRequests', () => ({ useRequests: () => useRequests() }));
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));

const request: RequestSummary = {
  id: 'request-1',
  requesterUserId: 'user-b',
  currentActorUserId: 'user-a',
  category: 'purchase',
  status: 'pending_response',
  currentProposalVersion: 1,
  createdAt: '2026-08-25T00:00:00Z',
  proposal: {
    id: 'proposal-1',
    requestId: 'request-1',
    versionNo: 1,
    authorUserId: 'user-b',
    title: '掃除機',
    details: null,
    amount: 12000,
    amountType: 'one_time',
    scheduledAt: null,
    dueAt: null,
    createdAt: '2026-08-25T00:00:00Z'
  }
};

describe('RequestsPage', () => {
  it('classifies requests by current actor', () => {
    useRequests.mockReturnValue({
      requests: [request],
      isLoading: false,
      error: '',
      refresh: vi.fn()
    });
    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'あなたの対応が必要' })).toBeVisible();
    expect(screen.getAllByText('掃除機')).toHaveLength(2);
  });

  it('shows loading and error states', () => {
    useRequests.mockReturnValue({ requests: [], isLoading: true, error: '', refresh: vi.fn() });
    const { rerender } = render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('申請を読み込んでいます…')).toBeVisible();
    useRequests.mockReturnValue({
      requests: [],
      isLoading: false,
      error: '取得失敗',
      refresh: vi.fn()
    });
    rerender(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('取得失敗')).toBeVisible();
  });
});
