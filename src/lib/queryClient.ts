import { QueryClient } from '@tanstack/react-query';

/**
 * Shared query client.
 *
 * Defaults are tuned for a mobile app on a phone network: data is considered fresh for a
 * short window so tab switches don't refire every query, and failed requests are retried
 * once rather than the default three times, which otherwise leaves an error state hidden
 * behind several seconds of spinner.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Query keys in one place so cache invalidation after a write cannot silently miss a
 * screen — e.g. logging a dish must refresh the diary, the profile counters and the feed.
 */
export const queryKeys = {
  diary: (userId: string) => ['diary', userId] as const,
  diaryStats: (userId: string) => ['diary-stats', userId] as const,
  cuisineBreakdown: (userId: string) => ['cuisine-breakdown', userId] as const,
  feed: (userId: string) => ['feed', userId] as const,
  restaurants: () => ['restaurants'] as const,
};
