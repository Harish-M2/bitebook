import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Caption } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { isSaved, saveRestaurant, unsaveRestaurant } from '@/lib/db/saved';

interface SaveButtonProps {
  restaurantId: string;
  showLabel?: boolean;
  size?: number;
  onStatusChange?: (isSaved: boolean) => void;
}

export function SaveButton({ restaurantId, showLabel = false, size = 24, onStatusChange }: SaveButtonProps) {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const client = useQueryClient();
  const key = ['is-saved', user?.id ?? null, restaurantId];
  const saved = useQuery({ queryKey: key, queryFn: () => isSaved(restaurantId), enabled: Boolean(user) });
  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to save restaurants.');
      if (saved.data) await unsaveRestaurant(restaurantId);
      else await saveRestaurant(restaurantId);
      return !saved.data;
    },
    onSuccess: async (nextSaved) => {
      client.setQueryData(key, nextSaved);
      onStatusChange?.(nextSaved);
      await client.invalidateQueries({ queryKey: ['saved-restaurants'] });
    },
  });
  const loading = saved.isLoading || toggle.isPending;
  const selected = Boolean(saved.data);
  const color = selected ? colors.accent : colors.textSecondary;
  const error = saved.error ?? toggle.error;

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${selected ? 'Unsave' : 'Save'} restaurant`}
        accessibilityState={{ selected, disabled: loading || !user }}
        disabled={loading || !user} onPress={() => saved.isError ? void saved.refetch() : toggle.mutate()}
        style={{ minWidth: 44, minHeight: 44, padding: 8, justifyContent: 'center', alignItems: 'center' }}>
        {loading ? <ActivityIndicator color={colors.accent} /> : <View className="flex-row items-center gap-xs">
          <Heart size={size} color={color} fill={selected ? color : 'none'} />
          {showLabel ? <Caption color={selected ? 'accent' : 'textSecondary'}>{selected ? 'Saved' : 'Save'}</Caption> : null}
        </View>}
      </Pressable>
      {error ? <Caption color="danger">{error.message}</Caption> : null}
    </View>
  );
}