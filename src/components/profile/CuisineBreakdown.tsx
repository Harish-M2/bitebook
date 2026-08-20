import { View } from 'react-native';

import { BodyText, Caption } from '@/components/ui/Typography';
import type { CuisineStat } from '@/types/models';

/** Simple horizontal-bar breakdown of the user's most-logged cuisines. */
export function CuisineBreakdown({ data }: { data: CuisineStat[] }) {
  return (
    <View className="gap-sm">
      {data.map((item) => (
        <View key={item.cuisine} className="gap-xxs">
          <View className="flex-row items-center justify-between">
            <BodyText medium>{item.cuisine}</BodyText>
            <Caption>{item.dishCount} dishes</Caption>
          </View>
          <View className="h-1.5 overflow-hidden rounded-pill bg-surface-elevated">
            <View className="h-full rounded-pill bg-accent" style={{ width: `${item.percentage}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}
