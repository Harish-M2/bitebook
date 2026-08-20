/**
 * MOCK DATA — Phase 1 only. See feed.ts for the removal note.
 */
import type { DiaryEntry, DiaryStats } from '@/types/models';

export const mockDiaryStats: DiaryStats = {
  dishesLogged: 342,
  restaurantsVisited: 86,
  cuisinesExplored: 23,
  averageRating: 4.21,
};

export const mockDiaryEntries: DiaryEntry[] = [
  {
    id: 'e1',
    dateLabel: 'Today',
    rating: 4.8,
    dish: {
      id: 'd1',
      name: 'Smoked Lamb Shoulder',
      restaurant: { id: 'r1', name: 'Copper Tandoor' },
      rating: 4.8,
      ratingCount: 12400,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80&auto=format&fit=crop',
    },
  },
  {
    id: 'e2',
    dateLabel: '18 Aug',
    rating: 4.0,
    dish: {
      id: 'd3',
      name: 'Smash Burger',
      restaurant: { id: 'r4', name: 'Black Bear Burger' },
      rating: 4.6,
      ratingCount: 6300,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80&auto=format&fit=crop',
    },
  },
  {
    id: 'e3',
    dateLabel: '17 Aug',
    rating: 4.5,
    dish: {
      id: 'd4',
      name: 'Pappardelle',
      restaurant: { id: 'r5', name: 'Nonna\u2019s Table' },
      rating: 4.4,
      ratingCount: 3215,
      imageUrl: 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=300&q=80&auto=format&fit=crop',
    },
  },
  {
    id: 'e4',
    dateLabel: '16 Aug',
    rating: 4.5,
    dish: {
      id: 'd2',
      name: 'Charred Chicken Skewers',
      restaurant: { id: 'r3', name: 'Bao & Ember' },
      rating: 4.7,
      ratingCount: 8700,
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&q=80&auto=format&fit=crop',
    },
  },
];
