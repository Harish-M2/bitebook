/**
 * MOCK DATA — Phase 1 only. See feed.ts for the removal note.
 */
import type { CuisineStat, UserSummary } from '@/types/models';

export const mockProfile: UserSummary = {
  id: 'me',
  username: 'harishk',
  displayName: 'Harish',
  avatarUrl: 'https://picsum.photos/seed/bitebook-harish/300',
};

export const mockCuisineBreakdown: CuisineStat[] = [
  { cuisine: 'Indian', dishCount: 42, percentage: 100 },
  { cuisine: 'Italian', dishCount: 31, percentage: 74 },
  { cuisine: 'Burgers', dishCount: 28, percentage: 67 },
  { cuisine: 'Japanese', dishCount: 19, percentage: 45 },
  { cuisine: 'Thai', dishCount: 15, percentage: 36 },
];
