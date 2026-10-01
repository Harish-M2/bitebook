import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Rating } from '@/components/ui/Rating';
import { Screen } from '@/components/ui/Screen';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { getDish } from '@/lib/db/dishes';

export default function DishDetailScreen() {
  const router = useRouter();
  const { dishId } = useLocalSearchParams<{ dishId: string }>();
  const dish = useQuery({
    queryKey: ['dish', dishId],
    queryFn: () => getDish(dishId!),
    enabled: Boolean(dishId),
  });

  if (dish.isPending) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (dish.isError || !dish.data) {
    return (
      <Screen>
        <ErrorState
          title="Could not load this dish"
          description={dish.error?.message ?? 'Dish not found.'}
          onRetry={() => void dish.refetch()}
        />
      </Screen>
    );
  }

  const data = dish.data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ width: '100%', maxWidth: 980, alignSelf: 'center' }}>
          <Image
            source={data.imageUrl ?? undefined}
            accessibilityLabel={data.name}
            style={{ width: '100%', height: 360, backgroundColor: colors.surfaceElevated, borderRadius: 24 }}
            contentFit="cover"
          />
          <View className="gap-md px-lg pt-lg">
            <View className="gap-xxs">
              <Heading level={1}>{data.name}</Heading>
              <Caption>{data.restaurant.name}</Caption>
            </View>
            {data.rating !== null ? (
              <Rating value={data.rating} size="lg" count={`${data.ratingCount} people have tried this`} />
            ) : (
              <Caption>No ratings yet</Caption>
            )}
            {data.description ? <BodyText color="textSecondary">{data.description}</BodyText> : null}
            <View className="flex-row gap-sm">
              <Button label="Log" size="lg" onPress={() => router.push('/(tabs)/log')} />
              <Pressable
                className="h-[52px] w-[52px] items-center justify-center rounded-md border border-border"
                accessibilityRole="button"
                accessibilityLabel="Share dish">
                <Share2 size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Heading level={2}>Reviews from people you follow</Heading>
            <Caption color="textSecondary">Reviews will appear here as your network logs this dish.</Caption>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}