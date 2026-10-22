import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Caption } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { getVisit, markVisited, unmarkVisited } from '@/lib/db/visited';

/** Toggles a restaurant in the user's private visited list (independent of reviews). */
export function VisitedButton({ restaurantId }: { restaurantId: string }) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['visit', user?.id ?? null, restaurantId];

  const visit = useQuery({
    queryKey: key,
    queryFn: () => getVisit(restaurantId),
    enabled: Boolean(user),
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to track visited restaurants.');
      if (visit.data) await unmarkVisited(restaurantId);
      else await markVisited(user.id, restaurantId);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ['visited-list', user?.id ?? null] });
    },
  });

  const isVisited = Boolean(visit.data);

  return (
    <View className="gap-xs">
    <Button
      label={isVisited ? 'Visited' : 'Mark as visited'}
      variant={isVisited ? 'secondary' : 'outline'}
      icon={isVisited ? <Check size={16} color={colors.accent} /> : undefined}
      disabled={!user || visit.isError}
      loading={visit.isLoading || toggle.isPending}
      onPress={() => toggle.mutate()}
      accessibilityLabel={isVisited ? 'Remove from visited restaurants' : 'Mark as visited'}
    />
    {visit.isError ? <Button label="Retry visit status" variant="outline" onPress={() => void visit.refetch()} /> : null}
    {toggle.isError ? <Caption color="danger">{toggle.error.message}</Caption> : null}
    </View>
  );
}
