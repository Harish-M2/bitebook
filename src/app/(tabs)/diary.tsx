import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { FoodDiaryItem, VisitedDiaryItem } from '@/components/food/FoodDiaryItem';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Divider, Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { BodyText, Heading } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { listDiaryEntries } from '@/lib/db/diary';
import { getDiaryStats } from '@/lib/db/stats';
import { listVisited, type VisitedRestaurant } from '@/lib/db/visited';
import { queryKeys } from '@/lib/queryClient';
import type { DiaryEntry, DiaryStats } from '@/types/models';

const EMPTY_STATS: DiaryStats = {
  dishesLogged: 0,
  restaurantsVisited: 0,
  cuisinesExplored: 0,
  averageRating: 0,
};
type DiaryRow = { kind: 'dish'; entry: DiaryEntry } | { kind: 'visit'; visit: VisitedRestaurant };

/** Diary tab — personal chronological log of every dish tried, with summary stats. */
export default function DiaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const userId = user?.id ?? null;
  const [view, setView] = useState<'All' | 'Dishes' | 'Visits'>('All');

  const entries = useQuery({
    queryKey: queryKeys.diary(userId ?? ''),
    queryFn: () => listDiaryEntries(userId as string),
    enabled: userId !== null,
  });

  const stats = useQuery({
    queryKey: queryKeys.diaryStats(userId ?? ''),
    queryFn: () => getDiaryStats(userId as string),
    enabled: userId !== null,
  });
  const visits = useQuery({ queryKey: ['visited-list', userId], queryFn: listVisited, enabled: userId !== null });
  const rows: DiaryRow[] = [
    ...(view === 'Visits' ? [] : (entries.data ?? []).map((entry) => ({ kind: 'dish' as const, entry }))),
    ...(view === 'Dishes' ? [] : (visits.data ?? []).map((visit) => ({ kind: 'visit' as const, visit }))),
  ].sort((first, second) => {
    const date = (row: DiaryRow) => row.kind === 'dish' ? row.entry.eatenAt ?? '' : row.visit.visited_at;
    return date(second).localeCompare(date(first));
  });

  const refresh = () => {
    void entries.refetch();
    void stats.refetch();
    void visits.refetch();
  };

  if (entries.isError && visits.isError) {
    return (
      <Screen>
        <ErrorState
          title="Could not load your diary"
          description={entries.error.message}
          onRetry={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList<DiaryRow>
        data={rows}
        keyExtractor={(item) => item.kind === 'dish' ? `dish-${item.entry.id}` : `visit-${item.visit.id}`}
        refreshControl={
          <RefreshControl
            refreshing={entries.isRefetching || visits.isRefetching || stats.isRefetching}
            onRefresh={refresh}
            tintColor={colors.textSecondary}
          />
        }
        ListHeaderComponent={
          <View className="gap-lg px-lg pb-md pt-xs">
            <View className="gap-xxs">
              <Heading level={2}>Your diary</Heading>
              <BodyText color="textSecondary">Your visits and dishes, in one place.</BodyText>
            </View>
            <ProfileStats stats={stats.data ?? EMPTY_STATS} />
            <Button label="Visited restaurants" variant="outline" onPress={() => router.push('/visited')} />
            <View className="flex-row gap-xs">{(['All', 'Dishes', 'Visits'] as const).map((label) =>
              <Chip key={label} label={label} selected={view === label} onPress={() => setView(label)} />)}</View>
            {entries.isError ? <ErrorState title="Could not load dishes" description={entries.error.message} onRetry={refresh} /> : null}
            {visits.isError ? <ErrorState title="Could not load visits" description={visits.error.message} onRetry={refresh} /> : null}
            {stats.isError ? <ErrorState title="Could not load diary statistics" description={stats.error.message} onRetry={refresh} /> : null}
            <Divider />
          </View>
        }
        renderItem={({ item }) => item.kind === 'visit' ? <VisitedDiaryItem visit={item.visit}
          onPress={() => router.push({ pathname: '/visit-edit', params: { visitId: item.visit.id } })} /> : (
          <FoodDiaryItem
            entry={item.entry}
            className="px-lg pb-lg"
            onPress={() => {
              if (item.entry.restaurantReviewId) {
                router.push({
                  pathname: '/restaurant-review-detail',
                  params: { restaurantReviewId: item.entry.restaurantReviewId },
                });
              } else {
                router.push({ pathname: '/dish-detail', params: { dishId: item.entry.dish.id } });
              }
            }}
          />
        )}
        ListEmptyComponent={
          (view !== 'Visits' && entries.isLoading) || (view !== 'Dishes' && visits.isLoading) ? (
            <DiarySkeleton />
          ) : (
            <EmptyState
              icon={<BookOpen size={40} color={colors.textMuted} />}
              title="No entries yet"
              description="Visits and dishes you log will appear in your personal diary."
            />
          )
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
    </Screen>
  );
}

function DiarySkeleton() {
  return (
    <View className="gap-lg px-lg">
      {[0, 1, 2, 3].map((row) => (
        <View key={row} className="flex-row items-center gap-sm">
          <Skeleton width={40} height={12} />
          <View className="flex-1 gap-xxs">
            <Skeleton width="70%" height={14} />
            <Skeleton width="45%" height={12} />
          </View>
          <Skeleton width={48} height={48} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}
