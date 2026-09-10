import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { preparePhoto } from '@/lib/db/photos';
import { Button } from '@/components/ui/Button';
import { MetadataText } from '@/components/ui/Typography';

type PhotoStepProps = {
  photoUri: string | null;
  onChange: (uri: string | null) => void;
};

/**
 * Step 4 — the photo. Optional, per spec §11.
 *
 * Picked images are resized before they leave this screen rather than at upload time, so the
 * wait happens while the user is still choosing instead of after they commit to logging.
 */
export function PhotoStep({ photoUri, onChange }: PhotoStepProps) {
  const [isPreparing, setIsPreparing] = useState(false);

  async function pick(source: 'camera' | 'library') {
    // Permission is requested at the point of use rather than up front, so the prompt
    // arrives with obvious context.
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        source === 'camera' ? 'Camera access needed' : 'Photo access needed',
        'You can enable this in Settings, or skip the photo for now.',
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsPreparing(true);
    try {
      const prepared = await preparePhoto(result.assets[0].uri);
      onChange(prepared.uri);
    } catch (error) {
      console.warn('[Bitebook] Could not prepare photo:', error);
      // The original is still usable; resizing is an optimisation, not a requirement.
      onChange(result.assets[0].uri);
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <View className="flex-1 gap-lg px-lg pt-lg">
      <View
        className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-surface-elevated"
        accessibilityLabel={photoUri ? 'Selected photo' : 'No photo selected'}>
        {photoUri ? (
          <Image source={photoUri} contentFit="cover" style={{ flex: 1 }} transition={150} />
        ) : (
          <View className="flex-1 items-center justify-center gap-xs">
            <ImageIcon size={36} color={colors.textMuted} />
            <MetadataText>Photos make a diary worth keeping</MetadataText>
          </View>
        )}
      </View>

      <View className="gap-sm">
        <Button
          label={photoUri ? 'Retake photo' : 'Take photo'}
          variant="secondary"
          fullWidth
          loading={isPreparing}
          icon={<Camera size={18} color={colors.textPrimary} />}
          onPress={() => void pick('camera')}
        />
        <Button
          label="Choose from library"
          variant="outline"
          fullWidth
          disabled={isPreparing}
          icon={<ImageIcon size={18} color={colors.textPrimary} />}
          onPress={() => void pick('library')}
        />
        {photoUri ? (
          <Button
            label="Remove photo"
            variant="ghost"
            fullWidth
            icon={<Trash2 size={18} color={colors.accent} />}
            onPress={() => onChange(null)}
          />
        ) : null}
      </View>
    </View>
  );
}
