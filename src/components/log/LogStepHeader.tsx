import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { Heading, MetadataText } from '@/components/ui/Typography';

type LogStepHeaderProps = {
  title: string;
  stepIndex: number;
  stepCount: number;
  onBack: () => void;
  /** Optional trailing control, e.g. a Skip action. */
  action?: ReactNode;
};

/**
 * Shared header for the log flow: back control, title, and progress.
 *
 * The flow is six screens deep (spec §11) with no tab bar to escape it, so a visible back
 * control and a sense of how much is left are what stop it feeling like a trap.
 */
export function LogStepHeader({
  title,
  stepIndex,
  stepCount,
  onBack,
  action,
}: LogStepHeaderProps) {
  return (
    <View className="gap-sm px-lg pt-xs">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          className="-ml-xxs h-8 w-8 items-center justify-center">
          <ChevronLeft size={26} color={colors.textPrimary} />
        </Pressable>

        <MetadataText>
          Step {stepIndex + 1} of {stepCount}
        </MetadataText>

        <View className="min-w-8 items-end">{action}</View>
      </View>

      <Heading level={2}>{title}</Heading>

      <View className="h-[3px] flex-row gap-xxs">
        {Array.from({ length: stepCount }).map((_, index) => (
          <View
            key={index}
            className="flex-1 rounded-pill"
            style={{
              backgroundColor: index <= stepIndex ? colors.accent : colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
