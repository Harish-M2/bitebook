import { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ChevronLeft, Lock, CheckCircle } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';

import {
  BodyText,
  Button,
  Heading,
  IconButton,
  Screen,
  Spacer,
  TextField,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const canSubmit =
    password.length >= 6 &&
    password === confirmPassword &&
    !isSubmitting;

  useEffect(() => {
    // Verify the token
    if (!token_hash || type !== 'recovery') {
      setError('Invalid reset link');
      setIsVerifying(false);
      return;
    }
    setIsVerifying(false);
  }, [token_hash, type]);

  const handleSubmit = async () => {
    if (!canSubmit || !token_hash) return;

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
    } catch (err) {
      setError('Failed to reset password');
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 items-center justify-center">
          <BodyText>Loading...</BodyText>
        </View>
      </Screen>
    );
  }

  if (isSuccess) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-xl">
          <View className="bg-accent/10 p-lg rounded-full mb-lg">
            <CheckCircle size={40} color={colors.accent} />
          </View>
          <Heading style={{ textAlign: 'center' }}>Password reset successful</Heading>
          <Spacer size="xs" />
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            Your password has been updated. You can now sign in with your new password.
          </BodyText>
          <Spacer size="xl" />
          <Button
            label="Go to sign in"
            size="lg"
            fullWidth
            onPress={() => router.replace('/sign-in')}
          />
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

          <Spacer size="md" />

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
                <BodyText color="red-500">{error}</BodyText>
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

          <View className="grow" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
