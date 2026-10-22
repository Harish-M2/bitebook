import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { AuthThemeProvider } from '@/components/auth/AuthThemeProvider';
import { BodyText, Button, Heading } from '@/components/ui';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAppTheme } from '@/hooks/useTheme';

export default function Welcome() {
  return <AuthThemeProvider><WelcomeContent /></AuthThemeProvider>;
}

function WelcomeContent() {
  const { isDark, colors } = useAppTheme();

  return (
    <AuthScreen background="welcome">
      <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 26, paddingVertical: 26 }}>
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', flex: 1, justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <BrandLogo variant="wordmark" width={148} onLight={!isDark} />
          </View>

          <View style={{ gap: 16, paddingBottom: 7 }}>
            <Heading accessibilityRole="header" style={{ fontFamily: 'Georgia', fontSize: 40, lineHeight: 44, maxWidth: 360 }}>
              Good food{ '\n' }lives longer.
            </Heading>
            <BodyText color="textPrimary" style={{ maxWidth: 300, lineHeight: 23 }}>
              Log what you eat, rate it, and find your next favourite dish.
            </BodyText>

            <View style={{ gap: 12, marginTop: 8 }}>
              <Link href="/sign-up" asChild>
                <Button label="Create an account" size="lg" fullWidth textColor="accentDark"
                  style={{ minHeight: 54, borderRadius: 28 }} />
              </Link>
              <Link href="/sign-in" asChild>
                <Button label="I already have an account" variant="outline" size="lg" fullWidth
                  style={{ minHeight: 54, borderRadius: 28, borderColor: isDark ? '#A6814D' : colors.accent }} />
              </Link>
            </View>

          </View>
        </View>
      </ScrollView>
    </AuthScreen>
  );
}