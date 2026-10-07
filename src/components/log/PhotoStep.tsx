import { useEvent } from 'expo';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, ArrowRight, Camera, ImageIcon, Play, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Caption, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import type { RestaurantReviewMediaInput } from '@/lib/db/log';
import { preparePhoto } from '@/lib/db/photos';

export type ReviewMediaDraft = RestaurantReviewMediaInput & {
  fileSize: number | null;
};

type PhotoStepProps = {
  media: ReviewMediaDraft[];
  onChange: (media: ReviewMediaDraft[]) => void;
};

const MAX_MEDIA_ITEMS = 8;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];

function videoContentType(asset: ImagePicker.ImagePickerAsset): string {
  const contentType = asset.mimeType?.toLowerCase();
  if (contentType && ALLOWED_VIDEO_TYPES.includes(contentType)) return contentType;

  const extension = asset.fileName?.split('.').pop()?.toLowerCase();
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'm4v') return 'video/x-m4v';
  if (extension === 'mp4') return 'video/mp4';
  throw new Error('Choose an MP4, MOV, or M4V video.');
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return (
    <Pressable
      onPress={() => (isPlaying ? player.pause() : player.play())}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause video preview' : 'Play video preview'}
      className="overflow-hidden rounded-lg border border-border">
      <VideoView player={player} contentFit="cover" nativeControls={false} style={{ width: 96, height: 108 }} />
      <View className="absolute inset-0 items-center justify-center">
        {!isPlaying ? (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-black/60">
            <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Step 4 — attach a small, ordered set of private visit photos and videos. */
export function PhotoStep({ media, onChange }: PhotoStepProps) {
  const [isPreparing, setIsPreparing] = useState(false);
  const remaining = MAX_MEDIA_ITEMS - media.length;

  async function pick(source: 'camera' | 'library') {
    if (remaining <= 0) {
      Alert.alert('Media limit reached', `A visit can include up to ${MAX_MEDIA_ITEMS} items.`);
      return;
    }

    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        source === 'camera' ? 'Camera access needed' : 'Photo access needed',
        'You can enable access in Settings, or skip adding media for now.',
      );
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsMultipleSelection: true,
          orderedSelection: true,
          selectionLimit: remaining,
          allowsEditing: false,
          quality: 1,
        });

    if (result.canceled) return;

    setIsPreparing(true);
    const next: ReviewMediaDraft[] = [];
    let rejectedCount = 0;

    for (const asset of result.assets.slice(0, remaining)) {
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        rejectedCount += 1;
        continue;
      }

      try {
        if (asset.type === 'video') {
          next.push({
            uri: asset.uri,
            type: 'video',
            contentType: videoContentType(asset),
            fileName: asset.fileName ?? 'review-video.mp4',
            fileSize: asset.fileSize ?? null,
          });
        } else if (asset.type === 'image' || source === 'camera') {
          const prepared = await preparePhoto(asset.uri);
          next.push({
            uri: prepared.uri,
            type: 'image',
            contentType: 'image/jpeg',
            fileName: 'review-photo.jpg',
            fileSize: null,
          });
        } else {
          rejectedCount += 1;
        }
      } catch (error) {
        console.warn('[Bitebook] Could not prepare review media:', error);
        rejectedCount += 1;
      }
    }

    onChange([...media, ...next]);
    setIsPreparing(false);

    if (rejectedCount > 0) {
      Alert.alert(
        'Some items were not added',
        `${rejectedCount} item${rejectedCount === 1 ? '' : 's'} exceeded 50 MiB or used an unsupported format.`,
      );
    }
  }

  function moveMedia(index: number, offset: -1 | 1) {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= media.length) return;

    const reordered = [...media];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    onChange(reordered);
  }

  return (
    <View className="flex-1 gap-md px-lg pt-md">
      <View className="gap-xxs">
        <Caption color="textSecondary">Photos and videos stay private unless your review is shared.</Caption>
        <MetadataText>{media.length} of {MAX_MEDIA_ITEMS} attached · up to 50 MiB each</MetadataText>
      </View>

      {media.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-sm">
          {media.map((item, index) => (
              <View key={`${item.uri}-${index}`} className="relative">
              {item.type === 'image' ? (
                <Image
                  source={item.uri}
                  contentFit="cover"
                  style={{ width: 96, height: 108, borderRadius: 10 }}
                />
              ) : (
                <VideoPreview uri={item.uri} />
              )}
              <Pressable
                onPress={() => onChange(media.filter((_, itemIndex) => itemIndex !== index))}
                accessibilityRole="button"
                accessibilityLabel={`Remove media ${index + 1}`}
                className="absolute right-1 top-1 h-8 w-8 items-center justify-center rounded-full bg-black/70">
                <Trash2 size={16} color="#FFFFFF" />
              </Pressable>
              <View className="absolute bottom-1 left-1 right-1 flex-row justify-between">
                <Pressable
                  onPress={() => moveMedia(index, -1)}
                  disabled={index === 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Move media ${index + 1} earlier`}
                  className="h-7 w-7 items-center justify-center rounded-full bg-black/70"
                  style={{ opacity: index === 0 ? 0.35 : 1 }}>
                  <ArrowLeft size={14} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => moveMedia(index, 1)}
                  disabled={index === media.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel={`Move media ${index + 1} later`}
                  className="h-7 w-7 items-center justify-center rounded-full bg-black/70"
                  style={{ opacity: index === media.length - 1 ? 0.35 : 1 }}>
                  <ArrowRight size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ))}
          {remaining > 0 ? (
            <Pressable
              onPress={() => void pick('library')}
              accessibilityRole="button"
              accessibilityLabel="Add more photos or videos"
              className="h-[108px] w-[76px] items-center justify-center gap-xxs rounded-lg border border-dashed border-border bg-surface-elevated">
              <Plus size={18} color={colors.accent} />
              <MetadataText>Add more</MetadataText>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : (
        <View className="h-36 w-full items-center justify-center gap-xs rounded-lg border border-border bg-surface-elevated">
          <ImageIcon size={26} color={colors.textMuted} />
          <MetadataText>Keep this visit worth remembering</MetadataText>
        </View>
      )}

      <View className="gap-sm">
        <Button
          label="Choose photos or videos"
          variant="secondary"
          fullWidth
          loading={isPreparing}
          disabled={remaining <= 0}
          icon={<ImageIcon size={18} color={colors.textPrimary} />}
          onPress={() => void pick('library')}
        />
        <Button
          label="Take a photo"
          variant="outline"
          fullWidth
          disabled={isPreparing || remaining <= 0}
          icon={<Camera size={18} color={colors.textPrimary} />}
          onPress={() => void pick('camera')}
        />
      </View>
    </View>
  );
}