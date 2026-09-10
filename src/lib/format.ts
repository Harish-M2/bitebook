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
 * Diary date label. "Today"/"Yesterday" are compared on calendar days rather than elapsed
 * hours, so a meal at 9pm yesterday does not still read as "Today" at 8am.
 */
export function formatDiaryDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysApart = Math.round((startOfDay(now) - startOfDay(date)) / DAY);

  if (daysApart === 0) return 'Today';
  if (daysApart === 1) return 'Yesterday';

  return formatDayMonth(iso);
}

function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const PRICE_LEVELS: PriceLevel[] = ['£', '££', '£££', '££££'];

/**
 * `restaurants.price_level` is a smallint 1-4; the UI shows pound signs. Unknown or
 * out-of-range values fall back to "££" rather than rendering a blank gap in the row.
 */
export function formatPriceLevel(level: number | null): PriceLevel {
  return PRICE_LEVELS[(level ?? 2) - 1] ?? '££';
}
