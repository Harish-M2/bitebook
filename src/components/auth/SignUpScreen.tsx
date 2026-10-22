import { Link, router } from 'expo-router';
import { Lock, Mail, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthEmailConfirmation } from '@/components/auth/AuthEmailConfirmation';
import { AuthFormScreen } from '@/components/auth/AuthFormScreen';
import { PasswordRequirements, meetsPasswordRequirements } from '@/components/auth/PasswordRequirements';
import { BodyText, Button, MetadataText, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const { colors } = useAppTheme();
  const { signUpWithPassword, resendSignUpConfirmation } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const normalizedEmail = email.trim();
  const emailInvalid = normalizedEmail.length > 0 && !EMAIL_PATTERN.test(normalizedEmail);
  const canSubmit = displayName.trim().length > 0 && EMAIL_PATTERN.test(normalizedEmail) &&
    meetsPasswordRequirements(password) && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signUpWithPassword(normalizedEmail, password, displayName.trim());
      if (result.error) {
        setError(result.error);
      } else if (result.needsEmailConfirmation) {
        setAwaitingConfirmation(true);
      } else {
        router.replace('/');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);
    setResendError(null);
    try {
      const result = await resendSignUpConfirmation(normalizedEmail);
      if (result.error) setResendError(result.error);
      else setResendMessage('A new confirmation email was requested.');
    } catch (resendFailure) {
      setResendError(resendFailure instanceof Error ? resendFailure.message : 'Could not resend the confirmation email.');
    } finally {
      setIsResending(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <AuthEmailConfirmation email={normalizedEmail}
        description="A confirmation link has been requested. Follow it to verify your account before signing in."
        resendPending={isResending} resendMessage={resendMessage} resendError={resendError}
        onResend={() => void handleResend()} />
    );
  }

  return (
    <AuthFormScreen title="Create your account" fallbackHref="/welcome"
      description="Join Bitebook and start capturing unforgettable meals."
      footer={(
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <MetadataText>Already have an account?</MetadataText>
          <Link href="/sign-in" replace asChild>
            <Pressable accessibilityRole="link">
              <MetadataText color="accent">Sign in</MetadataText>
            </Pressable>
          </Link>
        </View>
      )}>
      <View style={{ gap: 15 }}>
        <TextField label="Full name" value={displayName} onChangeText={setDisplayName}
          placeholder="Your name" autoCapitalize="words" autoComplete="name"
          textContentType="name" returnKeyType="next"
          leftIcon={<UserRound size={18} color={colors.textSecondary} />} />
        <TextField label="Email" value={email} onChangeText={setEmail}
          placeholder="you@example.com" autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" textContentType="emailAddress" returnKeyType="next"
          error={emailInvalid ? 'Enter a valid email address.' : undefined}
          leftIcon={<Mail size={18} color={colors.textSecondary} />} />
        <View>
          <TextField label="Password" value={password} onChangeText={setPassword}
            placeholder="Create a password" autoCapitalize="none" autoComplete="new-password"
            textContentType="newPassword" secureTextEntry returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()} error={error}
            leftIcon={<Lock size={18} color={colors.textSecondary} />} />
          <PasswordRequirements password={password} />
        </View>
      </View>
      <Spacer size="lg" />
      <Button label="Create account" size="lg" fullWidth textColor="accentDark"
        style={{ minHeight: 54, borderRadius: 28, opacity: 1 }}
        loading={isSubmitting} disabled={!canSubmit} onPress={() => void handleSubmit()} />
      <BodyText color="textMuted" style={{ textAlign: 'center', marginTop: 12 }}>
        We&apos;ll use your name for your Bitebook profile.
      </BodyText>
    </AuthFormScreen>
  );
}