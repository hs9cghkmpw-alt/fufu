// Sprint 7 calendar schema fragment.
//
// The canonical generated Database type is regenerated after the remote migration is applied.
// This fragment keeps the new calendar feature strictly typed while the branch is reviewed.

export interface CalendarEventRow {
  id: string;
  couple_id: string | null;
  owner_user_id: string | null;
  visibility: 'couple' | 'personal';
  event_type: 'agreement' | 'deadline' | 'discussion' | 'pending_proposal' | 'shared' | 'personal';
  status: 'pending' | 'confirmed' | 'discussion' | 'completed' | 'cancelled';
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
  current_actor_user_id: string | null;
  source_request_id: string | null;
  source_proposal_version_id: string | null;
  source_agreement_id: string | null;
  source_response_id: string | null;
  projection_key: string | null;
  title: string;
  details: string | null;
  starts_at: string | null;
  ends_at: string | null;
  start_date: string | null;
  end_date: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_by_user_id: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarDirectEventRpcArgs {
  p_title: string;
  p_details: string | null;
  p_starts_at: string | null;
  p_ends_at: string | null;
  p_start_date: string | null;
  p_end_date: string | null;
}

export interface CalendarRangeRpcArgs {
  range_start: string;
  range_end: string;
  date_start: string;
  date_end: string;
}
