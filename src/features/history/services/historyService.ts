import { listAgreements } from '../../agreements/services/agreementService';
import { listRequests } from '../../requests/services/requestService';

export async function getHistoryData() {
  const [requests, agreements] = await Promise.all([listRequests(), listAgreements()]);
  return {
    requests: requests.filter((request) =>
      ['approved', 'rejected', 'withdrawn'].includes(request.status)
    ),
    completedAgreements: agreements.filter((agreement) => agreement.executionStatus === 'completed')
  };
}
