import { isAgreementOverdue } from '../../agreements/lib/agreementFormatting';
import { listAgreements } from '../../agreements/services/agreementService';
import { listRequests } from '../../requests/services/requestService';
import type { HomeData } from '../types/home';

export async function getHomeData(userId: string, now = new Date()): Promise<HomeData> {
  const [requests, agreements] = await Promise.all([listRequests(), listAgreements()]);
  const upcomingLimit = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  return {
    actionRequired: requests.filter(
      (request) =>
        request.currentActorUserId === userId &&
        ['pending_response', 'negotiating'].includes(request.status)
    ),
    overdue: agreements.filter((agreement) => isAgreementOverdue(agreement, now)),
    upcoming: agreements.filter((agreement) => {
      if (agreement.executionStatus !== 'pending' || !agreement.scheduledAt) return false;
      const time = new Date(agreement.scheduledAt).getTime();
      return time >= now.getTime() && time <= upcomingLimit;
    }),
    awaitingPartner: requests.filter(
      (request) =>
        request.currentActorUserId !== null &&
        request.currentActorUserId !== userId &&
        ['pending_response', 'negotiating'].includes(request.status)
    ),
    discussions: requests.filter((request) => request.status === 'discussion_scheduled'),
    recentAgreements: agreements.slice(0, 5)
  };
}
