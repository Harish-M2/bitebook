import { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { colors } from '@/constants/colors';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import type { MenuItem } from '@/lib/db/menus';

interface MenuModalProps {
  visible: boolean;
  title: string;
  items: MenuItem[];
  isLoading: boolean;
  onClose: () => void;
}

/**
 * Full-screen modal displaying a restaurant's menu.
 * Shows all items with prices, descriptions, images, and nutrition info.
 * Includes close button and loading/empty states.
 */
export function MenuModal({ visible, title, items, isLoading, onClose }: MenuModalProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const handleSelectItem = useCallback((item: MenuItem) => {
    setSelectedItem(item);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  if (selectedItem) {
    return (
      <MenuItemDetailModal
        item={selectedItem}
        restaurantName={title}
        onClose={handleCloseDetail}
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Heading style={styles.headerTitle}>{title}</Heading>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <X size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <BodyText style={styles.loadingText}>Loading menu...</BodyText>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BodyText style={styles.emptyText}>Menu not available</BodyText>
            <Caption style={styles.emptyCaption}>
              This restaurant doesn&apos;t have menu information available yet.
            </Caption>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                onPress={() => handleSelectItem(item)}
              />
            ))}
            <View style={styles.contentPadding} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

interface MenuItemRowProps {
  item: MenuItem;
  onPress: () => void;
}

/**
 * Single menu item in the list view - compact layout with image, name, and price.
 */
function MenuItemRow({ item, onPress }: MenuItemRowProps) {
  return (
    <Pressable style={styles.itemRow} onPress={onPress}>
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.itemRowImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}
      <View style={styles.itemRowContent}>
        <BodyText style={styles.itemRowName}>{item.name}</BodyText>
        {item.description && (
          <Caption style={styles.itemRowDescription} numberOfLines={1}>
            {item.description}
          </Caption>
        )}
      </View>
      {item.price && (
        <BodyText style={styles.itemRowPrice}>
          ${item.price.toFixed(2)}
        </BodyText>
      )}
    </Pressable>
  );
}

interface MenuItemDetailModalProps {
  item: MenuItem;
  restaurantName: string;
  onClose: () => void;
}

/**
 * Full-screen detail view for a single menu item.
 * Shows large image, full description, price, and nutrition info.
 */
function MenuItemDetailModal({ item, restaurantName, onClose }: MenuItemDetailModalProps) {
  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.detailContainer}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <BodyText style={styles.detailRestaurant}>{restaurantName}</BodyText>
          <Pressable onPress={onClose} style={styles.detailCloseButton} hitSlop={8}>
            <X size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* Item Image */}
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.detailImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}

          {/* Item Info */}
          <View style={styles.detailInfo}>
            <View style={styles.detailTitleRow}>
              <Heading style={styles.detailTitle}>{item.name}</Heading>
              {item.price && (
                <BodyText style={styles.detailPrice}>
                  ${item.price.toFixed(2)}
                </BodyText>
              )}
            </View>

            {/* Description */}
            {item.description && (
              <>
                <BodyText style={styles.detailSectionTitle}>Description</BodyText>
                <BodyText style={styles.detailDescription}>{item.description}</BodyText>
              </>
            )}

            {/* Nutrition Info */}
            {item.nutrition && Object.keys(item.nutrition).length > 0 && (
              <>
                <BodyText style={styles.detailSectionTitle}>Nutrition</BodyText>
                <View style={styles.nutritionGrid}>
                  {item.nutrition.calories && (
                    <NutritionItem label="Calories" value={Math.round(item.nutrition.calories)} />
                  )}
                  {item.nutrition.protein && (
                    <NutritionItem
                      label="Protein"
                      value={Math.round(item.nutrition.protein)}
                      unit="g"
                    />
                  )}
                  {item.nutrition.carbs && (
                    <NutritionItem
                      label="Carbs"
                      value={Math.round(item.nutrition.carbs)}
                      unit="g"
                    />
                  )}
                  {item.nutrition.fat && (
                    <NutritionItem
                      label="Fat"
                      value={Math.round(item.nutrition.fat)}
                      unit="g"
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

interface NutritionItemProps {
  label: string;
  value: number;
  unit?: string;
}

function NutritionItem({ label, value, unit = '' }: NutritionItemProps) {
  return (
    <View style={styles.nutritionItem}>
      <Caption style={styles.nutritionLabel}>{label}</Caption>
      <BodyText style={styles.nutritionValue}>
        {value}
        {unit}
      </BodyText>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 16,
  },
  headerTitle: {
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentPadding: {
    height: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  emptyCaption: {
    textAlign: 'center' as const,
  },
  itemRow: {
    flexDirection: 'row' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center' as const,
    gap: 12,
  },
  itemRowImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  itemRowContent: {
    flex: 1,
  },
  itemRowName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemRowDescription: {
    color: colors.textSecondary,
  },
  itemRowPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent,
  },

  // Detail view styles
  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 16,
  },
  detailRestaurant: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailCloseButton: {
    padding: 8,
  },
  detailContent: {
    flex: 1,
  },
  detailImage: {
    width: undefined,
    height: 300,
    backgroundColor: colors.surface,
  },
  detailInfo: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  detailTitleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
    gap: 12,
  },
  detailTitle: {
    flex: 1,
  },
  detailPrice: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 24,
  },
  nutritionItem: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  nutritionLabel: {
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
};
