import { Soup } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Log tab — placeholder for Phase 1. The full multi-step logging flow (restaurant
 * search → dish → photo → rating → review → share) lands in a later phase; see
 * Bitebook_Build_Instructions.md section 9 "Logging Flow".
 */
export default function LogScreen() {
  return (
    <Screen>
      <EmptyState
        icon={<Soup size={40} color={colors.accent} />}
        title="Log a dish"
        description="Search a restaurant, snap a photo and rate what you had. Coming very soon."
        action={<Button label="Start logging" variant="primary" disabled />}
      />
    </Screen>
  );
}
