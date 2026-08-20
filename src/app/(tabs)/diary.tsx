import { BookOpen } from 'lucide-react-native';
import { FlatList, View } from 'react-native';

import { colors } from '@/constants/colors';
import { Screen, Divider } from '@/components/ui/Screen';
import { Heading, BodyText } from '@/components/ui/Typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { FoodDiaryItem } from '@/components/food/FoodDiaryItem';
import { mockDiaryEntries, mockDiaryStats } from '@/mock-data/diary';
import type { DiaryEntry } from '@/types/models';

/** Diary tab — personal chronological log of every dish tried, with summary stats. */
export default function DiaryScreen() {
  return (
    <Screen>
      <FlatList<DiaryEntry>
        data={mockDiaryEntries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-lg px-lg pb-md pt-xs">
            <View className="gap-xxs">
              <Heading level={2}>Your diary</Heading>
              <BodyText color="textSecondary">Every dish you&apos;ve tried, in one place.</BodyText>
            </View>
            <ProfileStats stats={mockDiaryStats} />
            <Divider />
          </View>
        }
        renderItem={({ item }) => <FoodDiaryItem entry={item} className="px-lg pb-lg" />}
        ListEmptyComponent={
          <EmptyState
            icon={<BookOpen size={40} color={colors.textMuted} />}
            title="No entries yet"
            description="Dishes you log will show up here as your personal food diary."
          />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
    </Screen>
  );
}
