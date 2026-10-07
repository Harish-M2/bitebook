import { Image } from 'expo-image';
import { Bookmark, Heart, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { toggleLikeReview } from '@/lib/db/reviews';
import { saveRestaurant, unsaveRestaurant } from '@/lib/db/saved';
import type { FeedActivity } from '@/types/models';

type FeedItemProps = {
  activity: FeedActivity;
  className?: string;
  onCommentPress?: () => void;
  onActorPress?: () => void;
  onSubjectPress?: () => void;
};

/** Single home-feed card: actor row, hero photo, dish/restaurant + rating, actions. */
export function FeedItem({ activity, className, onCommentPress, onActorPress, onSubjectPress }: FeedItemProps) {
  const isDish = activity.kind === 'logged_dish';
  const isVisit = activity.kind === 'restaurant_visit';
  const actionLabel = isVisit
    ? 'shared a restaurant visit'
    : isDish ? 'logged a dish' : 'reviewed a restaurant';
  const subjectLine = isDish ? activity.dish?.restaurant.name : activity.restaurant?.city || activity.restaurant?.name;
  const title = isVisit ? activity.visit?.restaurant.name : isDish ? activity.dish?.name : activity.restaurant?.name;
  const rating = isVisit ? activity.visit?.overallRating : isDish ? activity.dish?.rating : activity.restaurant?.rating;

  const [isLiking, setIsLiking] = useState(false);
  const [likeCount, setLikeCount] = useState(activity.likeCount ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = async () => {
    if (isLiking || !activity.review_id) return;
    setIsLiking(true);
    try {
      const result = await toggleLikeReview(activity.review_id);
      setLikeCount((prev) => (result.liked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (isSaving || !activity.restaurant_id) return;
    setIsSaving(true);
    try {
      if (isSaved) await unsaveRestaurant(activity.restaurant_id);
      else await saveRestaurant(activity.restaurant_id);
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className={cn('gap-sm', className)}>
      <View className="flex-row items-center gap-xs">
        <Pressable
          onPress={onActorPress}
          disabled={!onActorPress}
          className="min-w-0 flex-1 flex-row items-center gap-xs"
          accessibilityRole={onActorPress ? 'button' : undefined}
          accessibilityLabel={onActorPress ? `View ${activity.actor.displayName}'s profile` : undefined}>
          <Avatar uri={activity.actor.avatarUrl} name={activity.actor.displayName} size="sm" />
          <View className="flex-1">
            <BodyText medium numberOfLines={1}>
              {activity.actor.displayName}{' '}
              <Caption color="textSecondary">{actionLabel}</Caption>
            </BodyText>
            <MetadataText numberOfLines={1}>{subjectLine}</MetadataText>
          </View>
        </Pressable>
        <MetadataText>{activity.postedAgo}</MetadataText>
      </View>

      {activity.photoUrl ? (
        <Pressable
          onPress={onSubjectPress}
          disabled={!onSubjectPress}
          accessibilityRole={onSubjectPress ? 'button' : undefined}
          accessibilityLabel={onSubjectPress ? `View ${title ?? 'review'}` : undefined}
          style={{ alignItems: 'center' }}>
          <Image
            source={activity.photoUrl}
            transition={150}
            accessibilityLabel={title ?? 'Food photo'}
            style={{
              width: '86%',
              maxWidth: 420,
              aspectRatio: 1.15,
              borderRadius: 18,
              backgroundColor: colors.surfaceElevated,
              alignSelf: 'center',
            }}
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onSubjectPress}
        disabled={!onSubjectPress}
        accessibilityRole={onSubjectPress ? 'button' : undefined}
        accessibilityLabel={onSubjectPress ? `Open ${title ?? 'review'}` : undefined}
        className="gap-xxs">
        <View className="flex-row items-center justify-between gap-sm">
          <BodyText medium className="flex-1">{title}</BodyText>
          {typeof rating === 'number' ? <Rating value={rating} size="md" /> : null}
        </View>
        {activity.reviewText ? <Caption>&ldquo;{activity.reviewText}&rdquo;</Caption> : null}
        {isVisit && activity.visit ? (
          <Caption color="textSecondary">
            {activity.visit.dishes.length} dishes · {activity.visit.dishes.slice(0, 3).map((dish) => dish.name).join(' · ')}
          </Caption>
        ) : null}
      </Pressable>

      <View className="flex-row items-center gap-lg">
        {activity.review_id ? <Pressable
          className="flex-row items-center gap-xxs"
          onPress={handleLike}
          disabled={isLiking}
          accessibilityRole="button"
          accessibilityLabel="Like">
          <Heart size={18} color={colors.textSecondary} fill={isLiking ? colors.accent : undefined} />
          <MetadataText>{likeCount}</MetadataText>
        </Pressable> : null}
        {activity.review_id ? <Pressable
          className="flex-row items-center gap-xxs"
          onPress={onCommentPress}
          accessibilityRole="button"
          accessibilityLabel="Comment">
          <MessageCircle size={18} color={colors.textSecondary} />
          <MetadataText>{activity.commentCount}</MetadataText>
        </Pressable> : null}
        <Pressable
          className="ml-auto"
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Save">
          <Bookmark size={18} color={colors.textSecondary} fill={isSaved ? colors.accent : undefined} />
        </Pressable>
      </View>
    </View>
  );
}
