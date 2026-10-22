import { router, useLocalSearchParams } from 'expo-router';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthFormScreen } from '@/components/auth/AuthFormScreen';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { PasswordRequirements, meetsPasswordRequirements } from '@/components/auth/PasswordRequirements';
import { BodyText, Button, Caption, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { colors } = useAppTheme();
  const { isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [initialRecovery] = useState(isPasswordRecovery);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(initialRecovery);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = meetsPasswordRequirements(password) && passwordsMatch && !isSubmitting;

  useEffect(() => {
    let isCancelled = false;
    const onRecovery = (_event: string, nextSession: { user?: unknown } | null) => {
      if (!isCancelled && nextSession) {
        setHasRecoverySession(true);
        clearPasswordRecovery();
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') onRecovery(event, nextSession);
    });

    const resolveRecoverySession = async () => {
      let exchangeError: string | null = null;
      let codeVerified = false;
      if (code) {
        const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        exchangeError = codeError?.message ?? null;
        codeVerified = !codeError && Boolean(data.session);
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (isCancelled) return;
      if (Boolean(data.session) && (codeVerified || initialRecovery)) {
        setHasRecoverySession(true);
        clearPasswordRecovery();
      } else {
        setHasRecoverySession(false);
        if (sessionError || exchangeError) setError(sessionError?.message ?? exchangeError);
      }
      setIsCheckingRecovery(false);
    };

    void resolveRecoverySession().catch((recoveryError: unknown) => {
      if (!isCancelled) {
        setError(recoveryError instanceof Error ? recoveryError.message : 'We could not verify this password reset link.');
        setIsCheckingRecovery(false);
      }
    });
    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [code, initialRecovery, clearPasswordRecovery]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) setError(updateError.message);
      else {
        clearPasswordRecovery();
        setIsSuccess(true);
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingRecovery) {
    return (
      <AuthScreen background="forms">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator color={colors.accent} />
          <Caption style={{ marginTop: 12 }}>Checking your reset link…</Caption>
        </View>
      </AuthScreen>
    );
  }

  if (isSuccess) {
    return (
      <AuthFormScreen title="Password updated" fallbackHref="/sign-in"
        description="Your new password is ready to use. Sign in with it to continue.">
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <ShieldCheck size={58} color={colors.accent} strokeWidth={1.4} />
        </View>
        <Button label="Back to sign in" size="lg" fullWidth textColor="accentDark"
          style={{ minHeight: 54, borderRadius: 28, opacity: 1 }}
          onPress={() => router.replace('/sign-in')} />
      </AuthFormScreen>
    );
  }

  if (!hasRecoverySession) {
    return (
      <AuthFormScreen title="Reset link expired" fallbackHref="/sign-in"
        description={error ?? 'This link is invalid or expired. Request a new reset link to continue.'}>
        <Button label="Request a new link" size="lg" fullWidth textColor="accentDark"
          style={{ minHeight: 54, borderRadius: 28, opacity: 1 }}
          onPress={() => router.replace('/forgot-password')} />
      </AuthFormScreen>
    );
  }

  return (
    <AuthFormScreen title="Create a new password" fallbackHref="/sign-in"
      description="Choose a new password to secure your account.">
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{ height: 66, width: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.surface, borderWidth: 1, borderColor: `${colors.accent}66` }}>
          <Lock size={27} color={colors.accent} strokeWidth={1.6} />
        </View>
      </View>
      <TextField label="New password" value={password} onChangeText={setPassword}
        placeholder="Create a password" autoCapitalize="none" autoComplete="new-password"
        textContentType="newPassword" secureTextEntry returnKeyType="next"
        error={error} leftIcon={<Lock size={18} color={colors.textSecondary} />} />
      <PasswordRequirements password={password} />
      <Spacer size="md" />
      <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword}
        placeholder="Confirm your password" autoCapitalize="none" secureTextEntry
        returnKeyType="go" onSubmitEditing={() => void handleSubmit()}
        error={confirmPassword && !passwordsMatch ? 'Passwords do not match.' : undefined}
        leftIcon={<Lock size={18} color={colors.textSecondary} />} />
      <Spacer size="lg" />
      <Button label="Update password" size="lg" fullWidth textColor="accentDark"
        style={{ minHeight: 54, borderRadius: 28, opacity: 1 }}
        loading={isSubmitting} disabled={!canSubmit} onPress={() => void handleSubmit()} />
      {error ? <BodyText color="danger" accessibilityRole="alert" style={{ marginTop: 12 }}>{error}</BodyText> : null}
    </AuthFormScreen>
  );
}