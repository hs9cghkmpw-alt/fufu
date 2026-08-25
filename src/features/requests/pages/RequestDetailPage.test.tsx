import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequestDetailPage } from './RequestDetailPage';

vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
const useRequestDetail = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useRequestDetail', () => ({ useRequestDetail }));

const detailState = {
  isLoading: false,
  error: '',
  request: {
    id: 'request-1',
    requesterUserId: 'user-a',
    currentActorUserId: 'user-b',
    category: 'money',
    status: 'pending_response',
    currentProposalVersion: 1,
    discussionAt: null,
    createdAt: '2026-08-25T00:00:00Z',
    proposal: {
      id: 'proposal-1',
      requestId: 'request-1',
      versionNo: 1,
      authorUserId: 'user-a',
      title: '貯金額を決めたい',
      details: '毎月相談したい',
      amount: 10000,
      amountType: 'monthly',
      scheduledAt: null,
      dueAt: null,
      counterReason: null,
      createdAt: '2026-08-25T00:00:00Z'
    },
    proposals: [
      {
        id: 'proposal-1',
        requestId: 'request-1',
        versionNo: 1,
        authorUserId: 'user-a',
        title: '貯金額を決めたい',
        details: '毎月相談したい',
        amount: 10000,
        amountType: 'monthly',
        scheduledAt: null,
        dueAt: null,
        counterReason: null,
        createdAt: '2026-08-25T00:00:00Z'
      }
    ]
  },
  refresh: vi.fn()
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/requests/request-1']}>
      <Routes>
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequestDetailPage', () => {
  it('shows v1 details and actor labels without decision actions', () => {
    useRequestDetail.mockReturnValue(detailState);
    renderPage();
    expect(screen.getByRole('heading', { name: '貯金額を決めたい' })).toBeVisible();
    expect(screen.getAllByText('10,000円/月')).toHaveLength(2);
    expect(screen.getAllByText('v1')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /承認|却下|対案/ })).not.toBeInTheDocument();
  });

  it('shows response actions only to the current actor', () => {
    useRequestDetail.mockReturnValue({
      ...detailState,
      request: { ...detailState.request, requesterUserId: 'user-b', currentActorUserId: 'user-a' }
    });
    renderPage();
    expect(screen.getByRole('button', { name: '承認する' })).toBeVisible();
    expect(screen.getByRole('button', { name: '却下する' })).toBeVisible();
    expect(screen.getByRole('button', { name: '家で話す' })).toBeVisible();
    expect(screen.getByRole('button', { name: '条件を変えて提案する' })).toBeVisible();
  });
});
