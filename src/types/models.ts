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

export type RestaurantVisit = {
  id: string;
  userId: string;
  createdAt: string;
  visitedAt: string;
  overallRating: number;
  recommendationTier: number;
  restaurantComment: string | null;
  foodRating: number | null;
  serviceRating: number | null;
  atmosphereRating: number | null;
  valueRating: number | null;
  spendAmount: number | null;
  partySize: number | null;
  seatingType: string | null;
  actor: UserSummary;
  restaurant: {
    id: string;
    name: string;
    city: string | null;
    priceLevel: number | null;
    imageUrl: string | null;
  };
  dishes: {
    id: string;
    reviewId: string;
    name: string;
    rating: number;
    reviewText: string | null;
  }[];
  media: {
    id: string;
    dishReviewId: string | null;
    type: 'image' | 'video';
    position: number;
    url: string | null;
  }[];
  photoUrl: string | null;
};

export type FeedActivity = {
  id: string;
  actor: UserSummary;
  kind: 'logged_dish' | 'reviewed_restaurant' | 'restaurant_visit';
  dish?: Dish;
  restaurant?: Restaurant;
  visit?: RestaurantVisit;
  reviewText?: string;
  photoUrl: string | null;
  /** Pre-formatted relative time, e.g. "2h". */
  postedAgo: string;
  likeCount: number;
  commentCount: number;
  review_id?: string;
  restaurant_id?: string;
  createdAt?: string;
};

export type DiaryEntry = {
  id: string;
  dish: Dish;
  restaurantReviewId?: string | null;
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
