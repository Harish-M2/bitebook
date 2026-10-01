import { Link } from 'expo-router';
import { View } from 'react-native';

import { BodyText, Button, DisplayText, Screen, Spacer } from '@/components/ui';

/** First screen for a signed-out user — the entry point into sign-in/sign-up. */
export default function Welcome() {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1 justify-center items-center px-xl py-xl">
        <View className="w-full max-w-md items-center">
          <View
            style={{
              width: '100%',
              alignItems: 'center',
              gap: 18,
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderWidth: 1,
              borderColor: 'rgba(215,185,138,0.18)',
              borderRadius: 28,
              paddingVertical: 28,
              paddingHorizontal: 24,
            }}>
            <DisplayText style={{ textAlign: 'center' }}>Bitebook</DisplayText>
            <Spacer size="xs" />
            <BodyText color="textSecondary" style={{ textAlign: 'center', maxWidth: 320 }}>
              Your food diary. Log what you eat, rate it, and find your next favourite dish.
            </BodyText>

            <Spacer size="lg" />

            <Link href="/sign-up" asChild>
              <Button label="Create an account" fullWidth size="lg" />
            </Link>
            <Spacer size="sm" />
            <Link href="/sign-in" asChild>
              <Button label="I already have an account" variant="secondary" fullWidth size="lg" />
            </Link>
          </View>
        </View>
      </View>
    </Screen>
  );
}
