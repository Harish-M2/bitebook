import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import {
  Avatar,
  BodyText,
  Button,
  Caption,
  Chip,
  Heading,
  MetadataText,
  Screen,
  Spacer,
  TextField,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { listCuisines, type Cuisine } from '@/lib/db/cuisines';
import { setCuisinePreferences } from '@/lib/db/preferences';
import { followProfiles, listSuggestedProfiles } from '@/lib/db/follows';
import { isUsernameTakenError, updateProfile, type Profile } from '@/lib/db/profiles';

/** Mirrors profiles_username_length and profiles_username_format in 0002_profiles.sql. */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;

const STEPS = ['identity', 'cuisines', 'location', 'follows'] as const;
type Step = (typeof STEPS)[number];

function validateUsername(value: string): string | null {
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return `Usernames are between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_PATTERN.test(value)) {
    return 'Use only letters, numbers and underscores.';
  }
  return null;
}

/** Slim progress indicator so the user can see how much is left. */
function StepProgress({ step }: { step: Step }) {
  const currentIndex = STEPS.indexOf(step);

  return (
    <View className="flex-row gap-xxs">
      {STEPS.map((name, index) => (
        <View
          key={name}
          className={`h-[3px] flex-1 rounded-pill ${index <= currentIndex ? 'bg-accent' : 'bg-surface-muted'}`}
        />
      ))}
    </View>
  );
}

/**
 * Onboarding, per spec §22: username, display name, favourite cuisines, location
 * permission, then a few suggested people to follow.
 *
 * Only the identity step is required — it is what clears `needsOnboarding` and unlocks the
 * tabs. Everything after it can be skipped, so abandoning midway lands the user on Home
 * rather than trapping them ("Do not make onboarding excessively long").
 */
export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();

  // A user who already has a username is resuming (or deep-linked here), so skip straight
  // past the identity step rather than asking them to re-enter it. Derived rather than set
  // from an effect; the override takes over as soon as the user advances a step.
  const [chosenStep, setChosenStep] = useState<Step | null>(null);
  const step: Step = chosenStep ?? (profile?.username ? 'cuisines' : 'identity');
  const setStep = setChosenStep;

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View className="px-xl pt-md">
        <StepProgress step={step} />
      </View>

      {step === 'identity' ? (
        <IdentityStep
          userId={user?.id ?? null}
          profile={profile}
          onDone={async () => {
            await refreshProfile();
            setStep('cuisines');
          }}
        />
      ) : step === 'cuisines' ? (
        <CuisinesStep
          userId={user?.id ?? null}
          onDone={() => setStep('location')}
        />
      ) : step === 'location' ? (
        <LocationStep onDone={() => setStep('follows')} />
      ) : (
        <FollowsStep userId={user?.id ?? null} onDone={() => router.replace('/home')} />
      )}
    </Screen>
  );
}

function IdentityStep({
  userId,
  profile,
  onDone,
}: {
  userId: string | null;
  profile: Profile | null;
  onDone: () => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedUsername = username.trim();
  const trimmedDisplayName = displayName.trim();
  const canSubmit =
    trimmedUsername.length > 0 && trimmedDisplayName.length > 0 && !isSubmitting && !!userId;

  const handleSubmit = async () => {
    if (!canSubmit || !userId) return;

    const formatError = validateUsername(trimmedUsername);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    setIsSubmitting(true);
    setUsernameError(null);

    try {
      // Username and display name are written together so a rejected username can never
      // leave a half-applied identity behind.
      await updateProfile(userId, {
        username: trimmedUsername,
        display_name: trimmedDisplayName,
      });
      await onDone();
    } catch (error) {
      // Uniqueness is owned by profiles_username_unique_idx, never pre-checked client-side.
      setUsernameError(
        isUsernameTakenError(error)
          ? 'That username is already taken.'
          : 'Could not save your profile. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="grow px-xl pb-xxl" keyboardShouldPersistTaps="handled">
        <Spacer size="xxl" />
        <Heading>Pick your username</Heading>
        <Spacer size="xxs" />
        <BodyText color="textSecondary">This is how other people will find you.</BodyText>

        <Spacer size="xl" />

        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. dish_hunter"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={USERNAME_MAX}
          returnKeyType="next"
          error={usernameError}
          hint="Letters, numbers and underscores only."
        />

        <Spacer size="md" />

        <TextField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        <View className="grow" />
        <Spacer size="xl" />

        <Button
          label="Continue"
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={!canSubmit}
          onPress={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CuisinesStep({ userId, onDone }: { userId: string | null; onDone: () => void }) {
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    listCuisines()
      .then((rows) => {
        if (!isCancelled) setCuisines(rows);
      })
      .catch((error) => {
        // An unseeded or unreachable taxonomy must not block onboarding — the step simply
        // renders empty and the user moves on.
        console.warn('[Bitebook] Failed to load cuisines:', error);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }, []);

  const handleContinue = async () => {
    if (!userId || selected.length === 0) {
      onDone();
      return;
    }

    setIsSubmitting(true);
    try {
      await setCuisinePreferences(userId, selected);
    } catch (error) {
      console.warn('[Bitebook] Failed to save cuisine preferences:', error);
    }
    setIsSubmitting(false);
    onDone();
  };

  return (
    <View className="flex-1 px-xl pb-xxl">
      <Spacer size="xxl" />
      <Heading>What do you love eating?</Heading>
      <Spacer size="xxs" />
      <BodyText color="textSecondary">
        Pick a few favourites and we&apos;ll tune your recommendations.
      </BodyText>

      <Spacer size="xl" />

      {isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : cuisines.length === 0 ? (
        <Caption>No cuisines are available yet — you can set these later.</Caption>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap gap-xs">
            {cuisines.map((cuisine) => (
              <Chip
                key={cuisine.id}
                label={cuisine.name}
                selected={selected.includes(cuisine.id)}
                onPress={() => toggle(cuisine.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <Spacer size="xl" />

      <Button
        label={selected.length > 0 ? `Continue with ${selected.length}` : 'Skip for now'}
        size="lg"
        fullWidth
        loading={isSubmitting}
        onPress={handleContinue}
      />
    </View>
  );
}

function LocationStep({ onDone }: { onDone: () => void }) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      // The result only decides what we show next — a denial is a valid outcome and must
      // not block onboarding. Nearby search degrades to manual search without it.
      await Location.requestForegroundPermissionsAsync();
    } catch (error) {
      console.warn('[Bitebook] Location permission request failed:', error);
    }
    setIsRequesting(false);
    onDone();
  };

  return (
    <View className="flex-1 items-center justify-center px-xl pb-xxl">
      <View className="grow" />

      <MapPin size={40} color={colors.accent} />
      <Spacer size="lg" />
      <Heading level={2} style={{ textAlign: 'center' }}>
        Find food near you
      </Heading>
      <Spacer size="xs" />
      <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
        Bitebook uses your location to show restaurants and dishes nearby. You can change this
        at any time in your settings.
      </BodyText>

      <View className="grow" />

      <Button
        label="Enable location"
        size="lg"
        fullWidth
        loading={isRequesting}
        onPress={handleEnable}
      />
      <Spacer size="sm" />
      <Pressable onPress={onDone} hitSlop={8}>
        <MetadataText>Not now</MetadataText>
      </Pressable>
    </View>
  );
}

function FollowsStep({ userId, onDone }: { userId: string | null; onDone: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(userId !== null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let isCancelled = false;

    listSuggestedProfiles(userId)
      .then((rows) => {
        if (!isCancelled) setProfiles(rows);
      })
      .catch((error) => {
        console.warn('[Bitebook] Failed to load suggested profiles:', error);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const toggle = useCallback((id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }, []);

  const handleFinish = async () => {
    if (!userId || selected.length === 0) {
      onDone();
      return;
    }

    setIsSubmitting(true);
    try {
      await followProfiles(userId, selected);
    } catch (error) {
      console.warn('[Bitebook] Failed to follow profiles:', error);
    }
    setIsSubmitting(false);
    onDone();
  };

  return (
    <View className="flex-1 px-xl pb-xxl">
      <Spacer size="xxl" />
      <Heading>People to follow</Heading>
      <Spacer size="xxs" />
      <BodyText color="textSecondary">
        Following a few people fills your feed with dishes worth trying.
      </BodyText>

      <Spacer size="xl" />

      {isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : profiles.length === 0 ? (
        <Caption>No suggestions yet — you&apos;ll find people to follow as Bitebook grows.</Caption>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-sm">
            {profiles.map((item) => {
              const isSelected = selected.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => toggle(item.id)}
                  className="flex-row items-center gap-sm rounded-md border border-border bg-surface-elevated px-md py-sm">
                  <Avatar uri={item.avatar_url} name={item.display_name} size="sm" />
                  <View className="flex-1">
                    <BodyText medium>{item.display_name}</BodyText>
                    {item.username ? <MetadataText>@{item.username}</MetadataText> : null}
                  </View>
                  <Chip
                    label={isSelected ? 'Following' : 'Follow'}
                    selected={isSelected}
                    onPress={() => toggle(item.id)}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Spacer size="xl" />

      <Button
        label={selected.length > 0 ? `Follow ${selected.length} and finish` : 'Finish'}
        size="lg"
        fullWidth
        loading={isSubmitting}
        onPress={handleFinish}
      />
    </View>
  );
}
