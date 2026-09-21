import React from 'react';
import { Screen } from '@/components/ui/Screen';
import { SavedList } from '@/components/social';

/**
 * Display all saved restaurants for the current user
 * Accessible as a tab or modal from the Discover screen
 */
export default function SavedScreen() {
  return (
    <Screen>
      <SavedList showCuisineFilter={true} />
    </Screen>
  );
}
