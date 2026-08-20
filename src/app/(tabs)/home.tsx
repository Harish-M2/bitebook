import { UtensilsCrossed } from 'lucide-react-native';
import { FlatList, View } from 'react-native';

import { colors } from '@/constants/colors';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { FeedItem } from '@/components/feed/FeedItem';
import { mockFeed, mockStories } from '@/mock-data/feed';
import type { FeedActivity } from '@/types/models';

/** Home tab — stories row + the following feed. Uses Phase 1 mock data only. */
export default function HomeScreen() {
  return (
    <Screen>
      <FlatList<FeedActivity>
        data={mockFeed}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-md pb-md">
            <Heading level={2} className="px-lg pt-xs">
              Bitebook
            </Heading>
            <StoriesRow stories={mockStories} />
          </View>
        }
        renderItem={({ item }) => <FeedItem activity={item} className="px-lg pb-lg" />}
        ItemSeparatorComponent={() => <View className="mx-lg mb-lg h-[1px] bg-border" />}
        ListEmptyComponent={
          <EmptyState
            icon={<UtensilsCrossed size={40} color={colors.textMuted} />}
            title="Your feed is quiet"
            description="Follow friends to see what they're trying and rating."
          />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
    </Screen>
  );
}
