import { View } from 'react-native';

import { Heading, MetadataText } from '@/components/ui/Typography';
import type { DiaryStats } from '@/types/models';

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-xxs">
      <Heading level={3}>{value}</Heading>
      <MetadataText style={{ textAlign: 'center' }}>{label}</MetadataText>
    </View>
  );
}

/** Four-stat summary row shown on Profile and Diary headers. */
export function ProfileStats({ stats }: { stats: DiaryStats }) {
  return (
    <View className="flex-row">
      <StatBlock value={String(stats.dishesLogged)} label="Dishes logged" />
      <StatBlock value={String(stats.restaurantsVisited)} label="Restaurants" />
      <StatBlock value={String(stats.cuisinesExplored)} label="Cuisines" />
      <StatBlock value={stats.averageRating.toFixed(2)} label="Avg rating" />
    </View>
  );
}
