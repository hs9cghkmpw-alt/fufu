import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHomeData } from './homeService';

const mocks = vi.hoisted(() => ({ listRequests: vi.fn(), listAgreements: vi.fn() }));
vi.mock('../../requests/services/requestService', () => ({ listRequests: mocks.listRequests }));
vi.mock('../../agreements/services/agreementService', () => ({
  listAgreements: mocks.listAgreements
}));

describe('getHomeData', () => {
  beforeEach(() => {
    mocks.listRequests.mockResolvedValue([
      { id: 'mine', status: 'negotiating', currentActorUserId: 'user-a' },
      { id: 'waiting', status: 'pending_response', currentActorUserId: 'user-b' },
      { id: 'discussion', status: 'discussion_scheduled', currentActorUserId: null }
    ]);
    mocks.listAgreements.mockResolvedValue([
      {
        id: 'overdue',
        executionStatus: 'pending',
        dueAt: '2026-08-24T00:00:00Z',
        scheduledAt: null
      },
      {
        id: 'upcoming',
        executionStatus: 'pending',
        dueAt: null,
        scheduledAt: '2026-08-27T00:00:00Z'
      }
    ]);
  });

  it('classifies the six home priorities from authoritative state', async () => {
    const data = await getHomeData('user-a', new Date('2026-08-25T00:00:00Z'));
    expect(data.actionRequired.map((item) => item.id)).toEqual(['mine']);
    expect(data.overdue.map((item) => item.id)).toEqual(['overdue']);
    expect(data.upcoming.map((item) => item.id)).toEqual(['upcoming']);
    expect(data.awaitingPartner.map((item) => item.id)).toEqual(['waiting']);
    expect(data.discussions.map((item) => item.id)).toEqual(['discussion']);
    expect(data.recentAgreements).toHaveLength(2);
  });
});
