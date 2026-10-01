import { Link, router } from 'expo-router';
import { ChevronLeft, Lock, Mail } from 'lucide-react-native';
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
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';

export default function SignIn() {
  const { signInWithPassword } = useAuth();
  const { colors: palette } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const { error: signInError } = await signInWithPassword(email.trim(), password);

    if (signInError) {
      setError(signInError);
      setIsSubmitting(false);
      return;
    }

    router.replace('/');
  };

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
                <ChevronLeft size={20} color={palette.textPrimary} />
              </IconButton>
            </View>

            <View className="items-center justify-center mb-md">
              <View
                style={{
                  backgroundColor: palette.accentSoft,
                  borderRadius: 999,
                  padding: 20,
                  shadowColor: palette.accent,
                  shadowOpacity: 0.22,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}>
                <Lock size={32} color={palette.accentDark} />
              </View>
            </View>

            <BodyText color="textSecondary" style={{ textAlign: 'center', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Bitebook
            </BodyText>
            <Spacer size="xs" />
            <Heading style={{ textAlign: 'center' }}>Welcome back</Heading>
            <Spacer size="xxs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              Sign in to your account and continue logging your food diary.
            </BodyText>

            <Spacer size="xl" />

            <View
              style={{
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 24,
                padding: 20,
                shadowColor: '#000000',
                shadowOpacity: 0.12,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
              }}
              className="gap-lg">
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
                leftIcon={<Mail size={18} color={palette.textSecondary} />}
              />

              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={error}
                leftIcon={<Lock size={18} color={palette.textSecondary} />}
              />
            </View>

            <Spacer size="sm" />

            <Link href="/forgot-password" asChild>
              <MetadataText color="accent">Forgot password?</MetadataText>
            </Link>

            <Spacer size="xl" />

            <Button
              label="Sign in"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!canSubmit}
              onPress={handleSubmit}
            />

            <Spacer size="xl" />

            <View className="flex-row items-center justify-center gap-xxs">
              <MetadataText>Don&apos;t have an account?</MetadataText>
              <Link href="/sign-up" replace>
                <MetadataText color="accent" style={{ fontWeight: '600' }}>
                  Sign up
                </MetadataText>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

