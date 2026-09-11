import type { PriceLevel } from '@/types/models';

/** Formats large counts compactly, e.g. 8421 -> "8.4k". */
export function formatCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

const MINUTE = 60_000;const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Short relative time for feed items, e.g. "2h", "3d". Falls back to a date once an item
 * is older than a week, where "8d" stops being useful.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();

  if (elapsed < MINUTE) return 'now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;

  return formatDayMonth(iso);
}

/**
 * Parses a value that may be a `YYYY-MM-DD` calendar date or a full timestamp.
 *
 * `new Date('2026-09-10')` is parsed as **UTC midnight**, so reading it back with the local
 * getters shifts it to the previous day anywhere west of UTC. `diary_entries.eaten_at` is a
 * calendar date — the day the user ate — not an instant, so it has to be built in local time
 * or "Today" reads as "Yesterday" for half the world.
 */
function parseDateOrTimestamp(iso: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(iso);
}

/**
 * Diary date label. "Today"/"Yesterday" are compared on calendar days rather than elapsed
 * hours, so a meal at 9pm yesterday does not still read as "Today" at 8am.
 */
export function formatDiaryDate(iso: string, now: Date = new Date()): string {
  const date = parseDateOrTimestamp(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysApart = Math.round((startOfDay(now) - startOfDay(date)) / DAY);

  if (daysApart === 0) return 'Today';
  if (daysApart === 1) return 'Yesterday';

  return formatDayMonth(iso);
}

function formatDayMonth(iso: string): string {
  return parseDateOrTimestamp(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Today's date in the device's own timezone, as `YYYY-MM-DD`.
 *
 * `toISOString().slice(0, 10)` would give the UTC date, which is a different day for anyone
 * logging a late dinner east of UTC or an early lunch west of it — the entry would then read
 * as "Yesterday" or "Tomorrow" the moment it was written.
 */
export function localDateString(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const PRICE_LEVELS: PriceLevel[] = ['£', '££', '£££', '££££'];

/**
 * `restaurants.price_level` is a smallint 1-4; the UI shows pound signs. Unknown or
 * out-of-range values fall back to "££" rather than rendering a blank gap in the row.
 */
export function formatPriceLevel(level: number | null): PriceLevel {
  return PRICE_LEVELS[(level ?? 2) - 1] ?? '££';
}
