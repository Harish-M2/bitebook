import { ExternalLink } from '@/components/external-link';
import { ErrorState } from '@/components/ui/ErrorState';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import type { Palette } from '@/constants/colors';
import { useAppTheme } from '@/hooks/useTheme';
import type { MenuItem } from '@/lib/db/menus';
import { formatMenuPrice } from '@/lib/format';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';

interface MenuModalProps {
  visible: boolean;
  title: string;
  items: MenuItem[];
  isLoading: boolean;
  onClose: () => void;
  error?: string;
  onRetry?: () => void;
}

/**
 * Full-screen modal displaying a restaurant's menu.
 * Shows all items with prices, descriptions, images, and nutrition info.
 * Includes close button and loading/empty states.
 */
export function MenuModal({ visible, title, items, isLoading, onClose, error, onRetry }: MenuModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const handleSelectItem = useCallback((item: MenuItem) => {
    setSelectedItem(item);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  if (visible && selectedItem) {
    return (
      <MenuItemDetailModal
        item={selectedItem}
        restaurantName={title}
        onClose={handleCloseDetail}
        styles={styles}
        colors={colors}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Heading style={styles.headerTitle}>{title}</Heading>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close menu">
            <X size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <BodyText style={styles.loadingText}>Loading menu...</BodyText>
          </View>
        ) : error ? (
          <ErrorState title="Could not load menu" description={error} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BodyText style={styles.emptyText}>Menu not available here yet</BodyText>
            <Caption style={styles.emptyCaption}>
              Our menu provider doesn&apos;t have a menu for this restaurant. You can search for it online.
            </Caption>
            <ExternalLink
              href={`https://www.google.com/search?q=${encodeURIComponent(`${title} restaurant menu`)}`}
              className="mt-md">
              <BodyText color="accent">Search for this menu online</BodyText>
            </ExternalLink>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                onPress={() => handleSelectItem(item)}
                styles={styles}
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
  styles: ReturnType<typeof createStyles>;
}

/**
 * Single menu item in the list view - compact layout with image, name, and price.
 */
function MenuItemRow({ item, onPress, styles }: MenuItemRowProps) {
  const price = formatMenuPrice(item.price, item.currency);
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
      {price !== null && (
        <BodyText style={styles.itemRowPrice}>
          {price}
        </BodyText>
      )}
    </Pressable>
  );
}

interface MenuItemDetailModalProps {
  item: MenuItem;
  restaurantName: string;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Palette;
}

/**
 * Full-screen detail view for a single menu item.
 * Shows large image, full description, price, and nutrition info.
 */
function MenuItemDetailModal({ item, restaurantName, onClose, styles, colors }: MenuItemDetailModalProps) {
  const price = formatMenuPrice(item.price, item.currency);
  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
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
              {price !== null && (
                <BodyText style={styles.detailPrice}>
                  {price}
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
                    <NutritionItem label="Calories" value={Math.round(item.nutrition.calories)} styles={styles} />
                  )}
                  {item.nutrition.protein && (
                    <NutritionItem
                      label="Protein"
                      value={Math.round(item.nutrition.protein)}
                      unit="g"
                      styles={styles}
                    />
                  )}
                  {item.nutrition.carbs && (
                    <NutritionItem
                      label="Carbs"
                      value={Math.round(item.nutrition.carbs)}
                      unit="g"
                      styles={styles}
                    />
                  )}
                  {item.nutrition.fat && (
                    <NutritionItem
                      label="Fat"
                      value={Math.round(item.nutrition.fat)}
                      unit="g"
                      styles={styles}
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
  styles: ReturnType<typeof createStyles>;
}

function NutritionItem({ label, value, unit = '', styles }: NutritionItemProps) {
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

function createStyles(colors: Palette) {
  return {
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
}
