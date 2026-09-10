import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ChevronLeft, MailCheck } from 'lucide-react-native';
import { Link, router } from 'expo-router';

import {
  BodyText,
  Button,
  Heading,
  IconButton,
  MetadataText,
  Screen,
  Spacer,
  TextField,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

/** Matches Supabase's own minimum; the real rule is enforced by the auth service. */
const MIN_PASSWORD_LENGTH = 6;

export default function SignUp() {
  const { signUpWithPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const { error: signUpError, needsEmailConfirmation } = await signUpWithPassword(
      email.trim(),
      password
    );

    if (signUpError) {
      setError(signUpError);
      setIsSubmitting(false);
      return;
    }

    if (needsEmailConfirmation) {
      // Email confirmation is enabled on the project, so no session exists yet and the
      // route guards will not move us. Tell the user to go and confirm.
      setAwaitingConfirmation(true);
      setIsSubmitting(false);
      return;
    }

    router.replace('/');
  };

  if (awaitingConfirmation) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-xl">
          <MailCheck size={40} color={colors.accent} />
          <Spacer size="lg" />
          <Heading level={2} style={{ textAlign: 'center' }}>
            Confirm your email
          </Heading>
          <Spacer size="xs" />
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            We sent a confirmation link to {email.trim()}. Open it to finish setting up your
            account, then sign in.
          </BodyText>
          <Spacer size="xl" />
          <Link href="/sign-in" replace asChild>
            <Button label="Go to sign in" size="lg" fullWidth />
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="grow px-xl pb-xxl"
          keyboardShouldPersistTaps="handled">
          <View className="py-md">
            <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
              <ChevronLeft size={20} color={colors.textPrimary} />
            </IconButton>
          </View>

          <Spacer size="lg" />
          <Heading>Create your account</Heading>
          <Spacer size="xxs" />
          <BodyText color="textSecondary">
            Start logging the dishes you love — and the ones you don&apos;t.
          </BodyText>

          <Spacer size="xl" />

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />

          <Spacer size="md" />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            error={error}
            hint={`Use ${MIN_PASSWORD_LENGTH} characters or more.`}
          />

          <Spacer size="xl" />

          <Button
            label="Create account"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />

          <View className="grow" />
          <Spacer size="xl" />

          <View className="flex-row items-center justify-center gap-xxs">
            <MetadataText>Already have an account?</MetadataText>
            <Link href="/sign-in" replace>
              <MetadataText color="accent">Sign in</MetadataText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
