import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { Bookmark, Heart, MessageCircle } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { Rating } from '@/components/ui/Rating';
import type { FeedActivity } from '@/types/models';

type FeedItemProps = {
  activity: FeedActivity;
  className?: string;
};

/** Single home-feed card: actor row, hero photo, dish/restaurant + rating, actions. */
export function FeedItem({ activity, className }: FeedItemProps) {
  const isDish = activity.kind === 'logged_dish';
  const actionLabel = isDish ? 'logged a dish' : 'reviewed a restaurant';
  const subjectLine = isDish ? activity.dish?.restaurant.name : activity.restaurant?.name;
  const title = isDish ? activity.dish?.name : activity.restaurant?.name;
  const rating = isDish ? activity.dish?.rating : activity.restaurant?.rating;

  return (
    <View className={cn('gap-sm', className)}>
      <View className="flex-row items-center gap-xs">
        <Avatar uri={activity.actor.avatarUrl} name={activity.actor.displayName} size="sm" />
        <View className="flex-1">
          <BodyText medium numberOfLines={1}>
            {activity.actor.displayName}{' '}
            <Caption color="textSecondary">{actionLabel}</Caption>
          </BodyText>
          <MetadataText numberOfLines={1}>{subjectLine}</MetadataText>
        </View>
        <MetadataText>{activity.postedAgo}</MetadataText>
      </View>

      <Image
        source={activity.photoUrl ?? undefined}
        transition={150}
        accessibilityLabel={title ?? 'Food photo'}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: colors.surfaceElevated }}
      />

      <View className="gap-xxs">
        <View className="flex-row items-center justify-between">
          <BodyText medium>{title}</BodyText>
          {typeof rating === 'number' ? <Rating value={rating} size="md" /> : null}
        </View>
        {activity.reviewText ? <Caption>&ldquo;{activity.reviewText}&rdquo;</Caption> : null}
      </View>

      <View className="flex-row items-center gap-lg">
        <Pressable
          className="flex-row items-center gap-xxs"
          accessibilityRole="button"
          accessibilityLabel="Like">
          <Heart size={18} color={colors.textSecondary} />
          <MetadataText>{activity.likeCount}</MetadataText>
        </Pressable>
        <Pressable
          className="flex-row items-center gap-xxs"
          accessibilityRole="button"
          accessibilityLabel="Comment">
          <MessageCircle size={18} color={colors.textSecondary} />
          <MetadataText>{activity.commentCount}</MetadataText>
        </Pressable>
        <Pressable
          className="ml-auto"
          accessibilityRole="button"
          accessibilityLabel="Save">
          <Bookmark size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}
