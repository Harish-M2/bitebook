import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { ConfirmStep } from '@/components/log/ConfirmStep';
import { DishStep, type ChosenDish } from '@/components/log/DishStep';
import { LogStepHeader } from '@/components/log/LogStepHeader';
import { PhotoStep, type ReviewMediaDraft } from '@/components/log/PhotoStep';
import { RatingStep, type DishReviewDraft } from '@/components/log/RatingStep';
import { RestaurantStep, type ChosenRestaurant } from '@/components/log/RestaurantStep';
import { ReviewStep } from '@/components/log/ReviewStep';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { MetadataText } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { logRestaurantReview } from '@/lib/db/log';
import { localDateString } from '@/lib/format';
import { queryKeys } from '@/lib/queryClient';
import type { ReviewVisibility } from '@/types/database';

const STEPS = ['restaurant', 'dishes', 'dishReviews', 'media', 'restaurantReview', 'confirm'] as const;
type Step = (typeof STEPS)[number];

const TITLES: Record<Step, string> = {
  restaurant: 'Where did you eat?',
  dishes: 'What did you have?',
  dishReviews: 'Rate each dish',
  media: 'Add photos or video',
  restaurantReview: 'Review the visit',
  confirm: 'Ready to log',
};

interface Draft {
  restaurant: ChosenRestaurant | null;
  dishes: DishReviewDraft[];
  media: ReviewMediaDraft[];
  overallRating: number;
  restaurantComment: string;
  visitedAt: string;
  recommendationTier: number | null;
  visibility: ReviewVisibility;
}

function createEmptyDraft(): Draft {
  return {
  restaurant: null,
    dishes: [],
    media: [],
    overallRating: 0,
    restaurantComment: '',
    visitedAt: localDateString(),
    recommendationTier: null,
    visibility: 'public',
  };
}

function isValidVisitDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

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
  const [draft, setDraft] = useState<Draft>(createEmptyDraft);

  const stepIndex = STEPS.indexOf(step);

  const reset = useCallback(() => {
    setDraft(createEmptyDraft());
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
      if (!draft.restaurant || draft.dishes.length === 0) throw new Error('The visit is incomplete.');
      if (draft.recommendationTier === null) throw new Error('Choose a recommendation for this restaurant.');

      return logRestaurantReview(user.id, {
        restaurantId: draft.restaurant.id,
        overallRating: draft.overallRating,
        restaurantComment: draft.restaurantComment,
        recommendationTier: draft.recommendationTier,
        visibility: draft.visibility,
        visitedAt: draft.visitedAt,
        dishes: draft.dishes.map((dish) => ({
          dishId: dish.id,
          dishName: dish.name,
          rating: dish.rating,
          comment: dish.comment,
          category: dish.category,
          dietaryTags: dish.dietaryTags,
        })),
        media: draft.media,
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
      void queryClient.invalidateQueries({ queryKey: ['restaurant-visits', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['restaurant-visits-by-restaurant', draft.restaurant?.id] });

      if (Platform.OS === 'web') {
        reset();
        router.replace('/(tabs)/diary');
        window.alert(result.mediaFailedCount > 0
          ? `Visit logged. ${result.mediaFailedCount} media item${result.mediaFailedCount === 1 ? '' : 's'} could not be uploaded.`
          : 'Visit logged. Your restaurant review and dishes are in your diary.');
        return;
      }

      if (result.mediaFailedCount > 0) {
        Alert.alert(
          'Visit logged, but some media did not upload',
          `Your visit and dishes are in your diary. ${result.mediaFailedCount} media item${result.mediaFailedCount === 1 ? '' : 's'} could not be uploaded.`,
          [
            {
              text: 'View diary',
              onPress: () => {
                reset();
                router.push('/(tabs)/diary');
              },
            },
          ],
        );
      } else {
        Alert.alert('Visit logged', 'Your restaurant review and dishes are in your diary.', [
          {
            text: 'View diary',
            onPress: () => {
              reset();
              router.push('/(tabs)/diary');
            },
          },
        ]);
      }
    },
    onError: (error: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (Platform.OS === 'web') {
        window.alert(`Could not log this visit\n\n${error.message}`);
      } else {
        Alert.alert('Could not log this visit', error.message);
      }
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
    if (step === 'dishes') {
      return draft.dishes.length > 0;
    }
    if (step === 'dishReviews') {
      return draft.dishes.length > 0 && draft.dishes.every((dish) => dish.rating >= 0.5);
    }
    if (step === 'restaurantReview') {
      return draft.overallRating >= 0.5 && draft.recommendationTier !== null && isValidVisitDate(draft.visitedAt);
    }
    return true;
  }, [step, draft.dishes, draft.overallRating, draft.recommendationTier, draft.visitedAt]);

  const showFooter = step !== 'restaurant';

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 980, flex: 1 }}>
            <LogStepHeader
              title={TITLES[step]}
              stepIndex={stepIndex}
              stepCount={STEPS.length}
              onBack={goBack}
              action={
                step === 'media' ? (
                  <Pressable onPress={goNext} accessibilityRole="button" hitSlop={12}>
                    <MetadataText color="accent">Skip</MetadataText>
                  </Pressable>
                ) : null
              }
            />

            {step === 'restaurant' && (
              <RestaurantStep
                onSelect={(restaurant) => {
                  setDraft({ ...createEmptyDraft(), restaurant });
                  setStep('dishes');
                }}
              />
            )}

            {step === 'dishes' && draft.restaurant && (
              <DishStep
                restaurantId={draft.restaurant.id}
                selected={draft.dishes}
                onToggle={(dish: ChosenDish) => {
                  setDraft((current) => {
                    const alreadySelected = current.dishes.some(
                      (selected) => selected.id === dish.id && selected.name === dish.name,
                    );
                    const dishes = alreadySelected
                      ? current.dishes.filter((selected) => !(selected.id === dish.id && selected.name === dish.name))
                      : current.dishes.length < 20
                        ? [...current.dishes, { ...dish, rating: 0, comment: '' }]
                        : current.dishes;
                    return { ...current, dishes };
                  });
                }}
              />
            )}

            {step === 'dishReviews' && (
              <RatingStep
                dishes={draft.dishes}
                onChange={(dishName, value, field) => {
                  setDraft((current) => ({
                    ...current,
                    dishes: current.dishes.map((dish) => {
                      if (dish.name !== dishName) return dish;
                      if (field === 'rating' && typeof value === 'number') return { ...dish, rating: value };
                      if (field === 'comment' && typeof value === 'string') return { ...dish, comment: value };
                      return dish;
                    }),
                  }));
                }}
              />
            )}

            {step === 'media' && (
              <PhotoStep
                media={draft.media}
                onChange={(media) => setDraft((current) => ({ ...current, media }))}
              />
            )}

            {step === 'restaurantReview' && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <ReviewStep
                  text={draft.restaurantComment}
                  onChangeText={(restaurantComment) => setDraft((current) => ({ ...current, restaurantComment }))}
                  overallRating={draft.overallRating}
                  onChangeOverallRating={(overallRating) => setDraft((current) => ({ ...current, overallRating }))}
                  visitedAt={draft.visitedAt}
                  onChangeVisitedAt={(visitedAt) => setDraft((current) => ({ ...current, visitedAt }))}
                  recommendationTier={draft.recommendationTier}
                  onChangeRecommendationTier={(recommendationTier) => setDraft((current) => ({ ...current, recommendationTier }))}
                  visibility={draft.visibility}
                  onChangeVisibility={(visibility) =>
                    setDraft((current) => ({ ...current, visibility }))
                  }
                />
              </ScrollView>
            )}

            {step === 'confirm' && draft.restaurant && draft.dishes.length > 0 && draft.recommendationTier !== null && (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                <ConfirmStep
                  restaurantName={draft.restaurant.name}
                  city={draft.restaurant.city}
                  dishes={draft.dishes}
                  media={draft.media}
                  overallRating={draft.overallRating}
                  reviewText={draft.restaurantComment}
                  visitedAt={draft.visitedAt}
                  recommendationTier={draft.recommendationTier}
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
