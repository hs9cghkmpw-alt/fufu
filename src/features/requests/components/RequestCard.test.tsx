import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { RequestSummary } from '../types/request';
import { RequestCard } from './RequestCard';

const base: RequestSummary = {
  id: 'request-1',
  requesterUserId: 'user-a',
  currentActorUserId: null,
  category: 'other',
  status: 'approved',
  currentProposalVersion: 1,
  discussionAt: null,
  createdAt: '2026-08-25T00:00:00Z',
  proposal: {
    id: 'proposal-1',
    requestId: 'request-1',
    versionNo: 1,
    authorUserId: 'user-a',
    title: '表示確認',
    details: null,
    amount: null,
    amountType: null,
    scheduledAt: null,
    dueAt: null,
    createdAt: '2026-08-25T00:00:00Z'
  }
};

describe('RequestCard', () => {
  it.each([
    ['approved', '合意済み'],
    ['rejected', '却下'],
    ['discussion_scheduled', '話し合い予定']
  ])('shows %s status as %s', (status, label) => {
    render(
      <MemoryRouter>
        <RequestCard request={{ ...base, status }} />
      </MemoryRouter>
    );
    expect(screen.getByText(label)).toBeVisible();
  });
});
