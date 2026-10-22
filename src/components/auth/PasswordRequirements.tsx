import { Check, Circle } from 'lucide-react-native';
import { View } from 'react-native';

import { Caption } from '@/components/ui';
import { useAppTheme } from '@/hooks/useTheme';

const REQUIREMENTS = [
  { label: 'At least 8 characters', test: (password: string) => password.length >= 8 },
  { label: 'One uppercase letter', test: (password: string) => /[A-Z]/.test(password) },
  { label: 'One number', test: (password: string) => /\d/.test(password) },
] as const;

export const meetsPasswordRequirements = (password: string) =>
  REQUIREMENTS.every(({ test }) => test(password));

export function PasswordRequirements({ password }: { password: string }) {
  const { colors } = useAppTheme();

  return (
    <View accessibilityLabel="Password requirements" style={{ gap: 7, marginTop: 8 }}>
      {REQUIREMENTS.map(({ label, test }) => {
        const complete = test(password);
        const Icon = complete ? Check : Circle;
        return (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon size={14} color={complete ? colors.accent : colors.textMuted} strokeWidth={1.8} />
            <Caption color={complete ? 'textPrimary' : 'textSecondary'}>{label}</Caption>
          </View>
        );
      })}
    </View>
  );
}