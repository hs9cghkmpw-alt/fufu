import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequestDetailPage } from './RequestDetailPage';

vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('../hooks/useRequestDetail', () => ({
  useRequestDetail: () => ({
    isLoading: false,
    error: '',
    request: {
      id: 'request-1',
      requesterUserId: 'user-a',
      currentActorUserId: 'user-b',
      category: 'money',
      status: 'pending_response',
      currentProposalVersion: 1,
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
        createdAt: '2026-08-25T00:00:00Z'
      }
    }
  })
}));

describe('RequestDetailPage', () => {
  it('shows v1 details and actor labels without decision actions', () => {
    render(
      <MemoryRouter initialEntries={['/requests/request-1']}>
        <Routes>
          <Route path="/requests/:id" element={<RequestDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: '貯金額を決めたい' })).toBeVisible();
    expect(screen.getByText('10,000円/月')).toBeVisible();
    expect(screen.getByText('v1')).toBeVisible();
    expect(screen.queryByRole('button', { name: /承認|却下|対案/ })).not.toBeInTheDocument();
  });
});
