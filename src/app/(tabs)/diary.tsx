import { BookOpen } from 'lucide-react-native';
import { FlatList, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { listDiaryEntries } from '@/lib/db/diary';
import { getDiaryStats } from '@/lib/db/stats';
import { Screen, Divider } from '@/components/ui/Screen';
import { Heading, BodyText } from '@/components/ui/Typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { FoodDiaryItem } from '@/components/food/FoodDiaryItem';
import type { DiaryEntry, DiaryStats } from '@/types/models';

const EMPTY_STATS: DiaryStats = {
  dishesLogged: 0,
  restaurantsVisited: 0,
  cuisinesExplored: 0,
  averageRating: 0,
};

/** Diary tab — personal chronological log of every dish tried, with summary stats. */
export default function DiaryScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

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

  const refresh = () => {
    void entries.refetch();
    void stats.refetch();
  };

  if (entries.isError) {
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
      <FlatList<DiaryEntry>
        data={entries.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={entries.isRefetching || stats.isRefetching}
            onRefresh={refresh}
            tintColor={colors.textSecondary}
          />
        }
        ListHeaderComponent={
          <View className="gap-lg px-lg pb-md pt-xs">
            <View className="gap-xxs">
              <Heading level={2}>Your diary</Heading>
              <BodyText color="textSecondary">Every dish you&apos;ve tried, in one place.</BodyText>
            </View>
            <ProfileStats stats={stats.data ?? EMPTY_STATS} />
            <Divider />
          </View>
        }
        renderItem={({ item }) => <FoodDiaryItem entry={item} className="px-lg pb-lg" />}
        ListEmptyComponent={
          entries.isPending ? (
            <DiarySkeleton />
          ) : (
            <EmptyState
              icon={<BookOpen size={40} color={colors.textMuted} />}
              title="No entries yet"
              description="Dishes you log will show up here as your personal food diary."
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
