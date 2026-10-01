/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { logActivity } from '@/lib/db/activity';
import {
    deleteReview,
    getUserRestaurantReview,
    submitReview,
} from '@/lib/db/reviews';
import { uploadReviewPhoto } from '@/lib/storage/photos';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { AlertCircle, Camera, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { StarPicker } from './StarPicker';

interface ReviewFormProps {
  restaurantId: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export const ReviewForm = ({
  restaurantId,
  onSubmitSuccess,
  onCancel,
}: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);

  const loadExistingReview = async () => {
    try {
      setIsLoading(true);
      const review = await getUserRestaurantReview(restaurantId);
      if (review) {
        setExistingReview(review);
        setRating(review.rating);
        setText(review.text || '');
        setPhotos(review.review_photos?.map((p: any) => p.photo_url) || []);
      }
    } catch {
      console.error('[Bitebook] Failed to load review');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExistingReview();
  }, [restaurantId]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setNewPhotos([...newPhotos, result.assets[0].uri]);
      }
    } catch {
      setError('Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission denied');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setNewPhotos([...newPhotos, result.assets[0].uri]);
      }
    } catch {
      setError('Failed to take photo');
    }
  };

  const removePhoto = (index: number, isNew: boolean) => {
    if (isNew) {
      setNewPhotos(newPhotos.filter((_, i) => i !== index));
    } else {
      setPhotos(photos.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get user ID for activity logging
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;

      // Upload new photos first
      let uploadedUrls: string[] = [];
      if (newPhotos.length > 0) {
        uploadedUrls = await Promise.all(
          newPhotos.map((uri) => uploadReviewPhoto(uri, restaurantId))
        );
      }

      // Submit review
      const review = await submitReview(
        restaurantId,
        rating,
        text || null,
        [...photos, ...uploadedUrls]
      );

      // Log activity (only if it's a new review, not an edit)
      if (!existingReview && userId) {
        try {
          await logActivity(
            userId,
            'new_review',
            `Reviewed a restaurant ${rating} stars`,
            restaurantId,
            review?.id
          );
        } catch (activityError) {
          console.error('[Bitebook] Failed to log activity:', activityError);
          // Don't fail the review submission if activity logging fails
        }
      }

      setRating(0);
      setText('');
      setPhotos([]);
      setNewPhotos([]);
      setError(null);

      onSubmitSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit review';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;

    Alert.alert(
      'Delete Review?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReview(existingReview.id);
              setRating(0);
              setText('');
              setPhotos([]);
              setNewPhotos([]);
              setExistingReview(null);
              onSubmitSuccess?.();
            } catch {
              setError('Failed to delete review');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Rating</Text>
        <StarPicker rating={rating} onRatingChange={setRating} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Your Review</Text>
        <TextInput
          style={styles.input}
          placeholder="Share your thoughts about this restaurant..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          editable={!isSubmitting}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Photos</Text>
        <View style={styles.photoButtonRow}>
          <TouchableOpacity
            style={[styles.photoButton, { borderColor: colors.accent }]}
            onPress={pickImage}
            disabled={isSubmitting}
          >
            <Camera size={20} color={colors.accent} />
            <Text style={styles.photoButtonText}>Choose Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.photoButton, { borderColor: colors.accent }]}
            onPress={takePhoto}
            disabled={isSubmitting}
          >
            <Camera size={20} color={colors.accent} />
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* New photos being uploaded */}
        {newPhotos.length > 0 && (
          <FlatList
            data={newPhotos}
            keyExtractor={(_, i) => `new-${i}`}
            numColumns={3}
            scrollEnabled={false}
            style={styles.photoGrid}
            renderItem={({ item, index }) => (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.photo}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index, true)}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {/* Existing photos */}
        {photos.length > 0 && (
          <FlatList
            data={photos}
            keyExtractor={(_, i) => `existing-${i}`}
            numColumns={3}
            scrollEnabled={false}
            style={styles.photoGrid}
            renderItem={({ item, index }) => (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.photo}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index, false)}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          disabled={isSubmitting}
        />
        <Button
          label={existingReview ? 'Update Review' : 'Post Review'}
          variant="primary"
          onPress={handleSubmit}
          disabled={isSubmitting || rating === 0}
          loading={isSubmitting}
        />
      </View>

      {existingReview && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isSubmitting}
        >
          <Text style={styles.deleteButtonText}>Delete Review</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  photoGrid: {
    marginTop: 12,
  },
  photoContainer: {
    flex: 1,
    margin: 4,
    position: 'relative',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '15',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  deleteButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
});
