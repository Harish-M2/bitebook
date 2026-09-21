import { Images } from 'lucide-react-native';
import { FlatList, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { getUserGallery } from '@/lib/db/gallery';
import { Screen } from '@/components/ui/Screen';
import { Heading, BodyText } from '@/components/ui/Typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import type { UserGalleryItem } from '@/lib/db/gallery';

/**
 * Gallery tab — visual grid of all dish photos user has uploaded.
 * Tap a photo to see all photos from that review with details.
 */
export default function GalleryScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const gallery = useQuery({
    queryKey: ['user-gallery', userId],
    queryFn: () => getUserGallery(userId as string),
    enabled: userId !== null,
  });

  if (gallery.isError) {
    return (
      <Screen>
        <ErrorState
          title="Could not load gallery"
          description={gallery.error.message}
          onRetry={() => void gallery.refetch()}
        />
      </Screen>
    );
  }

  const items = gallery.data ?? [];

  return (
    <Screen>
      <FlatList<UserGalleryItem>
        data={items}
        keyExtractor={(item) => item.reviewId}
        refreshControl={
          <RefreshControl
            refreshing={gallery.isRefetching}
            onRefresh={() => void gallery.refetch()}
            tintColor={colors.textSecondary}
          />
        }
        ListHeaderComponent={
          <View className="gap-lg px-lg pb-md pt-xs">
            <View className="gap-xxs">
              <Heading level={2}>Your gallery</Heading>
              <BodyText color="textSecondary">
                {items.length === 0 ? 'No photos yet' : `${items.length} photos`}
              </BodyText>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          if (index === 0) {
            return <GalleryGrid items={items} />;
          }
          return null;
        }}
        ListEmptyComponent={
          gallery.isPending ? (
            <GallerySkeleton />
          ) : (
            <EmptyState
              icon={<Images size={40} color={colors.textMuted} />}
              title="No photos yet"
              description="Photos from dishes you log will appear here as your food gallery."
            />
          )
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
    </Screen>
  );
}

function GallerySkeleton() {
  return (
    <View className="gap-2 px-3 pb-8 pt-4">
      <View className="flex-row gap-2">
        {[0, 1, 2].map((col) => (
          <View key={col} className="flex-1">
            <Skeleton width="100%" height={120} borderRadius={12} />
          </View>
        ))}
      </View>
      <View className="flex-row gap-2">
        {[0, 1, 2].map((col) => (
          <View key={col + 3} className="flex-1">
            <Skeleton width="100%" height={120} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
}
