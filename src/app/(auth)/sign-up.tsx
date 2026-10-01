import { Link, router } from 'expo-router';
import { ChevronLeft, Lock, Mail, MailCheck, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

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
      setAwaitingConfirmation(true);
      setIsSubmitting(false);
      return;
    }

    router.replace('/');
  };

  if (awaitingConfirmation) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 justify-center items-center px-xl">
          <View className="w-full max-w-md">
            <View className="items-center justify-center mb-lg">
              <View className="bg-accent/10 p-lg rounded-full">
                <MailCheck size={40} color={colors.accent} />
              </View>
            </View>
            <Heading level={2} style={{ textAlign: 'center' }}>
              Verify your email
            </Heading>
            <Spacer size="xs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              We sent a confirmation link to{'\n'}
              <BodyText style={{ fontWeight: '600' }}>{email.trim()}</BodyText>
            </BodyText>
            <Spacer size="md" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              Click the link to confirm your account, then come back to sign in.
            </BodyText>
            <Spacer size="xl" />
            <Link href="/sign-in" replace asChild>
              <Button label="Go to sign in" size="lg" fullWidth />
            </Link>
          </View>
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
          contentContainerClassName="flex-1 justify-center px-xl"
          keyboardShouldPersistTaps="handled">
          <View className="w-full max-w-md mx-auto">
            <View className="pb-md mb-md">
              <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
                <ChevronLeft size={20} color={colors.textPrimary} />
              </IconButton>
            </View>

            <View className="items-center justify-center mb-md">
              <View
                style={{
                  backgroundColor: colors.accentSoft,
                  borderRadius: 999,
                  padding: 20,
                  shadowColor: colors.accent,
                  shadowOpacity: 0.18,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}>
                <Utensils size={32} color={colors.accentDark} />
              </View>
            </View>

            <Heading style={{ textAlign: 'center' }}>Start your food diary</Heading>
            <Spacer size="xxs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              Log dishes, track ratings, and explore new flavors
            </BodyText>

            <Spacer size="xl" />

            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 24,
                padding: 20,
                shadowColor: '#000000',
                shadowOpacity: 0.12,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
              }}
              className="gap-lg">
              <View>
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
                  leftIcon={<Mail size={18} color={colors.textSecondary} />}
                />
              </View>

              <View>
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
                  leftIcon={<Lock size={18} color={colors.textSecondary} />}
                />
              </View>
            </View>

            <Spacer size="xl" />

            <Button
              label="Create account"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!canSubmit}
              onPress={handleSubmit}
            />

            <Spacer size="xl" />

            <View className="flex-row items-center justify-center gap-xxs">
              <MetadataText>Already have an account?</MetadataText>
              <Link href="/sign-in" replace>
                <MetadataText color="accent" style={{ fontWeight: '600' }}>
                  Sign in
                </MetadataText>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
