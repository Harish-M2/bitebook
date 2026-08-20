import { FlatList, Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { MetadataText } from '@/components/ui/Typography';
import type { UserSummary } from '@/types/models';

export type Story = UserSummary & { isOwnStory?: boolean };

/** Horizontal row of story avatars shown atop the home feed. */
export function StoriesRow({ stories }: { stories: Story[] }) {
  return (
    <FlatList
      horizontal
      data={stories}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 16, paddingHorizontal: 20 }}
      renderItem={({ item }) => (
        <Pressable
          style={{ width: 64, alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={item.isOwnStory ? 'Add your story' : `${item.displayName}'s story`}>
          <View style={{ width: 56, height: 56 }}>
            <View
              className={item.isOwnStory ? undefined : 'rounded-pill border-2 border-accent'}
              style={{ padding: item.isOwnStory ? 0 : 2 }}>
              <Avatar uri={item.avatarUrl} name={item.displayName} size="md" />
            </View>
            {item.isOwnStory ? (
              <View
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.background,
                }}>
                <Plus size={12} color={colors.background} />
              </View>
            ) : null}
          </View>
          <MetadataText numberOfLines={1} style={{ marginTop: 6 }}>
            {item.isOwnStory ? 'You' : item.displayName}
          </MetadataText>
        </Pressable>
      )}
    />
  );
}
