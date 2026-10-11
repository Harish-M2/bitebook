import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { FollowButton } from '@/components/social/FollowButton';
import { Avatar } from '@/components/ui/Avatar';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';

export type PersonRowProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  dishes_logged_count?: number;
  restaurants_visited_count?: number;
  average_rating?: number | null;
};

/** Card for one person in a followers / following list. Tapping opens their profile. */
export function PersonRow({
  profile,
  isSelf = false,
  followsYou = false,
  mutualNames = [],
  cuisines = [],
}: {
  profile: PersonRowProfile;
  isSelf?: boolean;
  followsYou?: boolean;
  mutualNames?: string[];
  cuisines?: string[];
}) {
  const name = profile.display_name || profile.username || 'Bitebook user';
  const statParts = [
    profile.dishes_logged_count ? `${profile.dishes_logged_count} dishes` : null,
    profile.restaurants_visited_count ? `${profile.restaurants_visited_count} restaurants` : null,
    profile.average_rating ? `★ ${Number(profile.average_rating).toFixed(1)}` : null,
  ].filter(Boolean);
  const stats = statParts.join(' · ');
  const mutualText =
    mutualNames.length === 0
      ? ''
      : mutualNames.length === 1
        ? `Followed by ${mutualNames[0]}`
        : `Followed by ${mutualNames[0]} and ${mutualNames.length - 1} other${mutualNames.length > 2 ? 's' : ''}`;

  return (
    <Pressable
      onPress={() => router.push(`/user/${profile.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
      className="flex-row items-center gap-md rounded-xl border border-border bg-surface p-md"
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      })}>
      <View
        style={{
          borderRadius: 999,
          borderWidth: 2,
          borderColor: colors.accent,
          padding: 2,
        }}>
        <Avatar uri={profile.avatar_url} name={name} size="md" />
      </View>
      <View className="flex-1 gap-xxs">
        <BodyText medium numberOfLines={1}>
          {name}
        </BodyText>
        <View className="flex-row items-center gap-xs">
          {profile.username ? (
            <Caption numberOfLines={1} style={{ flexShrink: 1 }}>
              @{profile.username}
            </Caption>
          ) : null}
          {followsYou && !isSelf ? (
            <View className="rounded-pill border border-border bg-surface-elevated px-xs py-xxs">
              <MetadataText>Follows you</MetadataText>
            </View>
          ) : null}
        </View>
        {profile.bio ? (
          <MetadataText numberOfLines={1}>{profile.bio}</MetadataText>
        ) : null}
        {cuisines.length > 0 ? (
          <View className="flex-row flex-wrap gap-xxs pt-xxs">
            {cuisines.map((cuisine) => (
              <View
                key={cuisine}
                className="rounded-pill border border-border bg-surface-elevated px-sm py-xxs">
                <MetadataText>{cuisine}</MetadataText>
              </View>
            ))}
          </View>
        ) : null}
        {stats ? <MetadataText numberOfLines={1}>{stats}</MetadataText> : null}
        {mutualText ? <MetadataText numberOfLines={1}>{mutualText}</MetadataText> : null}
      </View>
      {isSelf ? (
        <ChevronRight size={18} color={colors.textMuted} />
      ) : (
        // Keeps a tap on the button from also opening the profile.
        <View onStartShouldSetResponder={() => true}>
          <FollowButton userId={profile.id} />
        </View>
      )}
    </Pressable>
  );
}
