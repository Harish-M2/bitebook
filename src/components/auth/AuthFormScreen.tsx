import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { BodyText, Heading, IconButton, Spacer } from '@/components/ui';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAppTheme } from '@/hooks/useTheme';

type AuthFormScreenProps = {
  title: string;
  description: string;
  fallbackHref: '/welcome' | '/sign-in';
  children: ReactNode;
  footer?: ReactNode;
  brandVariant?: 'stacked' | 'wordmark';
};

export function AuthFormScreen({ title, description, fallbackHref, children, footer, brandVariant = 'stacked' }: AuthFormScreenProps) {
  const { isDark, colors } = useAppTheme();

  return (
    <AuthScreen background="forms">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 }}>
          <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
            <IconButton size="md" variant="transparent" accessibilityLabel="Go back"
              onPress={() => router.canGoBack() ? router.back() : router.replace(fallbackHref)}>
              <ChevronLeft size={20} color={colors.textPrimary} />
            </IconButton>

            <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 20 }}>
              <BrandLogo variant={brandVariant} width={brandVariant === 'wordmark' ? 148 : 78} onLight={!isDark} />
            </View>
            <Heading accessibilityRole="header" style={{ fontFamily: 'Georgia', textAlign: 'center', fontSize: 28, lineHeight: 34 }}>
              {title}
            </Heading>
            <Spacer size="xxs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>{description}</BodyText>
            <Spacer size="xl" />
            {children}
            {footer ? <View style={{ marginTop: 24 }}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}