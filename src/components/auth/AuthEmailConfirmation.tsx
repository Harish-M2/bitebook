import { router } from 'expo-router';
import { Leaf, MailOpen, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BrandLogo } from '@/components/ui/BrandLogo';
import { BodyText, Button, Caption, Heading, MetadataText, Spacer } from '@/components/ui';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { useAppTheme } from '@/hooks/useTheme';

type AuthEmailConfirmationProps = {
  email: string;
  description: string;
  resendLabel?: string;
  resendPending?: boolean;
  resendMessage?: string | null;
  resendError?: string | null;
  onResend?: () => void;
};

export function AuthEmailConfirmation({ email, description, resendLabel = 'Resend link',
  resendPending = false, resendMessage, resendError, onResend }: AuthEmailConfirmationProps) {
  const { isDark, colors } = useAppTheme();

  return (
    <AuthScreen background="confirmation">
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', alignItems: 'center' }}>
          <View style={{ height: 170, width: 210, alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={32} color={colors.accent} strokeWidth={1.4}
              style={{ position: 'absolute', left: 12, top: 10, transform: [{ rotate: '-34deg' }] }} />
            <Sparkles size={25} color={colors.accent} strokeWidth={1.5}
              style={{ position: 'absolute', right: 16, top: 16 }} />
            <MailOpen size={126} color={colors.accent} strokeWidth={1.25} />
            <View style={{ position: 'absolute', top: 51, backgroundColor: colors.surface, padding: 6, borderRadius: 5 }}>
              <BrandLogo variant="symbol" width={35} onLight={!isDark} decorative />
            </View>
          </View>
          <Heading accessibilityRole="header" style={{ fontFamily: 'Georgia', textAlign: 'center', fontSize: 30, lineHeight: 36 }}>
            Check your email
          </Heading>
          <Spacer size="sm" />
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>{description}</BodyText>
          <Spacer size="xs" />
          <Caption color="textPrimary" style={{ textAlign: 'center' }}>{email}</Caption>
          <Spacer size="xl" />
          <Button label="Back to sign in" size="lg" fullWidth textColor="accentDark"
            onPress={() => router.replace('/sign-in')} />
          {onResend ? (
            <Pressable accessibilityRole="button" accessibilityLabel={resendLabel}
              disabled={resendPending} onPress={onResend}
              style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
              {resendPending ? <ActivityIndicator color={colors.accent} /> : <MetadataText color="accent">{resendLabel}</MetadataText>}
            </Pressable>
          ) : null}
          {resendMessage ? <Caption color="textSecondary" style={{ textAlign: 'center' }}>{resendMessage}</Caption> : null}
          {resendError ? <Caption color="danger" style={{ textAlign: 'center' }}>{resendError}</Caption> : null}
        </View>
      </View>
    </AuthScreen>
  );
}