import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { View } from 'react-native';

import { BrandIcon } from '@/components/ui/BrandIcon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/hooks/useTheme';

export function PageNavigation() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View className="flex-row items-center justify-between px-lg py-xs">
      <IconButton size="lg" variant="transparent" accessibilityLabel="Go back"
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
        <ArrowLeft size={22} color={colors.textPrimary} />
      </IconButton>
      <BrandLogo variant="symbol" width={28} decorative />
      <IconButton size="lg" variant="transparent" accessibilityLabel="Go to home"
        onPress={() => router.replace('/')}>
        <BrandIcon name="home" size={22} variant="gold" />
      </IconButton>
    </View>
  );
}