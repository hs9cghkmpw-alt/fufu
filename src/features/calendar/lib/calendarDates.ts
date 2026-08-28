import {
  formatTokyoDateTime,
  toTokyoDateKey
} from '../../../shared/lib/dates/tokyo';
import type { CalendarEvent, CalendarRange } from '../types/calendar';

export interface CalendarMonth {
  year: number;
  month: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) throw new RangeError('Invalid date key');
  return { year, month, day };
}

function utcDateFromKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKeyFromUtc(date: Date) {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0')
  ].join('-');
}

export function addCalendarDays(dateKey: string, days: number) {
  const date = utcDateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyFromUtc(date);
}

export function calendarMonthFromDateKey(dateKey: string): CalendarMonth {
  const { year, month } = parseDateKey(dateKey);
  return { year, month };
}

export function shiftCalendarMonth(month: CalendarMonth, offset: number): CalendarMonth {
  const date = new Date(Date.UTC(month.year, month.month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function formatCalendarMonth(month: CalendarMonth) {
  return `${month.year}年${month.month}月`;
}

function firstOfMonthKey(month: CalendarMonth) {
  return `${month.year.toString().padStart(4, '0')}-${month.month
    .toString()
    .padStart(2, '0')}-01`;
}

export function monthGridDateKeys(month: CalendarMonth) {
  const first = utcDateFromKey(firstOfMonthKey(month));
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_MS);
    return dateKeyFromUtc(date);
  });
}

export function calendarRangeForMonth(month: CalendarMonth): CalendarRange {
  const keys = monthGridDateKeys(month);
  const dateStart = keys[0];
  const last = keys.at(-1);
  if (!dateStart || !last) throw new RangeError('Calendar grid is empty');
  const dateEnd = last;
  return {
    dateStart,
    dateEnd,
    rangeStart: `${dateStart}T00:00:00+09:00`,
    rangeEnd: `${addCalendarDays(dateEnd, 1)}T00:00:00+09:00`
  };
}

export function todayTokyoDateKey(now = new Date()) {
  return toTokyoDateKey(now);
}

export function eventDateKeys(event: CalendarEvent) {
  if (event.startDate) {
    const end = event.endDate ?? event.startDate;
    const keys: string[] = [];
    let current = event.startDate;
    for (let index = 0; index < 367 && current <= end; index += 1) {
      keys.push(current);
      if (current === end) break;
      current = addCalendarDays(current, 1);
    }
    return keys;
  }

  if (!event.startsAt) return [];
  const startKey = toTokyoDateKey(event.startsAt);
  const endKey = event.endsAt ? toTokyoDateKey(event.endsAt) : startKey;
  const keys: string[] = [];
  let current = startKey;
  for (let index = 0; index < 367 && current <= endKey; index += 1) {
    keys.push(current);
    if (current === endKey) break;
    current = addCalendarDays(current, 1);
  }
  return keys;
}

export function groupCalendarEvents(events: CalendarEvent[]) {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    for (const dateKey of eventDateKeys(event)) {
      const current = grouped.get(dateKey) ?? [];
      current.push(event);
      grouped.set(dateKey, current);
    }
  }
  return grouped;
}

export function formatCalendarEventWhen(event: CalendarEvent) {
  if (event.startDate) {
    if (event.endDate && event.endDate !== event.startDate) {
      return `${event.startDate} 〜 ${event.endDate}（終日）`;
    }
    return `${event.startDate}（終日）`;
  }
  if (!event.startsAt) return '日時未設定';
  if (event.endsAt) {
    return `${formatTokyoDateTime(event.startsAt)} 〜 ${formatTokyoDateTime(event.endsAt)}`;
  }
  return formatTokyoDateTime(event.startsAt);
}

export function isCalendarEventOverdue(event: CalendarEvent, now = new Date()) {
  return (
    event.eventType === 'deadline' &&
    event.status === 'confirmed' &&
    event.startsAt !== null &&
    new Date(event.startsAt).getTime() < now.getTime()
  );
}
