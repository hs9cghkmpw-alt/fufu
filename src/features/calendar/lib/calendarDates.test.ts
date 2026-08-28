import { describe, expect, it } from 'vitest';
import {
  calendarRangeForMonth,
  eventDateKeys,
  isCalendarEventOverdue,
  monthGridDateKeys,
  shiftCalendarMonth
} from './calendarDates';
import type { CalendarEvent } from '../types/calendar';

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'event-1',
    coupleId: 'couple-1',
    ownerUserId: null,
    visibility: 'couple',
    eventType: 'agreement',
    status: 'confirmed',
    approvalStatus: 'not_required',
    currentActorUserId: null,
    sourceRequestId: null,
    sourceProposalVersionId: null,
    sourceAgreementId: null,
    sourceResponseId: null,
    title: '予定',
    details: null,
    startsAt: '2026-08-29T09:00:00+09:00',
    endsAt: null,
    startDate: null,
    endDate: null,
    dueAt: null,
    completedAt: null,
    createdByUserId: 'user-1',
    approvedByUserId: null,
    approvedAt: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides
  };
}

describe('calendarDates', () => {
  it('creates a six-week Sunday-first month grid', () => {
    const keys = monthGridDateKeys({ year: 2026, month: 9 });
    expect(keys).toHaveLength(42);
    expect(keys[0]).toBe('2026-08-30');
    expect(keys.at(-1)).toBe('2026-10-10');
  });

  it('builds a Tokyo range that includes the complete month grid', () => {
    expect(calendarRangeForMonth({ year: 2026, month: 9 })).toEqual({
      dateStart: '2026-08-30',
      dateEnd: '2026-10-10',
      rangeStart: '2026-08-30T00:00:00+09:00',
      rangeEnd: '2026-10-11T00:00:00+09:00'
    });
  });

  it('shifts across year boundaries', () => {
    expect(shiftCalendarMonth({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1
    });
  });

  it('keeps all-day multi-day events on date values', () => {
    expect(
      eventDateKeys(
        event({
          startsAt: null,
          startDate: '2026-09-02',
          endDate: '2026-09-04',
          visibility: 'personal',
          eventType: 'personal',
          coupleId: null,
          ownerUserId: 'user-1'
        })
      )
    ).toEqual(['2026-09-02', '2026-09-03', '2026-09-04']);
  });

  it('derives overdue only for incomplete deadline projections', () => {
    const due = event({
      eventType: 'deadline',
      startsAt: '2026-08-28T20:00:00+09:00'
    });
    expect(isCalendarEventOverdue(due, new Date('2026-08-29T00:00:00Z'))).toBe(true);
    expect(
      isCalendarEventOverdue({ ...due, status: 'completed' }, new Date('2026-08-29T00:00:00Z'))
    ).toBe(false);
  });
});
