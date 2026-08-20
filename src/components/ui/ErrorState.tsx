import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { BodyText, Heading } from './Typography';
import { Button } from './Button';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

/** Centered error placeholder with an optional retry action. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-sm px-xl py-huge', className)}>
      <Heading level={3} style={{ textAlign: 'center' }}>
        {title}
      </Heading>
      <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
        {description}
      </BodyText>
      {onRetry ? <Button label="Retry" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
