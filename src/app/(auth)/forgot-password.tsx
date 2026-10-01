import { router } from 'expo-router';
import { ChevronLeft, Mail, Send } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

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
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { colors: palette } = useAppTheme();

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
                  backgroundColor: palette.accentSoft,
                  borderRadius: 999,
                  padding: 20,
                  shadowColor: palette.accent,
                  shadowOpacity: 0.22,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}>
                {success ? (
                  <Send size={32} color={palette.accentDark} />
                ) : (
                  <Mail size={32} color={palette.accentDark} />
                )}
              </View>
            </View>

            <BodyText color="textSecondary" style={{ textAlign: 'center', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Bitebook
            </BodyText>
            <Spacer size="xs" />
            <Heading style={{ textAlign: 'center' }}>
              {success ? 'Check your email' : 'Reset your password'}
            </Heading>
            <Spacer size="xxs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              {success
                ? 'We sent a password reset link. Click it to create a new password.'
                : 'Enter your email and we\'ll send you a link to reset your password.'}
            </BodyText>

            <Spacer size="xl" />

            {!success && (
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
                }}>
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
                  leftIcon={<Mail size={18} color={colors.textSecondary} />}
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
              </View>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
