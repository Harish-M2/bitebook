import { Image } from 'expo-image';
import { UtensilsCrossed } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { Caption } from '@/components/ui/Typography';
import { useAppTheme } from '@/hooks/useTheme';

type FoodPhotoProps = {
  uri: string | null | undefined;
  label: string;
  style: StyleProp<ViewStyle>;
  emptyLabel?: string;
};

export function FoodPhoto({ uri, label, style, emptyLabel }: FoodPhotoProps) {
  return <PhotoSource key={uri ?? 'missing'} uri={uri} label={label} style={style} emptyLabel={emptyLabel} />;
}

function PhotoSource({ uri, label, style, emptyLabel = 'Bitebook' }: FoodPhotoProps) {
  const { colors } = useAppTheme();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(uri ? 'loading' : 'error');

  return (
    <View style={[{ backgroundColor: colors.surfaceElevated, overflow: 'hidden' }, style]}>
      {status !== 'ready' ? (
        <View
          accessibilityLabel={status === 'loading' ? `Loading ${label} photo` : `Photo unavailable for ${label}`}
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <UtensilsCrossed size={24} color={colors.accent} />
          <Caption color="textMuted">{status === 'loading' ? 'Bitebook' : emptyLabel}</Caption>
          {status === 'loading' ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        </View>
      ) : null}
      {uri && status !== 'error' ? (
        <Image
          source={{ uri }}
          accessibilityLabel={label}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={uri}
          transition={150}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}
    </View>
  );
}