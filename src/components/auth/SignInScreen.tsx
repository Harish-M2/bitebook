import { Link, router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthFormScreen } from '@/components/auth/AuthFormScreen';
import { BodyText, Button, MetadataText, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedEmail = email.trim();
  const emailInvalid = normalizedEmail.length > 0 && !EMAIL_PATTERN.test(normalizedEmail);
  const canSubmit = EMAIL_PATTERN.test(normalizedEmail) && password.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signInWithPassword(normalizedEmail, password);
      if (result.error) setError(result.error);
      else router.replace('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not sign in. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormScreen title="Welcome back" fallbackHref="/welcome" brandVariant="wordmark"
      description="Sign in to continue your food journey."
      footer={(
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <MetadataText>Don&apos;t have an account?</MetadataText>
          <Link href="/sign-up" replace asChild>
            <Pressable accessibilityRole="link">
              <MetadataText color="accent">Sign up</MetadataText>
            </Pressable>
          </Link>
        </View>
      )}>
      <View style={{ gap: 14 }}>
        <TextField label="Email" value={email} onChangeText={setEmail}
          placeholder="you@example.com" autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" textContentType="emailAddress" returnKeyType="next"
          error={emailInvalid ? 'Enter a valid email address.' : undefined}
          leftIcon={<Mail size={18} color={colors.textSecondary} />} />
        <TextField label="Password" value={password} onChangeText={setPassword}
          placeholder="Your password" autoCapitalize="none" autoComplete="current-password"
          textContentType="password" secureTextEntry returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()} error={error}
          leftIcon={<Lock size={18} color={colors.textSecondary} />} />
      </View>
      <View style={{ alignItems: 'flex-end', marginTop: 10 }}>
        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <MetadataText color="accent">Forgot password?</MetadataText>
          </Pressable>
        </Link>
      </View>
      <Spacer size="lg" />
      <Button label="Sign in" size="lg" fullWidth textColor="accentDark"
        style={{ minHeight: 54, borderRadius: 28, opacity: 1 }}
        loading={isSubmitting} disabled={!canSubmit} onPress={() => void handleSubmit()} />
      {error && !password ? (
        <BodyText color="danger" accessibilityRole="alert" style={{ marginTop: 12 }}>{error}</BodyText>
      ) : null}
    </AuthFormScreen>
  );
}