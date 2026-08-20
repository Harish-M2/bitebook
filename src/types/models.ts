/**
 * Presentation-layer types used by Phase 1 UI and mock data.
 *
 * These describe shapes the UI needs, not the database schema — the real schema
 * is introduced in Phase 2 (see Bitebook_Build_Instructions.md, section 18) and
 * these types will be superseded/derived from the generated Supabase types then.
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
  imageUrl: string;
};

export type Dish = {
  id: string;
  name: string;
  restaurant: Pick<Restaurant, 'id' | 'name'>;
  rating: number;
  ratingCount: number;
  imageUrl: string;
};

export type FeedActivity = {
  id: string;
  actor: UserSummary;
  kind: 'logged_dish' | 'reviewed_restaurant';
  dish?: Dish;
  restaurant?: Restaurant;
  reviewText?: string;
  photoUrl: string;
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
