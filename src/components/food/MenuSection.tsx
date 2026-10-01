import { BodyText, Caption } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import type { MenuItem } from '@/lib/db/menus';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

interface MenuSectionProps {
  items: MenuItem[];
  isLoading: boolean;
  onItemPress?: (item: MenuItem) => void;
}

/**
 * Displays menu items in a scrollable list.
 * Shows item name, price, description, and image if available.
 */
export function MenuSection({ items, isLoading, onItemPress }: MenuSectionProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <BodyText style={styles.loadingText}>Loading menu...</BodyText>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BodyText style={styles.emptyText}>Menu not available</BodyText>
        <Caption style={styles.emptyCaption}>No menu items found for this restaurant</Caption>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BodyText style={styles.title}>Menu</BodyText>
      <FlatList
        data={items}
        renderItem={({ item }) => (
          <MenuItemCard item={item} onPress={() => onItemPress?.(item)} />
        )}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

interface MenuItemCardProps {
  item: MenuItem;
  onPress?: () => void;
}

/**
 * Individual menu item card showing name, description, price, and image.
 */
function MenuItemCard({ item, onPress }: MenuItemCardProps) {
  return (
    <Pressable style={styles.itemContainer} onPress={onPress}>
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.itemImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}
      <View style={styles.itemContent}>
        <BodyText style={styles.itemName}>{item.name}</BodyText>
        {item.description && (
          <Caption style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Caption>
        )}
        {item.price && (
          <BodyText style={styles.itemPrice}>
            {item.currency || 'USD'} {item.price.toFixed(2)}
          </BodyText>
        )}
        {item.nutrition?.calories && (
          <Caption style={styles.itemNutrition}>
            {Math.round(item.nutrition.calories)} cal
          </Caption>
        )}
      </View>
    </Pressable>
  );
}

const styles = {
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
    color: colors.textPrimary,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptyCaption: {
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row' as const,
    paddingVertical: 12,
    gap: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemDescription: {
    marginBottom: 6,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent,
    marginBottom: 4,
  },
  itemNutrition: {
    fontSize: 12,
    color: colors.textSecondary,
  },
};
