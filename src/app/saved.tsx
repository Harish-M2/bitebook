import { SavedList } from '@/components/social/SavedList';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Typography';

/** Saved restaurants screen, reached from Discover's Want to Eat action. */
export default function SavedScreen() {
  return (
    <Screen>
      <Heading level={2} className="px-lg pb-md pt-xs">
        Want to eat
      </Heading>
      <SavedList />
    </Screen>
  );
}
