import { CheckCircle2, CircleAlert, X } from 'lucide-react-native';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useTheme';
import { BodyText, MetadataText } from './Typography';

type ToastTone = 'success' | 'error';
type ToastNotice = { title: string; message: string; tone: ToastTone };
type ToastContextValue = { showToast: (notice: ToastNotice) => void };

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), notice.tone === 'error' ? 7000 : 4500);
    return () => clearTimeout(timeout);
  }, [notice]);

  return (
    <ToastContext.Provider value={{ showToast: setNotice }}>
      <View className="flex-1">
        {children}
        {notice ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            className="absolute left-lg right-lg z-50"
            style={{ bottom: Math.max(insets.bottom, 16) + 12 }}>
            <View
              className="flex-row items-start gap-sm rounded-md border p-md"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              {notice.tone === 'success'
                ? <CheckCircle2 size={20} color={colors.success} />
                : <CircleAlert size={20} color={colors.danger} />}
              <View className="flex-1 gap-xxs">
                <BodyText medium>{notice.title}</BodyText>
                <MetadataText>{notice.message}</MetadataText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
                onPress={() => setNotice(null)}
                hitSlop={8}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}