import { Globe, Lock, Users } from 'lucide-react-native';
import { View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { Caption } from '@/components/ui/Typography';
import { useAppTheme } from '@/hooks/useTheme';
import type { ReviewVisibility } from '@/types/database';

type ReviewStepProps = {
  text: string;
  onChangeText: (text: string) => void;
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
  visibility,
  onChangeVisibility,
}: ReviewStepProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-lg px-lg pt-lg">
      <TextField
        label="Notes (optional)"
        placeholder="What made it good? What would you order next time?"
        value={text}
        onChangeText={onChangeText}
        multiline
        autoFocus
        maxLength={MAX_LENGTH}
        textAlignVertical="top"
        hint={`${text.length}/${MAX_LENGTH}`}
        minHeight={120}
      />

      <View className="gap-xs">
        <Caption color="textSecondary">Who can see this</Caption>
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
