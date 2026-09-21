import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { Caption } from '@/components/ui/Typography';

interface Photo {
  url: string;
  label?: string;
}

interface PhotoGalleryModalProps {
  visible: boolean;
  photos: Photo[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export function PhotoGalleryModal({
  visible,
  photos,
  initialIndex = 0,
  onClose,
  title,
}: PhotoGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastVisibleRef = useRef(visible);

  useEffect(() => {
    if (visible && !lastVisibleRef.current) {
      lastVisibleRef.current = true;
      setCurrentIndex(initialIndex);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: screenWidth * initialIndex,
          animated: false,
        });
      }
    } else if (!visible) {
      lastVisibleRef.current = false;
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentIndex(Math.min(index, photos.length - 1));
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: screenWidth * newIndex,
        animated: true,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: screenWidth * newIndex,
        animated: true,
      });
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      presentationStyle="fullScreen"
      animationType="fade"
      onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}>
          <View style={{ flex: 1 }}>
            {title && (
              <Caption numberOfLines={1} style={{ color: colors.textPrimary }}>
                {title}
              </Caption>
            )}
            <Caption style={{ color: colors.textMuted }}>
              {currentIndex + 1} of {photos.length}
            </Caption>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close gallery">
            <X size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Image Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          onScroll={handleScroll}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={photos.length > 1}
          style={{ flex: 1 }}>
          {photos.map((photo, index) => (
            <View
              key={index}
              style={{
                width: screenWidth,
                height: screenHeight - 112,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Image
                source={photo.url}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                contentFit="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Navigation Buttons */}
        {photos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <Pressable
                onPress={goToPrevious}
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  marginTop: -20,
                  zIndex: 10,
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                }}
                accessibilityRole="button"
                accessibilityLabel="Previous photo">
                <ChevronLeft size={24} color={colors.textPrimary} />
              </Pressable>
            )}

            {currentIndex < photos.length - 1 && (
              <Pressable
                onPress={goToNext}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  marginTop: -20,
                  zIndex: 10,
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                }}
                accessibilityRole="button"
                accessibilityLabel="Next photo">
                <ChevronRight size={24} color={colors.textPrimary} />
              </Pressable>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}
