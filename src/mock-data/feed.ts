/**
 * MOCK DATA — Phase 1 only.
 *
 * Isolated here so it is easy to find and delete once real Supabase-backed data
 * fetching lands (see Bitebook_Build_Instructions.md phase plan). Do not import
 * this outside of screen-level placeholder rendering.
 */
import type { UserSummary, FeedActivity } from '@/types/models';

export const mockStories: (UserSummary & { isOwnStory?: boolean })[] = [
  { id: 'me', username: 'you', displayName: 'Your story', avatarUrl: null, isOwnStory: true },
  { id: 'u1', username: 'sarahk', displayName: 'Sarah', avatarUrl: 'https://picsum.photos/seed/bitebook-sarah/200' },
  { id: 'u2', username: 'tomw', displayName: 'Tom', avatarUrl: 'https://picsum.photos/seed/bitebook-tom/200' },
  { id: 'u3', username: 'james_r', displayName: 'James', avatarUrl: 'https://picsum.photos/seed/bitebook-james/200' },
  { id: 'u4', username: 'ninap', displayName: 'Nina', avatarUrl: 'https://picsum.photos/seed/bitebook-nina/200' },
];

export const mockFeed: FeedActivity[] = [
  {
    id: 'f1',
    actor: { id: 'u1', username: 'sarahk', displayName: 'Sarah', avatarUrl: 'https://picsum.photos/seed/bitebook-sarah/200' },
    kind: 'logged_dish',
    dish: {
      id: 'd1',
      name: 'Smoked Lamb Shoulder',
      restaurant: { id: 'r1', name: 'Copper Tandoor' },
      rating: 4.8,
      ratingCount: 12400,
      imageUrl: 'https://picsum.photos/seed/bitebook-lamb/900/900',
    },
    photoUrl: 'https://picsum.photos/seed/bitebook-lamb/900/900',
    reviewText: 'Ridiculous as always.',
    postedAgo: '2h',
    likeCount: 24,
    commentCount: 6,
  },
  {
    id: 'f2',
    actor: { id: 'u2', username: 'tomw', displayName: 'Tom', avatarUrl: 'https://picsum.photos/seed/bitebook-tom/200' },
    kind: 'reviewed_restaurant',
    restaurant: {
      id: 'r2',
      name: 'Ember & Salt',
      cuisine: 'British',
      priceLevel: '££',
      city: 'Shoreditch, London',
      rating: 4.5,
      reviewCount: 2103,
      imageUrl: 'https://picsum.photos/seed/bitebook-ember/900/900',
    },
    photoUrl: 'https://picsum.photos/seed/bitebook-ember/900/900',
    reviewText: "Brilliant interior. Even better food. The apple toast \uD83D\uDD25",
    postedAgo: '4h',
    likeCount: 18,
    commentCount: 9,
  },
];
