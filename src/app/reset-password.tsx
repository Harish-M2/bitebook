import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import {
    BodyText,
    Button,
    Heading,
    Screen,
    Spacer,
    TextField,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const canSubmit =
    password.length >= 6 &&
    password === confirmPassword &&
    !isSubmitting;

  useEffect(() => {
    let isCancelled = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isCancelled && nextSession) {
        setHasRecoverySession(true);
        setIsCheckingRecovery(false);
      }
    });

    const resolveRecoverySession = async () => {
      let exchangeError: string | null = null;

      if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        exchangeError = codeError?.message ?? null;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (isCancelled) return;

      if (data.session) {
        setHasRecoverySession(true);
      } else if (sessionError || exchangeError) {
        setError(sessionError?.message ?? exchangeError);
      }
      setIsCheckingRecovery(false);
    };

    void resolveRecoverySession();
    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [code]);

  if (isCheckingRecovery) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 items-center justify-center">
          <BodyText>Loading reset link...</BodyText>
        </View>
      </Screen>
    );
  }

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.replace('/sign-in');
      }, 2000);
    } catch {
      setError('Failed to reset password');
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 justify-center items-center px-xl">
          <View className="w-full max-w-md">
            <View className="items-center justify-center mb-lg">
              <View className="bg-accent/10 p-lg rounded-full">
                <CheckCircle size={40} color={colors.accent} />
              </View>
            </View>
            <Heading style={{ textAlign: 'center' }}>Password reset successful</Heading>
            <Spacer size="xs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              Your password has been updated. Redirecting to sign in...
            </BodyText>
          </View>
        </View>
      </Screen>
    );
  }

  if (!hasRecoverySession) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 justify-center items-center px-xl">
          <View className="w-full max-w-md">
            <Heading style={{ textAlign: 'center' }}>Invalid reset link</Heading>
            <Spacer size="md" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              The password reset link is invalid or expired. Please request a new one.
            </BodyText>
            <Spacer size="xl" />
            <Button
              label="Go to sign in"
              size="lg"
              fullWidth
              onPress={() => router.replace('/sign-in')}
            />
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
            <View className="items-center justify-center mb-md">
              <View className="bg-accent/10 p-lg rounded-full">
                <Lock size={32} color={colors.accent} />
              </View>
            </View>

            <Heading style={{ textAlign: 'center' }}>Create a new password</Heading>
            <Spacer size="xxs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              Enter a strong password to secure your account
            </BodyText>

            <Spacer size="xl" />

            {error && (
              <>
                <View className="bg-red-500/10 border border-red-500/30 rounded-lg p-md mb-lg">
                  <BodyText color="danger">{error}</BodyText>
                </View>
              </>
            )}

            <View className="gap-lg">
              <TextField
                label="New password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                leftIcon={<Lock size={18} color={colors.textSecondary} />}
              />

              <TextField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                leftIcon={<Lock size={18} color={colors.textSecondary} />}
                error={password !== confirmPassword && confirmPassword.length > 0 ? 'Passwords do not match' : undefined}
              />
            </View>

            <Spacer size="xl" />

            <Button
              label="Reset password"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!canSubmit}
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
