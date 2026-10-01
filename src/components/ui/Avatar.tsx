import { Image } from 'expo-image';
import { View } from 'react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { publicImageUrl } from '@/lib/db/storage';
import { MetadataText } from './Typography';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  uri?: string | null;
  /** Used to render initials when there is no photo. */
  name: string;
  size?: AvatarSize;
  className?: string;
};

const sizeClass: Record<AvatarSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-24 w-24',
};

// expo-image's native implementation does not support NativeWind's `className` prop
// (only its web build does), so its dimensions are set with plain numeric styles.
const sizePx: Record<AvatarSize, number> = {
  xs: 32,
  sm: 40,
  md: 56,
  lg: 80,
  xl: 96,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return initials.join('') || '?';
}

/** Circular user avatar with an initials fallback when no photo is available. */
export function Avatar({ uri, name, size = 'md', className }: AvatarProps) {
  const imageUri = uri && /^https?:\/\//i.test(uri) ? uri : publicImageUrl('avatars', uri ?? null);

  if (!imageUri) {
    return (
      <View
        className={cn(
          'items-center justify-center rounded-pill bg-surface-elevated border border-border',
          sizeClass[size],
          className
        )}>
        <MetadataText color="textSecondary">{getInitials(name)}</MetadataText>
      </View>
    );
  }

  const dimension = sizePx[size];

  return (
    <Image
      source={{ uri: imageUri }}
      accessibilityLabel={`${name}'s avatar`}
      transition={150}
      style={{ width: dimension, height: dimension, borderRadius: dimension / 2, backgroundColor: colors.surfaceElevated }}
    />
  );
}
