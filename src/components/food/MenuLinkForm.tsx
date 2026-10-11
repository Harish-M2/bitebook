import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Caption, MetadataText } from '@/components/ui/Typography';
import { submitMenuUrl } from '@/lib/db/restaurants';

/**
 * Lets a signed-in user supply a restaurant's online menu link. The server only accepts
 * links on the restaurant's own website, so there is nothing to approve afterwards.
 */
export function MenuLinkForm({ restaurantId }: { restaurantId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const submit = useMutation({
    mutationFn: () => submitMenuUrl(restaurantId, url),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      setOpen(false);
      setUrl('');
    },
  });

  if (!open) {
    return (
      <Button label="Add menu link" variant="outline" size="sm" onPress={() => setOpen(true)} />
    );
  }

  return (
    <View className="gap-xs">
      <Caption color="textSecondary">
        Paste the menu page from the restaurant’s own website.
      </Caption>
      <TextField
        value={url}
        onChangeText={setUrl}
        placeholder="https://"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={submit.isError ? submit.error.message : null}
      />
      <View className="flex-row gap-sm">
        <Button
          label="Save link"
          size="sm"
          disabled={url.trim().length === 0}
          loading={submit.isPending}
          onPress={() => submit.mutate()}
        />
        <Button label="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} />
      </View>
      <MetadataText>Links on other websites are rejected.</MetadataText>
    </View>
  );
}
