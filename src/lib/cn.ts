/**
 * Joins conditional class name fragments, skipping falsy values.
 * Small local helper so we avoid adding a new dependency (e.g. clsx) for this alone.
 */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
