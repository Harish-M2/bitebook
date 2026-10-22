import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthEmailConfirmation } from '@/components/auth/AuthEmailConfirmation';
import { AuthFormScreen } from '@/components/auth/AuthFormScreen';
import { BodyText, Button, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const normalizedEmail = email.trim();
  const invalidEmail = normalizedEmail.length > 0 && !EMAIL_PATTERN.test(normalizedEmail);
  const canSubmit = EMAIL_PATTERN.test(normalizedEmail) && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await resetPassword(normalizedEmail);
      if (result.error) setError(result.error);
      else setSuccess(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not request a reset link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);
    setResendError(null);
    try {
      const result = await resetPassword(normalizedEmail);
      if (result.error) setResendError(result.error);
      else setResendMessage('A new reset-link request was accepted.');
    } catch (resetError) {
      setResendError(resetError instanceof Error ? resetError.message : 'Could not request another reset link.');
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <AuthEmailConfirmation email={normalizedEmail}
        description="A password-reset link has been requested. Use it to create a new password for your account."
        resendLabel="Resend link" resendPending={isResending} resendMessage={resendMessage}
        resendError={resendError} onResend={() => void handleResend()} />
    );
  }

  return (
    <AuthFormScreen title="Reset your password" fallbackHref="/sign-in"
      description="Enter your email address and we’ll send you a link to reset your password.">
      <View style={{ alignItems: 'center', marginBottom: 22 }}>
        <View style={{ height: 74, width: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.surface, borderWidth: 1, borderColor: `${colors.accent}66` }}>
          <Lock size={30} color={colors.accent} strokeWidth={1.65} />
        </View>
      </View>
      <TextField label="Email" value={email} onChangeText={setEmail}
        placeholder="you@example.com" autoCapitalize="none" autoComplete="email"
        keyboardType="email-address" textContentType="emailAddress" returnKeyType="send"
        onSubmitEditing={() => void handleSubmit()}
        error={invalidEmail ? 'Enter a valid email address.' : error}
        leftIcon={<Mail size={18} color={colors.textSecondary} />} />
      <Spacer size="lg" />
      <Button label="Send reset link" size="lg" fullWidth textColor="accentDark"
        style={{ minHeight: 54, borderRadius: 28, opacity: 1 }}
        loading={isSubmitting} disabled={!canSubmit} onPress={() => void handleSubmit()} />
      {error && !invalidEmail ? (
        <BodyText color="danger" accessibilityRole="alert" style={{ marginTop: 12 }}>{error}</BodyText>
      ) : null}
    </AuthFormScreen>
  );
}