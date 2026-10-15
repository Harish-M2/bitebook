import { useRouter } from 'expo-router';
import { ArrowLeft, House } from 'lucide-react-native';
import { View } from 'react-native';

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
      <IconButton size="lg" variant="transparent" accessibilityLabel="Go to home"
        onPress={() => router.replace('/')}>
        <House size={22} color={colors.accent} />
      </IconButton>
    </View>
  );
}