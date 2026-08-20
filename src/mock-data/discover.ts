/**
 * MOCK DATA — Phase 1 only. See feed.ts for the removal note.
 */
import type { Dish, Restaurant } from '@/types/models';

export const mockTrendingDishes: Dish[] = [
  {
    id: 'd1',
    name: 'Smoked Lamb Shoulder',
    restaurant: { id: 'r1', name: 'Copper Tandoor' },
    rating: 4.8,
    ratingCount: 12400,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=700&q=80&auto=format&fit=crop',
  },
  {
    id: 'd2',
    name: 'Charred Chicken Skewers',
    restaurant: { id: 'r3', name: 'Bao & Ember' },
    rating: 4.7,
    ratingCount: 8700,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=700&q=80&auto=format&fit=crop',
  },
  {
    id: 'd3',
    name: 'Smash Burger',
    restaurant: { id: 'r4', name: 'Black Bear Burger' },
    rating: 4.6,
    ratingCount: 6300,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80&auto=format&fit=crop',
  },
];

export const mockNearbyRestaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'Copper Tandoor',
    cuisine: 'Indian',
    priceLevel: '££',
    city: 'Kensington, London',
    distanceLabel: '0.3 mi',
    rating: 4.6,
    reviewCount: 8421,
    imageUrl: 'https://picsum.photos/seed/bitebook-tandoor/700/700',
  },
  {
    id: 'r2',
    name: 'Ember & Salt',
    cuisine: 'British',
    priceLevel: '££',
    city: 'Shoreditch, London',
    distanceLabel: '0.6 mi',
    rating: 4.5,
    reviewCount: 2103,
    imageUrl: 'https://picsum.photos/seed/bitebook-ember/700/700',
  },
  {
    id: 'r5',
    name: 'Nonna\u2019s Table',
    cuisine: 'Italian',
    priceLevel: '£',
    city: 'Borough, London',
    distanceLabel: '1.0 mi',
    rating: 4.4,
    reviewCount: 3215,
    imageUrl: 'https://picsum.photos/seed/bitebook-nonna/700/700',
  },
];

export const mockQuickFilters = [
  { id: 'near', label: 'Near you' },
  { id: 'dishes', label: 'Dishes' },
  { id: 'cuisines', label: 'Cuisines' },
  { id: 'top', label: 'Top rated' },
  { id: 'open', label: 'Open now' },
] as const;
