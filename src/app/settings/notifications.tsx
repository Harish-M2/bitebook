import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '@/constants/colors';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/db/notifications';

/**
 * Notification settings screen
 * Allows users to customize which notifications they receive
 */
export default function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    try {
      setIsSaving(true);
      await updateNotificationPreferences({ [key]: value });
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load settings</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Section: Activity Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Notifications</Text>

        <SettingRow
          label="Friend Reviews"
          description="When friends post restaurant reviews"
          value={preferences.friend_reviews}
          onToggle={(value) => handleToggle('friend_reviews', value)}
          disabled={isSaving}
        />

        <SettingRow
          label="Friend Follows"
          description="When someone follows you"
          value={preferences.friend_follows}
          onToggle={(value) => handleToggle('friend_follows', value)}
          disabled={isSaving}
        />
      </View>

      {/* Section: App Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Notifications</Text>

        <SettingRow
          label="Restaurant Updates"
          description="When restaurants you follow have updates"
          value={preferences.restaurant_updates}
          onToggle={(value) => handleToggle('restaurant_updates', value)}
          disabled={isSaving}
        />

        <SettingRow
          label="App Announcements"
          description="Important updates and announcements from Bitebook"
          value={preferences.app_announcements}
          onToggle={(value) => handleToggle('app_announcements', value)}
          disabled={isSaving}
        />
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          You can manage push notification permissions in your phone's settings.
        </Text>
      </View>
    </ScrollView>
  );
}

interface SettingRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ label, description, value, onToggle, disabled }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLabel}>
        <Text style={styles.settingTitle}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
        thumbColor={value ? colors.accent : colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingVertical: 16,
    gap: 24,
  },
  section: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  settingLabel: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoBox: {
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
});
