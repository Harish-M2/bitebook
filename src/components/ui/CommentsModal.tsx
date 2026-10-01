import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, X } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { useAppTheme } from '@/hooks/useTheme';
import { addReviewComment, getReviewComments } from '@/lib/db/reviews';

export interface CommentsModalProps {
  visible: boolean;
  reviewId: string;
  onClose: () => void;
}

export function CommentsModal({ visible, reviewId, onClose }: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const [newComment, setNewComment] = useState('');

  const comments = useQuery({
    queryKey: ['review-comments', reviewId],
    queryFn: () => getReviewComments(reviewId),
    enabled: visible && Boolean(reviewId),
  });

  const addComment = useMutation({
    mutationFn: (body: string) => addReviewComment(reviewId, body),
    onSuccess: async () => {
      setNewComment('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    },
  });

  const handleSubmit = () => {
    const body = newComment.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate(body);
  };

  const inputBottomPadding = Math.max(12, insets.bottom, Platform.OS === 'web' ? 24 : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.58)',
          }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close comments" />
        <View
          style={{
            height: '80%',
            maxHeight: '80%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 16,
          }}>
          <View
            className="flex-row items-center justify-between border-b border-border px-lg pb-sm"
            style={{ borderBottomColor: colors.border }}>
            <BodyText medium>Comments ({comments.data?.length ?? 0})</BodyText>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close comments">
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {comments.isPending ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : comments.isError ? (
            <ErrorState
              title="Could not load comments"
              description={comments.error.message}
              onRetry={() => void comments.refetch()}
            />
          ) : (
            <FlatList
              data={comments.data}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
              renderItem={({ item }) => (
                <View className="flex-row gap-sm border-b border-border p-md">
                  <Avatar
                    uri={item.user?.avatar_url}
                    name={item.user?.display_name ?? 'User'}
                    size="sm"
                  />
                  <View className="flex-1 gap-xxs">
                    <BodyText medium>{item.user?.display_name ?? 'Anonymous'}</BodyText>
                    <Caption>{item.body}</Caption>
                    <MetadataText>
                      {new Date(item.created_at).toLocaleDateString()}
                    </MetadataText>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon={<MessageCircle size={32} color={colors.textMuted} />}
                  title="No comments yet"
                  description="Start the conversation."
                />
              }
            />
          )}

          <View
            className="flex-row items-end gap-sm border-t border-border p-md"
            style={{ borderTopColor: colors.border, paddingBottom: inputBottomPadding }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surfaceMuted,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.textPrimary,
                maxHeight: 112,
              }}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              multiline
              maxLength={1000}
              editable={!addComment.isPending}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={!newComment.trim() || addComment.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Submit comment"
              accessibilityState={{ disabled: !newComment.trim() || addComment.isPending }}>
              {addComment.isPending ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Send size={20} color={newComment.trim() ? colors.accent : colors.textMuted} />
              )}
            </Pressable>
          </View>
          {addComment.isError ? (
            <Caption color="danger" style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {addComment.error.message}
            </Caption>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
