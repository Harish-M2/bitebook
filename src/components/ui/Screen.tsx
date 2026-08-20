import { View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { spacing, type SpacingToken } from '@/constants/spacing';

type ScreenProps = ViewProps & {
  /** Safe-area edges to apply padding for. Defaults to top-only since most screens
   * sit above the tab bar, which already handles the bottom inset. */
  edges?: readonly Edge[];
};

/** Full-screen container with the Bitebook background colour and safe-area handling. */
export function Screen({ children, className, edges = ['top', 'left', 'right'], ...rest }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className={cn('flex-1 bg-background', className)} {...rest}>
      {children}
    </SafeAreaView>
  );
}

/** Thin 1px separator using the design system border colour. */
export function Divider({ className }: { className?: string }) {
  return <View className={cn('h-[1px] bg-border', className)} />;
}

/** Fixed-size vertical or horizontal gap using the spacing scale. */
export function Spacer({
  size = 'md',
  horizontal = false,
}: {
  size?: SpacingToken;
  horizontal?: boolean;
}) {
  const value = spacing[size];
  return <View style={horizontal ? { width: value } : { height: value }} />;
}
