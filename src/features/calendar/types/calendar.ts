export const calendarEventTypes = [
  'agreement',
  'deadline',
  'discussion',
  'pending_proposal',
  'shared',
  'personal'
] as const;

export type CalendarEventType = (typeof calendarEventTypes)[number];

export type CalendarEventStatus =
  'pending' | 'confirmed' | 'discussion' | 'completed' | 'cancelled';

export type CalendarApprovalStatus =
  'not_required' | 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type CalendarVisibility = 'couple' | 'personal';

export interface CalendarEvent {
  id: string;
  coupleId: string | null;
  ownerUserId: string | null;
  visibility: CalendarVisibility;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  approvalStatus: CalendarApprovalStatus;
  currentActorUserId: string | null;
  sourceRequestId: string | null;
  sourceProposalVersionId: string | null;
  sourceAgreementId: string | null;
  sourceResponseId: string | null;
  title: string;
  details: string | null;
  startsAt: string | null;
  endsAt: string | null;
  startDate: string | null;
  endDate: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarRange {
  rangeStart: string;
  rangeEnd: string;
  dateStart: string;
  dateEnd: string;
}

export interface CalendarEventInput {
  title: string;
  details: string | null;
  startsAt: string | null;
  endsAt: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CalendarEventFormInput extends CalendarEventInput {
  visibility: 'personal' | 'shared';
}
