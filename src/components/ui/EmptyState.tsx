import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { BodyText, Heading } from './Typography';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** Centered placeholder for empty lists — e.g. an empty diary or Want to Eat list. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-sm px-xl py-huge', className)}>
      {icon}
      <Heading level={3} style={{ textAlign: 'center' }}>
        {title}
      </Heading>
      {description ? (
        <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
          {description}
        </BodyText>
      ) : null}
      {action}
    </View>
  );
}
