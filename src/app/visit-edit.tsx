import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Caption, Heading, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { listDishesForRestaurant } from '@/lib/db/dishes';
import {
    addVisitDish,
    getVisitById,
    listVisitDishIds,
    removeVisitDish,
    unmarkVisited,
    updateVisit,
} from '@/lib/db/visited';

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Private notes, date and remembered dishes for a visited restaurant. Never public. */
export default function VisitEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();

  const visit = useQuery({
    queryKey: ['visit-by-id', visitId],
    queryFn: () => getVisitById(visitId!),
    enabled: Boolean(visitId),
  });
  const restaurantId = visit.data?.restaurant_id;
  const dishes = useQuery({
    queryKey: ['restaurant-dishes', restaurantId],
    queryFn: () => listDishesForRestaurant(restaurantId!),
    enabled: Boolean(restaurantId),
  });
  const remembered = useQuery({
    queryKey: ['visit-dishes', visitId],
    queryFn: () => listVisitDishIds(visitId!),
    enabled: Boolean(visitId),
  });

  // Edits are kept as overrides on top of the loaded row, so no effect is needed to seed
  // the form once the query resolves.
  const [notesEdit, setNotesEdit] = useState<string | null>(null);
  const [dateEdit, setDateEdit] = useState<string | null>(null);
  const notes = notesEdit ?? visit.data?.notes ?? '';
  const date = dateEdit ?? visit.data?.visited_at ?? '';
  const setNotes = setNotesEdit;
  const setDate = setDateEdit;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['visited-list', user?.id ?? null] });
    void queryClient.invalidateQueries({ queryKey: ['visit-by-id', visitId] });
  };

  const save = useMutation({
    mutationFn: () => updateVisit(visitId!, { notes: notes.trim() || null, visited_at: date }),
    onSuccess: () => {
      invalidate();
      if (router.canGoBack()) router.back();
      else router.replace('/visited');
    },
  });
  const toggleDish = useMutation({
    mutationFn: async (dishId: string) => {
      if (remembered.data?.includes(dishId)) await removeVisitDish(visitId!, dishId);
      else await addVisitDish(visitId!, dishId);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['visit-dishes', visitId] }),
  });
  const remove = useMutation({
    mutationFn: () => unmarkVisited(visit.data!.restaurant_id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visit'] });
      invalidate();
      if (router.canGoBack()) router.back();
      else router.replace('/visited');
    },
  });

  if (visit.isLoading) {
    return (
      <Screen navigation>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }
  if (visit.isError || !visit.data) {
    return (
      <Screen navigation>
        <ErrorState
          title="Could not load this visit"
          description={visit.error?.message ?? 'Visit not found.'}
          onRetry={() => void visit.refetch()}
        />
      </Screen>
    );
  }

  const canSave = isValidDate(date) && notes.length <= 1000;

  return (
    <Screen navigation>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="gap-md px-lg pt-xs" style={{ width: '100%', maxWidth: 620, alignSelf: 'center' }}>
          <Heading level={2}>{visit.data.restaurant?.name ?? 'Visit'}</Heading>
          <MetadataText>Only you can see this. It is not a review.</MetadataText>

          <TextField
            label="Date visited"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            maxLength={10}
            error={isValidDate(date) ? null : 'Use the format YYYY-MM-DD'}
          />
          <TextField
            label="Private notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            minHeight={88}
            hint={`${notes.length}/1000`}
          />

          <View className="gap-xs">
            <Caption color="textSecondary">Dishes you remember (optional)</Caption>
            {dishes.isPending ? (
              <ActivityIndicator color={colors.accent} />
            ) : (dishes.data ?? []).length === 0 ? (
              <MetadataText>No dishes have been logged here yet.</MetadataText>
            ) : (
              <View className="flex-row flex-wrap gap-xs">
                {(dishes.data ?? []).map((dish) => (
                  <Chip
                    key={dish.id}
                    label={dish.name}
                    selected={remembered.data?.includes(dish.id) ?? false}
                    onPress={() => toggleDish.mutate(dish.id)}
                  />
                ))}
              </View>
            )}
          </View>

          {save.isError ? <MetadataText color="danger">{save.error.message}</MetadataText> : null}
          <Button
            label="Save"
            size="lg"
            fullWidth
            disabled={!canSave}
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
          <Button
            label="Remove from visited"
            variant="ghost"
            fullWidth
            loading={remove.isPending}
            onPress={() => remove.mutate()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
