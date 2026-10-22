import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { ConfirmStep } from '@/components/log/ConfirmStep';
import { DishStep, type ChosenDish } from '@/components/log/DishStep';
import { LogStepHeader } from '@/components/log/LogStepHeader';
import { PhotoStep, type ReviewMediaDraft } from '@/components/log/PhotoStep';
import { RatingStep, type DishReviewDraft } from '@/components/log/RatingStep';
import { RestaurantStep, type ChosenRestaurant } from '@/components/log/RestaurantStep';
import { ReviewStep } from '@/components/log/ReviewStep';
import {
    EMPTY_VISIT_DETAILS,
    isValidPartySize,
    toVisitDetailsInput,
    type VisitDetailsDraft,
} from '@/components/log/visitDetails';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { MetadataText } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { sameDishSelection } from '@/lib/db/dishes';
import { logRestaurantReview } from '@/lib/db/log';
import { logPrivateVisit } from '@/lib/db/visited';
import { localDateString } from '@/lib/format';
import { queryKeys } from '@/lib/queryClient';
import type { ReviewVisibility } from '@/types/database';

const STEPS = ['restaurant', 'dishes', 'dishReviews', 'media', 'restaurantReview', 'confirm'] as const;
type Step = (typeof STEPS)[number];
type LogStep = Step | 'visitNotes';
const VISIT_STEPS: LogStep[] = ['restaurant', 'dishes', 'visitNotes', 'confirm'];

const TITLES: Record<LogStep, string> = {
  restaurant: 'Where did you eat?',
  dishes: 'What did you have?',
  dishReviews: 'Rate each dish',
  media: 'Add photos or video',
  restaurantReview: 'Review the visit',
  confirm: 'Ready to log',
  visitNotes: 'Your visit',
};

interface Draft {
  clientRequestId: string;
  restaurant: ChosenRestaurant | null;
  dishes: DishReviewDraft[];
  media: ReviewMediaDraft[];
  overallRating: number;
  restaurantComment: string;
  visitedAt: string;
  recommendationTier: number | null;
  visibility: ReviewVisibility;
  details: VisitDetailsDraft;
}

function createEmptyDraft(): Draft {
  return {
  clientRequestId: Crypto.randomUUID(),
  restaurant: null,
    dishes: [],
    media: [],
    overallRating: 0,
    restaurantComment: '',
    visitedAt: localDateString(),
    recommendationTier: null,
    visibility: 'public',
    details: { ...EMPTY_VISIT_DETAILS },
  };
}

function isValidVisitDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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
  const { restaurantName } = useLocalSearchParams<{ restaurantName?: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState<LogStep>('restaurant');
  const [logMode, setLogMode] = useState<'review' | 'visit'>('review');
  const [draft, setDraft] = useState<Draft>(createEmptyDraft);
  const submitLocked = useRef(false);

  const steps: readonly LogStep[] = logMode === 'visit' ? VISIT_STEPS : STEPS;
  const stepIndex = steps.indexOf(step);

  const reset = useCallback(() => {
    setDraft(createEmptyDraft());
    setStep('restaurant');
    setLogMode('review');
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
      if (!draft.restaurant) throw new Error('Choose a restaurant.');
      if (!isValidVisitDate(draft.visitedAt)) throw new Error('Enter a valid visit date.');
      if (logMode === 'visit') return { kind: 'visit' as const, ...await logPrivateVisit(user.id, {
        restaurantId: draft.restaurant.id, visitedAt: draft.visitedAt,
        notes: draft.restaurantComment, dishes: draft.dishes,
      }) };
      if (draft.dishes.length === 0) throw new Error('The visit is incomplete.');
      if (draft.recommendationTier === null) throw new Error('Choose a recommendation for this restaurant.');

      const result = await logRestaurantReview(user.id, {
        clientRequestId: draft.clientRequestId,
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
        details: toVisitDetailsInput(draft.details),
      });
      return { kind: 'review' as const, ...result };
    },
    onSuccess: (result) => {
      submitLocked.current = false;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (result.kind === 'visit') {
        void queryClient.invalidateQueries({ queryKey: ['visited-list'] });
        void queryClient.invalidateQueries({ queryKey: ['visit'] });
        void queryClient.invalidateQueries({ queryKey: ['visit-dishes'] });
        void queryClient.invalidateQueries({ queryKey: ['restaurant-dishes'] });
        const message = result.failedDishes > 0
          ? `Your private visit is saved, but ${result.failedDishes} dish attachment(s) failed. Retry Save visit to finish.`
          : result.existingDetailsRetained
            ? 'Your dishes are saved. The existing visit date and notes were kept.'
            : 'Your private visit is saved in your diary.';
        showToast({
          title: result.failedDishes > 0 ? 'Visit saved with an issue' : 'Visit saved',
          message,
          tone: result.failedDishes > 0 ? 'error' : 'success',
        });
        if (result.failedDishes === 0) { reset(); router.replace('/(tabs)/diary'); }
        return;
      }

      if (user) {
        // Every surface that counts or lists this entry is now stale.
        void queryClient.invalidateQueries({ queryKey: queryKeys.diary(user.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.diaryStats(user.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.cuisineBreakdown(user.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.feed(user.id) });
      }
      // The dish's aggregate rating and the restaurant's dish list both changed.
      void queryClient.invalidateQueries({ queryKey: ['visited-list'] });
      void queryClient.invalidateQueries({ queryKey: ['visit'] });
      void queryClient.invalidateQueries({ queryKey: ['visit-dishes'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants() });
      void queryClient.invalidateQueries({ queryKey: ['restaurant-dishes'] });
      void queryClient.invalidateQueries({ queryKey: ['restaurant-visits', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['restaurant-visits-by-restaurant', draft.restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ['restaurant-rating-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['dish'] });
      void queryClient.invalidateQueries({ queryKey: ['recently-reviewed-restaurants'] });
      void queryClient.invalidateQueries({ queryKey: ['trending-dishes'] });
      void queryClient.invalidateQueries({ queryKey: ['discover-search'] });
      void queryClient.invalidateQueries({ queryKey: ['friend-recommendations'] });

      showToast({
        title: result.mediaFailedCount > 0 || result.detailsFailed ? 'Visit logged with an issue' : 'Visit logged',
        message: [
          result.mediaFailedCount > 0
            ? `Your review is saved, but ${result.mediaFailedCount} media item${result.mediaFailedCount === 1 ? '' : 's'} could not be uploaded.`
            : null,
          result.detailsFailed ? 'The visit is saved, but the optional spend band could not be stored until the database update is applied.' : null,
          result.mediaFailedCount === 0 && !result.detailsFailed ? 'Your restaurant review and dishes are in your diary.' : null,
        ].filter(Boolean).join(' '),
        tone: result.mediaFailedCount > 0 || result.detailsFailed ? 'error' : 'success',
      });
      if (result.mediaFailedCount > 0) return;
      reset();
      router.replace('/(tabs)/diary');
    },
    onError: (error: Error) => {
      submitLocked.current = false;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({ title: 'Could not log this visit', message: `${error.message} Your draft is still here; you can retry.`, tone: 'error' });
    },
    onSettled: () => {
      submitLocked.current = false;
    },
  });

  function goBack() {
    if (stepIndex === 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/home');
      return;
    }
    setStep(steps[stepIndex - 1]);
  }

  function goNext() {
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)]);
  }

  const canAdvance = useMemo(() => {
    if (step === 'dishes') {
      return logMode === 'visit' || draft.dishes.length > 0;
    }
    if (step === 'visitNotes') {
      return isValidVisitDate(draft.visitedAt) && draft.restaurantComment.trim().length <= 1000;
    }
    if (step === 'dishReviews') {
      return draft.dishes.length > 0 && draft.dishes.every((dish) => dish.rating >= 0.5);
    }
    if (step === 'restaurantReview') {
      return (
        draft.overallRating >= 0.5 &&
        draft.recommendationTier !== null &&
        isValidVisitDate(draft.visitedAt) &&
        isValidPartySize(draft.details.partySize)
      );
    }
    return true;
  }, [step, logMode, draft.dishes, draft.overallRating, draft.recommendationTier, draft.visitedAt, draft.restaurantComment, draft.details.partySize]);

  const advanceMessage = step === 'dishes' && logMode === 'review' && draft.dishes.length === 0
    ? 'Choose at least one dish to review.'
    : step === 'dishReviews' && draft.dishes.some((dish) => dish.rating < 0.5)
      ? `Add a rating for ${draft.dishes.filter((dish) => dish.rating < 0.5).map((dish) => dish.name).join(', ')}.`
      : step === 'visitNotes' && !isValidVisitDate(draft.visitedAt)
        ? 'Choose a valid visit date.'
        : step === 'restaurantReview' && draft.overallRating < 0.5
          ? 'Add an overall experience rating to continue.'
          : step === 'restaurantReview' && draft.recommendationTier === null
            ? 'Choose a restaurant recommendation to continue.'
            : step === 'restaurantReview' && !isValidPartySize(draft.details.partySize)
              ? 'Correct the party size or clear it to continue.'
              : null;

  const showFooter = step !== 'restaurant';

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        className="flex-1">
        <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 980, flex: 1 }}>
            <LogStepHeader
              title={TITLES[step]}
              stepIndex={stepIndex}
              stepCount={steps.length}
              onBack={goBack}
              action={
                step === 'media' ? (
                  <Pressable onPress={goNext} accessibilityRole="button" hitSlop={12}>
                    <MetadataText color="accent">Skip</MetadataText>
                  </Pressable>
                ) : null
              }
            />

            {step === 'dishes' ? <View className="flex-row gap-xs px-lg pb-xs">
              <Chip label="Review" selected={logMode === 'review'} onPress={() => setLogMode('review')} />
              <Chip label="Visit only" selected={logMode === 'visit'} onPress={() => setLogMode('visit')} />
            </View> : null}

            {step === 'restaurant' && (
              <RestaurantStep
                initialQuery={restaurantName ?? draft.restaurant?.name ?? ''}
                onSelect={(restaurant) => {
                  setDraft((current) => current.restaurant?.id === restaurant.id
                    ? { ...current, restaurant }
                    : { ...createEmptyDraft(), restaurant });
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
                      (selected) => sameDishSelection(selected, dish),
                    );
                    const dishes = alreadySelected
                      ? current.dishes.filter((selected) => !sameDishSelection(selected, dish))
                      : current.dishes.length < 20
                        ? [...current.dishes, { ...dish, rating: 0, comment: '' }]
                        : current.dishes;
                    const media = current.media.map((item) => ({ ...item, dishIndex: null }));
                    return { ...current, dishes, media };
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
                dishNames={draft.dishes.map((dish) => dish.name)}
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
                  details={draft.details}
                  onChangeDetails={(details) => setDraft((current) => ({ ...current, details }))}
                />
              </ScrollView>
            )}

            {step === 'visitNotes' ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-md px-lg py-md">
              <MetadataText>Private visit</MetadataText>
              <DatePickerField label="Visit date" value={draft.visitedAt}
                onChange={(visitedAt) => setDraft((current) => ({ ...current, visitedAt }))} />
              <TextField label="Visit notes (optional)" value={draft.restaurantComment} placeholder="What would you like to remember?"
                multiline maxLength={1000} minHeight={88}
                onChangeText={(restaurantComment) => setDraft((current) => ({ ...current, restaurantComment }))} />
            </ScrollView> : null}

            {step === 'confirm' && draft.restaurant && (logMode === 'visit' || (draft.dishes.length > 0 && draft.recommendationTier !== null)) && (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                <ConfirmStep
                  restaurantName={draft.restaurant.name}
                  city={draft.restaurant.city}
                  dishes={draft.dishes}
                  media={logMode === 'visit' ? [] : draft.media}
                  overallRating={logMode === 'visit' ? 0 : draft.overallRating}
                  reviewText={draft.restaurantComment}
                  visitedAt={draft.visitedAt}
                  recommendationTier={draft.recommendationTier}
                  visibility={logMode === 'visit' ? 'private' : draft.visibility}
                  privateVisit={logMode === 'visit'}
                  details={draft.details}
                  onEdit={setStep}
                />
              </ScrollView>
            )}

            {showFooter ? (
              <View className="px-lg pb-md pt-sm">
                {advanceMessage ? <MetadataText color="danger">{advanceMessage}</MetadataText> : null}
                <Button
                  label={step === 'confirm' ? logMode === 'visit' ? 'Save visit' : 'Log it' : 'Continue'}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!canAdvance}
                  loading={submit.isPending}
                  onPress={() => {
                    if (step === 'confirm') {
                      if (submitLocked.current) return;
                      submitLocked.current = true;
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
