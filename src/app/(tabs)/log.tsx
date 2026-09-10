import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { logDish } from '@/lib/db/log';
import type { ReviewVisibility } from '@/types/database';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { MetadataText } from '@/components/ui/Typography';
import { LogStepHeader } from '@/components/log/LogStepHeader';
import { RestaurantStep, type ChosenRestaurant } from '@/components/log/RestaurantStep';
import { DishStep, type ChosenDish } from '@/components/log/DishStep';
import { RatingStep } from '@/components/log/RatingStep';
import { PhotoStep } from '@/components/log/PhotoStep';
import { ReviewStep } from '@/components/log/ReviewStep';
import { ConfirmStep } from '@/components/log/ConfirmStep';

const STEPS = ['restaurant', 'dish', 'rating', 'photo', 'review', 'confirm'] as const;
type Step = (typeof STEPS)[number];

const TITLES: Record<Step, string> = {
  restaurant: 'Where did you eat?',
  dish: 'What did you have?',
  rating: 'How was it?',
  photo: 'Add a photo',
  review: 'Say a bit more',
  confirm: 'Ready to log',
};

interface Draft {
  restaurant: ChosenRestaurant | null;
  dish: ChosenDish | null;
  rating: number;
  photoUri: string | null;
  reviewText: string;
  visibility: ReviewVisibility;
}

const EMPTY_DRAFT: Draft = {
  restaurant: null,
  dish: null,
  rating: 0,
  photoUri: null,
  reviewText: '',
  visibility: 'public',
};

/**
 * Log tab — the app's core loop (spec §11).
 *
 * Six steps in one screen rather than six routes. The draft is a single piece of state that
 * outlives every step, so going back never loses what was already entered, and the flow has
 * exactly one place that writes. Stacked routes would have to thread the same draft through
 * params or a store to achieve the same thing.
 *
 * Restaurant, dish and rating are required; photo and notes are not. The rating is the only
 * step with no skip, because a diary entry without one is not a review of anything.
 */
export default function LogScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('restaurant');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const stepIndex = STEPS.indexOf(step);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setStep('restaurant');
  }, []);

  // Leaving the tab mid-flow and coming back should not resume a half-finished draft: the
  // user has moved on, and a stale restaurant silently attached to a new dish is worse than
  // starting again.
  useFocusEffect(
    useCallback(() => {
      return () => reset();
    }, [reset]),
  );

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You need to be signed in to log a dish.');
      if (!draft.restaurant || !draft.dish) throw new Error('The log is incomplete.');

      return logDish(user.id, {
        restaurantId: draft.restaurant.id,
        dishId: draft.dish.id,
        dishName: draft.dish.name,
        rating: draft.rating,
        reviewText: draft.reviewText,
        visibility: draft.visibility,
        photoUri: draft.photoUri,
      });
    },
    onSuccess: (result) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (user) {
        // Every surface that counts or lists this entry is now stale.
        void queryClient.invalidateQueries({ queryKey: queryKeys.diary(user.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.diaryStats(user.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.cuisineBreakdown(user.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.feed(user.id) });
      }
      // The dish's aggregate rating and the restaurant's dish list both changed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants() });
      void queryClient.invalidateQueries({ queryKey: ['restaurant-dishes'] });

      if (result.photoFailed) {
        Alert.alert(
          'Logged, but the photo did not upload',
          'Your dish is in your diary. You can add the photo again later.',
        );
      }

      reset();
      router.push('/diary');
    },
    onError: (error: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not log this dish', error.message);
    },
  });

  function goBack() {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    setStep(STEPS[stepIndex - 1]);
  }

  function goNext() {
    setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  }

  const canAdvance = useMemo(() => {
    if (step === 'rating') {
      return draft.rating >= 0.5;
    }
    return true;
  }, [step, draft.rating]);

  // The first two steps advance by choosing something from a list, so a Next button would be
  // dead weight above the keyboard.
  const showFooter = step !== 'restaurant' && step !== 'dish';

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <LogStepHeader
          title={TITLES[step]}
          stepIndex={stepIndex}
          stepCount={STEPS.length}
          onBack={goBack}
          action={
            step === 'photo' || step === 'review' ? (
              <Pressable onPress={goNext} accessibilityRole="button" hitSlop={12}>
                <MetadataText color="accent">Skip</MetadataText>
              </Pressable>
            ) : null
          }
        />

        {step === 'restaurant' && (
          <RestaurantStep
            onSelect={(restaurant) => {
              setDraft((current) => ({ ...current, restaurant, dish: null }));
              setStep('dish');
            }}
          />
        )}

        {step === 'dish' && draft.restaurant && (
          <DishStep
            restaurantId={draft.restaurant.id}
            onSelect={(dish) => {
              setDraft((current) => ({ ...current, dish }));
              setStep('rating');
            }}
          />
        )}

        {step === 'rating' && draft.dish && (
          <RatingStep
            dishName={draft.dish.name}
            value={draft.rating}
            onChange={(rating) => setDraft((current) => ({ ...current, rating }))}
          />
        )}

        {step === 'photo' && (
          <PhotoStep
            photoUri={draft.photoUri}
            onChange={(photoUri) => setDraft((current) => ({ ...current, photoUri }))}
          />
        )}

        {step === 'review' && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <ReviewStep
              text={draft.reviewText}
              onChangeText={(reviewText) => setDraft((current) => ({ ...current, reviewText }))}
              visibility={draft.visibility}
              onChangeVisibility={(visibility) =>
                setDraft((current) => ({ ...current, visibility }))
              }
            />
          </ScrollView>
        )}

        {step === 'confirm' && draft.restaurant && draft.dish && (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <ConfirmStep
              restaurantName={draft.restaurant.name}
              city={draft.restaurant.city}
              dishName={draft.dish.name}
              rating={draft.rating}
              photoUri={draft.photoUri}
              reviewText={draft.reviewText}
              visibility={draft.visibility}
            />
          </ScrollView>
        )}

        {showFooter ? (
          <View className="px-lg pb-md pt-sm">
            <Button
              label={step === 'confirm' ? 'Log it' : 'Continue'}
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canAdvance}
              loading={submit.isPending}
              onPress={() => {
                if (step === 'confirm') {
                  submit.mutate();
                } else {
                  void Haptics.selectionAsync();
                  goNext();
                }
              }}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}
