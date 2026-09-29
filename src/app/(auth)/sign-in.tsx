import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Link, router } from 'expo-router';

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

export default function SignIn() {
  const { signInWithPassword } = useAuth();

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

    // Leave isSubmitting true: the guard in (auth)/_layout tears this screen down as soon
    // as the session lands, and index resolves whether that means onboarding or Home.
    router.replace('/');
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
          <Heading>Welcome back</Heading>
          <Spacer size="xxs" />
          <BodyText color="textSecondary">Sign in to pick up your food diary.</BodyText>

          <Spacer size="xl" />

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
          />

          <Spacer size="md" />

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
          />

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

          <View className="grow" />
          <Spacer size="xl" />

          <View className="flex-row items-center justify-center gap-xxs">
            <MetadataText>New to Bitebook?</MetadataText>
            <Link href="/sign-up" replace>
              <MetadataText color="accent">Create an account</MetadataText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

