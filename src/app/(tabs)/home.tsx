import { UtensilsCrossed } from 'lucide-react-native';
import { FlatList, RefreshControl, View } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { listFeed } from '@/lib/db/feed';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { FeedItem } from '@/components/feed/FeedItem';
import { CommentsModal } from '@/components/ui/CommentsModal';
import type { FeedActivity } from '@/types/models';

/** Home tab — the following feed. */
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string>('');

  const feed = useQuery({
    queryKey: queryKeys.feed(userId ?? ''),
    queryFn: () => listFeed(userId as string),
    enabled: userId !== null,
  });

  const handleCommentPress = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setCommentsVisible(true);
  };

  if (feed.isError) {
    return (
      <Screen>
        <ErrorState
          title="Could not load your feed"
          description={feed.error.message}
          onRetry={() => void feed.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList<FeedActivity>
        data={feed.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => void feed.refetch()}
            tintColor={colors.textSecondary}
          />
        }
        ListHeaderComponent={
          <View className="pb-md">
            <Heading level={2} className="px-lg pt-xs">
              Bitebook
            </Heading>
          </View>
        }
        renderItem={({ item }) => (
          <FeedItem
            activity={item}
            className="px-lg pb-lg"
            onActorPress={() =>
              router.push({ pathname: '/user/[userId]', params: { userId: item.actor.id } })
            }
            onCommentPress={() => handleCommentPress(item.review_id ?? item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View className="mx-lg mb-lg h-[1px] bg-border" />}
        ListEmptyComponent={
          feed.isPending ? (
            <FeedSkeleton />
          ) : (
            <EmptyState
              icon={<UtensilsCrossed size={40} color={colors.textMuted} />}
              title="Your feed is quiet"
              description="Follow friends to see what they're trying and rating."
            />
          )
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
      <CommentsModal
        visible={commentsVisible}
        reviewId={selectedReviewId}
        onClose={() => setCommentsVisible(false)}
      />
    </Screen>
  );
}

function FeedSkeleton() {
  return (
    <View className="gap-lg px-lg">
      {[0, 1].map((card) => (
        <View key={card} className="gap-sm">
          <View className="flex-row items-center gap-xs">
            <Skeleton width={32} height={32} borderRadius={16} />
            <View className="flex-1 gap-xxs">
              <Skeleton width="40%" height={14} />
              <Skeleton width="25%" height={12} />
            </View>
          </View>
          <Skeleton width="100%" height={320} borderRadius={16} />
          <Skeleton width="55%" height={14} />
        </View>
      ))}
    </View>
  );
}
