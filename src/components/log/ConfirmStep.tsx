import { View } from 'react-native';
import { Image } from 'expo-image';
import { Globe, Lock, MapPin, Users, UtensilsCrossed } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import type { ReviewVisibility } from '@/types/database';
import { Rating } from '@/components/ui/Rating';
import { Surface } from '@/components/ui/Surface';
import { BodyText, Caption, Heading, MetadataText } from '@/components/ui/Typography';

type ConfirmStepProps = {
  restaurantName: string;
  city: string | null;
  dishName: string;
  rating: number;
  photoUri: string | null;
  reviewText: string;
  visibility: ReviewVisibility;
};

const VISIBILITY_COPY: Record<ReviewVisibility, string> = {
  public: 'Visible to everyone',
  followers: 'Visible to your followers',
  private: 'Only visible to you',
};

const VISIBILITY_ICON = { public: Globe, followers: Users, private: Lock } as const;

/** Step 6 — one last look before it is written. Nothing here is editable; back goes to it. */
export function ConfirmStep({
  restaurantName,
  city,
  dishName,
  rating,
  photoUri,
  reviewText,
  visibility,
}: ConfirmStepProps) {
  const VisibilityIcon = VISIBILITY_ICON[visibility];

  return (
    <View className="gap-md px-lg pt-lg">
      {photoUri ? (
        <Image
          source={photoUri}
          contentFit="cover"
          transition={150}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
        />
      ) : null}

      <Surface className="gap-sm p-md">
        <View className="gap-xxs">
          <Heading level={3} numberOfLines={2}>
            {dishName}
          </Heading>
          <View className="flex-row items-center gap-xxs">
            <UtensilsCrossed size={13} color={colors.textMuted} />
            <Caption numberOfLines={1}>
              {city ? `${restaurantName} · ${city}` : restaurantName}
            </Caption>
          </View>
        </View>

        <Rating value={rating} size="lg" />

        {reviewText.trim().length > 0 ? (
          <BodyText color="textSecondary">{reviewText.trim()}</BodyText>
        ) : null}

        <View className="flex-row items-center gap-xxs">
          <VisibilityIcon size={12} color={colors.textMuted} />
          <MetadataText>{VISIBILITY_COPY[visibility]}</MetadataText>
        </View>
      </Surface>

      <View className="flex-row items-center gap-xxs">
        <MapPin size={12} color={colors.textMuted} />
        <MetadataText>Logged for today</MetadataText>
      </View>
    </View>
  );
}
