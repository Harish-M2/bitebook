import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { listCuisines } from '@/lib/db/cuisines';
import { searchDiscover } from '@/lib/db/discovery';
import { getCuisinePreferences } from '@/lib/db/preferences';
import { listFriendRecommendations, listRecentlyReviewedRestaurants, listRestaurantRatingStats } from '@/lib/db/restaurant-reviews';
import { listRestaurants, listTrendingDishes } from '@/lib/db/restaurants';
import { listSavedRestaurantIds, saveRestaurant, unsaveRestaurant } from '@/lib/db/saved';
import { getFollowing } from '@/lib/db/social';
import { listVisited } from '@/lib/db/visited';
import { queryKeys } from '@/lib/queryClient';

export function useDiscover(query: string, cuisine: string | null, searching: boolean) {
  const { user } = useAuth();
  const client = useQueryClient();
  const userId = user?.id ?? null;
  const cuisines = useQuery({ queryKey: ['cuisines'], queryFn: listCuisines });
  const restaurants = useQuery({ queryKey: [...queryKeys.restaurants(), cuisine], queryFn: () => listRestaurants(cuisine) });
  const dishes = useQuery({ queryKey: ['trending-dishes', cuisine], queryFn: () => listTrendingDishes(cuisine) });
  const ratings = useQuery({ queryKey: ['restaurant-rating-stats', userId], queryFn: listRestaurantRatingStats });
  const recent = useQuery({ queryKey: ['recently-reviewed-restaurants', userId], queryFn: () => listRecentlyReviewedRestaurants(30, true) });
  const friends = useQuery({ queryKey: ['friend-recommendations', userId], queryFn: async () => listFriendRecommendations(await getFollowing(user!.id)), enabled: Boolean(user) });
  const preferences = useQuery({ queryKey: ['cuisine-preferences', userId], queryFn: () => getCuisinePreferences(user!.id), enabled: Boolean(user) });
  const visited = useQuery({ queryKey: ['visited-list', userId], queryFn: listVisited, enabled: Boolean(user) });
  const saved = useQuery({ queryKey: ['saved-restaurants', userId, 'ids'], queryFn: listSavedRestaurantIds, enabled: Boolean(user) });
  const search = useQuery({ queryKey: ['discover-search', userId, query], queryFn: ({ signal }) => searchDiscover(query, signal), enabled: searching });
  const toggleSave = useMutation({
    mutationFn: ({ id, wasSaved }: { id: string; wasSaved: boolean }) => wasSaved ? unsaveRestaurant(id) : saveRestaurant(id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['saved-restaurants'] }),
        client.invalidateQueries({ queryKey: ['is-saved'] }),
        client.invalidateQueries({ queryKey: ['saved-count'] }),
      ]);
    },
  });
  return { cuisines, restaurants, dishes, ratings, recent, friends, preferences, visited, saved, search, toggleSave };
}