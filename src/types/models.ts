/**
 * Presentation-layer types: the shapes the UI renders, deliberately decoupled from the
 * database schema. Supabase rows are mapped into these in `src/lib/db/*`, so a schema
 * change touches one mapper rather than every component.
 *
 * Image fields are nullable because real records frequently have no photo yet — only mock
 * data could guarantee one.
 */

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type PriceLevel = '£' | '££' | '£££' | '££££';

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: PriceLevel;
  city: string;
  distanceLabel?: string;
  rating: number;
  reviewCount: number;
  imageUrl: string | null;
};

export type Dish = {
  id: string;
  name: string;
  restaurant: Pick<Restaurant, 'id' | 'name'>;
  rating: number;
  ratingCount: number;
  imageUrl: string | null;
};

export type FeedActivity = {
  id: string;
  actor: UserSummary;
  kind: 'logged_dish' | 'reviewed_restaurant';
  dish?: Dish;
  restaurant?: Restaurant;
  reviewText?: string;
  photoUrl: string | null;
  /** Pre-formatted relative time, e.g. "2h". */
  postedAgo: string;
  likeCount: number;
  commentCount: number;
};

export type DiaryEntry = {
  id: string;
  dish: Dish;
  /** Pre-formatted date label, e.g. "20 Aug". */
  dateLabel: string;
  rating: number;
};

export type DiaryStats = {
  dishesLogged: number;
  restaurantsVisited: number;
  cuisinesExplored: number;
  averageRating: number;
};

export type CuisineStat = {
  cuisine: string;
  dishCount: number;
  /** 0–100, used for the breakdown bar width. */
  percentage: number;
};
