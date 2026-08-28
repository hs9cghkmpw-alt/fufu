# Sprint 7 Calendar Core Review

Date: 2026-08-29
Branch: `sprint-7-calendar-core`
Status: implementation complete; remote migration and final verification pending

## Scope

Sprint 7 adds the in-app calendar without changing the canonical meaning of requests, proposal versions, responses, or agreements. `calendar_events` is a rebuildable projection for formal workflow data, while personal and lightweight shared events are calendar-native records.

## Projection architecture

- `proposal_versions` / `agreements` remain canonical.
- Request/proposal/agreement triggers call projection sync functions inside the same database transaction as the existing RPC mutation.
- A request owns one idempotent current pending projection key; counter/reproposal updates that projection to the latest immutable proposal version.
- Approval/rejection/withdrawal retires the pending projection.
- Discussion scheduling creates one discussion projection; recording the result marks it completed and creates/updates the new pending proposal projection.
- Agreement creation produces scheduled and/or deadline projections. Agreement execution completion updates those projections to completed.
- Existing request/agreement rows are backfilled during the migration.

## Three lanes

1. Formal: request → proposal → response → agreement. Calendar is projection only.
2. Shared: a lightweight calendar event, separate from formal requests, but partner approval is mandatory in MVP.
3. Personal: owner-only calendar event with no partner approval and no couple-visible metadata.

## RLS and privacy

- Couple-visible events are readable only by active members of their couple.
- Personal events require `owner_user_id = auth.uid()` for SELECT through RLS.
- Calendar direct/source writes have no client DML policies; writes are RPC-only.
- Personal event audit uses `calendar_event_audit_logs` with owner-only RLS, preventing the spouse from inferring that a private event exists through the shared audit log.
- Actor/couple/owner are derived from `auth.uid()` and active membership in SECURITY DEFINER RPCs.
- Shared self-approval is rejected and row locking protects concurrent response operations.

## Date/time

- Timed calendar values use `timestamptz`.
- All-day direct events use PostgreSQL `date` (`start_date`/`end_date`), never a fake midnight timestamp.
- A CHECK constraint enforces exactly one time mode.
- Calendar range/day grouping is evaluated for `Asia/Tokyo`.
- Existing formal proposal/agreement canonical fields are still timed-only; formal all-day canonical fields are a later schema extension rather than silently coercing a date to midnight.

## UI

- `/calendar`: six-week month grid, previous/next, Today, selected-day list.
- `/calendar/new`: personal vs shared event creation; shared UI explains partner approval.
- `/calendar/:id`: source/status detail, formal-source links, shared approve/reject/withdraw, personal cancellation.
- Event state is always expressed with text, not color alone.
- Source-backed agreement/proposal/discussion events have no calendar-side edit action.
- Formal requests remain a separate prominent path.

## Tests

Added:

- `supabase/tests/calendar_core.test.sql` with 33 assertions covering RLS, private audit isolation, shared approval, projection lifecycle, discussion lifecycle, all-day storage, source immutability, and other-couple isolation.
- Calendar date unit tests.
- Month-grid component accessibility/selection test.
- Remote Playwright scenario for personal isolation, shared approval, formal projection, and calendar UI. It skips only when a remote Supabase test environment is not configured.

## Verification state

The implementation was written directly through the GitHub branch because external coding agents were unavailable. This environment can edit/review GitHub but cannot access the linked Supabase project or execute the repository's Node/Supabase toolchain. Therefore the following must be confirmed before merge:

- GitHub PR `verify` job.
- Migration applied to the linked Supabase project.
- Authoritative `src/shared/lib/supabase/database.types.ts` regenerated after remote migration. The branch uses a strict generated-compatible calendar schema fragment until that step.
- Remote calendar E2E after migration.

Do not merge to `main` until those gates pass.

## Sprint 8 concerns

- Formal change/cancellation requests must retire/supersede calendar projections through the same canonical agreement lifecycle.
- Pairing unlink/re-pair recovery must preserve historical calendar visibility consistently with historical request/agreement policy.
- Notifications should treat Realtime only as a refetch signal, never as canonical state.
- Formal all-day proposals require a canonical request/proposal schema extension if needed; do not encode them as 00:00 timestamps.
