import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View } from 'react-native';
import { BodyText, Screen, Spacer } from '@/components/ui';

/**
 * Intermediate page that captures the reset-password link from email
 * and redirects to the actual reset form inside the auth group
 */
export default function ResetPasswordRedirect() {
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (token_hash && type === 'recovery') {
      // Redirect to the actual reset password screen with params
      router.replace({
        pathname: '/(auth)/reset-password',
        params: { token_hash, type },
      });
    } else {
      setIsReady(true);
    }
  }, [token_hash, type]);

  if (!isReady) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 items-center justify-center">
          <BodyText>Loading reset password...</BodyText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1 items-center justify-center">
        <BodyText>Invalid reset link</BodyText>
      </View>
    </Screen>
  );
}
