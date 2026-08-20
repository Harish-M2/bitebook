import { Pressable, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { BookOpen, Compass, House, Plus, User } from 'lucide-react-native';
import { Tabs } from 'expo-router/js-tabs';

import { colors } from '@/constants/colors';

type LogTabButtonProps = {
  children?: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
};

/** Prominent raised circular button that replaces the default centre tab button. */
function LogTabButton({ onPress }: LogTabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Log a dish"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', top: -18 }}>
      <View
        style={{
          height: 56,
          width: 56,
          borderRadius: 28,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 4,
          borderColor: colors.background,
          shadowColor: colors.accent,
          shadowOpacity: 0.45,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}>
        <Plus size={26} color={colors.background} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

/**
 * Bottom tab navigation — Home, Discover, Log (raised centre button), Diary, Profile.
 * Uses the classic customisable `Tabs` (expo-router/js-tabs) rather than the SDK 57
 * default `unstable_native-tabs`, since native tab bars cannot render a raised centre
 * button (see Bitebook_Build_Instructions.md, section 6/9 navigation spec).
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '',
          tabBarButton: (props) => <LogTabButton onPress={props.onPress} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diary',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
