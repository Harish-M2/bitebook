/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import type { Palette } from '@/constants/colors';
import { useAppTheme } from '@/hooks/useTheme';
import { followUser, isFollowing, unfollowUser } from '@/lib/db/social';
import { UserMinus, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface FollowButtonProps {
  userId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  disabled?: boolean;
}

export const FollowButton = ({
  userId,
  onFollowChange,
  disabled = false,
}: FollowButtonProps) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkFollowingStatus = async () => {
    try {
      setIsLoading(true);
      const following = await isFollowing(userId);
      setIsFollowingState(following);
      setError(null);
    } catch (err) {
      console.error('[Bitebook] Failed to check following status:', err);
      setError('Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkFollowingStatus();
  }, [userId]);

  const handlePress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const newFollowingState = !isFollowingState;

      if (isFollowingState) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }

      setIsFollowingState(newFollowingState);
      onFollowChange?.(newFollowingState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <TouchableOpacity style={[styles.button, styles.loading]} disabled>
        <ActivityIndicator size="small" color={colors.accent} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFollowingState ? styles.following : styles.notFollowing,
        (disabled || isLoading) && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
    >
      {isFollowingState ? (
        <>
          <UserMinus size={16} color={colors.textPrimary} />
          <Text style={styles.label}>Following</Text>
        </>
      ) : (
        <>
          <UserPlus size={16} color="white" />
          <Text style={styles.label}>{error ? 'Retry' : 'Follow'}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

function createStyles(colors: Palette) {
  return StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  following: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notFollowing: {
    backgroundColor: colors.accent,
  },
  loading: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  });
}
