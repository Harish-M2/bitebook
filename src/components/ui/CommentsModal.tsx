/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { X, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { getReviewComments, addReviewComment } from '@/lib/db/reviews';
import { BodyText, Caption, MetadataText } from './Typography';
import { Avatar } from './Avatar';

export interface CommentsModalProps {
  visible: boolean;
  reviewId: string;
  onClose: () => void;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function CommentsModal({ visible, reviewId, onClose }: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = (await getReviewComments(reviewId)) as unknown as Comment[];
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reviewId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await addReviewComment(reviewId, newComment);
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        onTouchEnd={onClose}>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80%',
            paddingTop: 16,
          }}
          onTouchEnd={(e) => e.stopPropagation()}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <BodyText medium>Comments ({comments.length})</BodyText>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close comments">
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Comments List */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              scrollEnabled
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}>
                  <Avatar
                    uri={item.user?.avatar_url}
                    name={item.user?.display_name ?? 'User'}
                    size="sm"
                  />
                  <View style={{ flex: 1 }}>
                    <BodyText medium>{item.user?.display_name ?? 'Anonymous'}</BodyText>
                    <Caption>{item.body}</Caption>
                    <MetadataText style={{ marginTop: 4 }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </MetadataText>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Caption color="textSecondary">No comments yet. Be the first!</Caption>
                </View>
              }
            />
          )}

          {/* Input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingBottom: Math.max(12, insets.bottom),
            }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surfaceMuted,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                color: colors.textPrimary,
                maxHeight: 100,
              }}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              editable={!submitting}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={!newComment.trim() || submitting}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Submit comment">
              <Send size={20} color={newComment.trim() ? colors.accent : colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
