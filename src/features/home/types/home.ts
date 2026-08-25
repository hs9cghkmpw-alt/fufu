import type { Agreement } from '../../agreements/types/agreement';
import type { RequestSummary } from '../../requests/types/request';

export interface HomeData {
  actionRequired: RequestSummary[];
  overdue: Agreement[];
  upcoming: Agreement[];
  awaitingPartner: RequestSummary[];
  discussions: RequestSummary[];
  recentAgreements: Agreement[];
}
