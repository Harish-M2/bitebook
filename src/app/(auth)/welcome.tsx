import { View } from 'react-native';
import { Link } from 'expo-router';

import { BodyText, Button, DisplayText, Screen, Spacer } from '@/components/ui';

/** First screen for a signed-out user — the entry point into sign-in/sign-up. */
export default function Welcome() {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1 justify-end px-xl pb-xxl">
        <DisplayText>Bitebook</DisplayText>
        <Spacer size="xs" />
        <BodyText color="textSecondary">
          Your food diary. Log what you eat, rate it, and find your next favourite dish.
        </BodyText>

        <Spacer size="xxl" />

        <Link href="/sign-up" asChild>
          <Button label="Create an account" fullWidth size="lg" />
        </Link>
        <Spacer size="sm" />
        <Link href="/sign-in" asChild>
          <Button label="I already have an account" variant="secondary" fullWidth size="lg" />
        </Link>
      </View>
    </Screen>
  );
}
