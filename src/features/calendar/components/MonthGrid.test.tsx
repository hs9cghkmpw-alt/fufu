import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthGrid } from './MonthGrid';
import type { CalendarEvent } from '../types/calendar';

describe('MonthGrid', () => {
  it('shows event count in the date accessibility label and selects a date', () => {
    const onSelectDate = vi.fn();
    const dateKeys = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 7, 30 + index));
      return date.toISOString().slice(0, 10);
    });
    const calendarEvent: CalendarEvent = {
      id: 'event-1',
      coupleId: null,
      ownerUserId: 'user-1',
      visibility: 'personal',
      eventType: 'personal',
      status: 'confirmed',
      approvalStatus: 'not_required',
      currentActorUserId: null,
      sourceRequestId: null,
      sourceProposalVersionId: null,
      sourceAgreementId: null,
      sourceResponseId: null,
      title: '自分の予定',
      details: null,
      startsAt: null,
      endsAt: null,
      startDate: '2026-09-02',
      endDate: null,
      dueAt: null,
      completedAt: null,
      createdByUserId: 'user-1',
      approvedByUserId: null,
      approvedAt: null,
      createdAt: '2026-08-29T00:00:00Z',
      updatedAt: '2026-08-29T00:00:00Z'
    };
    const eventsByDate = new Map([['2026-09-02', [calendarEvent]]]);

    render(
      <MonthGrid
        month={{ year: 2026, month: 9 }}
        dateKeys={dateKeys}
        eventsByDate={eventsByDate}
        selectedDate="2026-09-01"
        today="2026-09-01"
        onSelectDate={onSelectDate}
      />
    );

    const target = screen.getByRole('button', { name: '2026-09-02、予定1件' });
    expect(target).toHaveTextContent('個人');
    fireEvent.click(target);
    expect(onSelectDate).toHaveBeenCalledWith('2026-09-02');
  });
});
