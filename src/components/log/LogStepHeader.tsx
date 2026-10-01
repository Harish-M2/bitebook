import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Heading, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';

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
    <View className="px-lg pt-xs">
      <View style={{ width: '100%', maxWidth: 980, alignSelf: 'center', gap: 10 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            className="-ml-xxs h-8 w-8 items-center justify-center">
            <ChevronLeft size={26} color={colors.textPrimary} />
          </Pressable>

          <MetadataText style={{ letterSpacing: 0.3 }}>
            Step {stepIndex + 1} of {stepCount}
          </MetadataText>

          <View className="min-w-8 items-end">{action}</View>
        </View>

        <Heading level={2} style={{ lineHeight: 30 }}>{title}</Heading>

        <View className="h-[2px] flex-row gap-xxs overflow-hidden rounded-full">
          {Array.from({ length: stepCount }).map((_, index) => (
            <View
              key={index}
              className="flex-1 rounded-full"
              style={{
                backgroundColor: index <= stepIndex ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
