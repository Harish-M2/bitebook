import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';

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

export default function ForgotPassword() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const { error: resetError } = await resetPassword(email.trim());

    if (resetError) {
      setError(resetError);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
  };

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
          <Heading>Reset your password</Heading>
          <Spacer size="xxs" />
          <BodyText color="textSecondary">
            {success
              ? 'Check your email for a password reset link.'
              : 'Enter your email and we'll send you a link to reset your password.'}
          </BodyText>

          <Spacer size="xl" />

          {!success && (
            <>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                error={error}
              />

              <Spacer size="xl" />

              <Button
                label="Send reset link"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={!canSubmit}
                onPress={handleSubmit}
              />
            </>
          )}

          {success && (
            <>
              <Spacer size="xl" />
              <Button
                label="Back to sign in"
                size="lg"
                fullWidth
                onPress={() => router.back()}
              />
            </>
          )}

          <View className="grow" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
