import { View, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import type { UserGalleryItem } from '@/lib/db/gallery';

interface GalleryGridProps {
  items: UserGalleryItem[];
  isLoading?: boolean;
}

const GRID_COLUMNS = 3;
const GAP = 8;

/**
 * Grid display of user's dish photos (3 columns).
 * Tapping an item navigates to the detail view showing all photos from that review.
 */
export function GalleryGrid({ items, isLoading }: GalleryGridProps) {
  const router = useRouter();

  const handlePress = (item: UserGalleryItem) => {
    router.push(`/gallery-detail?reviewId=${item.reviewId}`);
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.reviewId}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={{
        gap: GAP,
        marginHorizontal: 12,
      }}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => handlePress(item)}
          style={{ flex: 1 / GRID_COLUMNS }}
          accessibilityRole="button"
          accessibilityLabel={`${item.dishName} at ${item.restaurantName}`}>
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: colors.surfaceElevated,
            }}>
            {item.photoUrl ? (
              <Image
                source={item.photoUrl}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.surfaceElevated,
                }}
              />
            )}
          </View>
        </Pressable>
      )}
    />
  );
}
