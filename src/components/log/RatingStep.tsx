import { View } from 'react-native';

import { RatingInput } from '@/components/ui/RatingInput';
import { BodyText, DisplayText, MetadataText } from '@/components/ui/Typography';

type RatingStepProps = {
  dishName: string;
  value: number;
  onChange: (value: number) => void;
};

/**
 * Spec §37's wording for each half of the scale. Numbers alone invite drift — one person's
 * 3 is another's 4 — and a word anchors what the number is supposed to mean.
 */
const LABELS: [number, string][] = [
  [5, 'Perfect — would queue for this'],
  [4.5, 'Outstanding'],
  [4, 'Really good'],
  [3.5, 'Good'],
  [3, 'Solid'],
  [2.5, 'Fine'],
  [2, 'Disappointing'],
  [1.5, 'Poor'],
  [1, 'Bad'],
  [0.5, 'Inedible'],
];

function labelFor(value: number): string {
  return LABELS.find(([threshold]) => value >= threshold)?.[1] ?? '';
}

/** Step 3 — the rating. The one genuinely required field in the flow. */
export function RatingStep({ dishName, value, onChange }: RatingStepProps) {
  return (
    <View className="flex-1 items-center justify-center px-lg py-lg">
      <View style={{ width: '100%', maxWidth: 960, alignItems: 'center', gap: 18 }}>
        <BodyText color="textSecondary" style={{ textAlign: 'center', fontSize: 18 }}>
          How was the {dishName}?
        </BodyText>

        <View style={{ width: '100%', maxWidth: 760 }}>
          <RatingInput value={value} onChange={onChange} className="w-full" />
        </View>

        {value > 0 ? (
          <View className="items-center gap-xxs">
            <DisplayText>{value.toFixed(1)}</DisplayText>
            <MetadataText style={{ textAlign: 'center' }}>{labelFor(value)}</MetadataText>
          </View>
        ) : (
          <MetadataText>Tap a star. Tap its left half for a half point.</MetadataText>
        )}
      </View>
    </View>
  );
}
