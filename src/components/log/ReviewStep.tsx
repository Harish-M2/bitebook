import { Globe, Lock, Users } from 'lucide-react-native';
import { View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { RatingInput } from '@/components/ui/RatingInput';
import { TextField } from '@/components/ui/TextField';
import { Caption, MetadataText } from '@/components/ui/Typography';
import { RESTAURANT_RECOMMENDATIONS } from '@/constants/recommendations';
import { useAppTheme } from '@/hooks/useTheme';
import type { ReviewVisibility } from '@/types/database';

type ReviewStepProps = {
  text: string;
  onChangeText: (text: string) => void;
  overallRating: number;
  onChangeOverallRating: (rating: number) => void;
  visitedAt: string;
  onChangeVisitedAt: (date: string) => void;
  recommendationTier: number | null;
  onChangeRecommendationTier: (tier: number) => void;
  visibility: ReviewVisibility;
  onChangeVisibility: (visibility: ReviewVisibility) => void;
};

const MAX_LENGTH = 2000;
const VISIBILITY_OPTIONS: {
  value: ReviewVisibility;
  label: string;
  icon: typeof Globe;
}[] = [
  { value: 'public', label: 'Everyone', icon: Globe },
  { value: 'followers', label: 'Followers', icon: Users },
  { value: 'private', label: 'Only me', icon: Lock },
];

/**
 * Step 5 — the words. Optional: spec §37 treats the rating as the required part and the
 * note as a bonus, so a wordless log is a complete log.
 */
export function ReviewStep({
  text,
  onChangeText,
  overallRating,
  onChangeOverallRating,
  visitedAt,
  onChangeVisitedAt,
  recommendationTier,
  onChangeRecommendationTier,
  visibility,
  onChangeVisibility,
}: ReviewStepProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-md px-lg pt-md pb-sm">
      <View className="gap-xxs">
        <Caption color="textSecondary">Overall experience</Caption>
        <RatingInput value={overallRating} onChange={onChangeOverallRating} className="self-start" />
      </View>

      <View className="gap-xs">
        <Caption color="textSecondary">Would you recommend this restaurant?</Caption>
        <View className="flex-row gap-xs">
          {RESTAURANT_RECOMMENDATIONS.map((option) => (
            <Chip
              key={option.tier}
              label={option.emoji}
              selected={recommendationTier === option.tier}
              accessibilityLabel={`${option.tier}: ${option.label}`}
              className="flex-1 justify-center px-xs py-xxs"
              onPress={() => onChangeRecommendationTier(option.tier)}
            />
          ))}
        </View>
        {recommendationTier !== null ? (
          <MetadataText>
            {RESTAURANT_RECOMMENDATIONS.find((option) => option.tier === recommendationTier)?.label}
          </MetadataText>
        ) : null}
      </View>

      <TextField
        label="Visit date"
        value={visitedAt}
        onChangeText={onChangeVisitedAt}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        hint="Use the date you visited"
      />

      <TextField
        label="Restaurant notes (optional)"
        placeholder="How was the service, atmosphere, and overall experience?"
        value={text}
        onChangeText={onChangeText}
        multiline
        autoFocus
        maxLength={MAX_LENGTH}
        textAlignVertical="top"
        hint={`${text.length}/${MAX_LENGTH}`}
        minHeight={88}
      />

      <View className="gap-xxs">
        <Caption color="textSecondary">Who can see this visit</Caption>
        <View className="flex-row gap-xs">
          {VISIBILITY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = visibility === option.value;
            return (
              <Chip
                key={option.value}
                label={option.label}
                selected={selected}
                icon={
                  <Icon
                    size={13}
                    color={selected ? colors.background : colors.textSecondary}
                  />
                }
                onPress={() => onChangeVisibility(option.value)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
