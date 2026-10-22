import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useAppTheme } from '@/hooks/useTheme';
import { Caption, MetadataText } from './Typography';

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return date.getFullYear() === Number(match[1])
      && date.getMonth() === Number(match[2]) - 1
      && date.getDate() === Number(match[3])
    ? date
    : null;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateLabel(value: string): string {
  const date = parseLocalDate(value);
  return date
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
    : 'Select a date';
}

export function DatePickerField({ label, value, onChange, hint }: DatePickerFieldProps) {
  const { colors, isDark } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const selectedDate = parseLocalDate(value);
  const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function openPicker() {
    const initialDate = selectedDate ?? new Date();
    setMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setVisible(true);
  }

  function moveMonth(offsetBy: -1 | 1) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offsetBy, 1));
  }

  return (
    <View className="gap-xxs">
      <Caption color="textSecondary">{label}</Caption>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${dateLabel(value)}. Choose date`}
        onPress={openPicker}
        className="flex-row items-center justify-between rounded-md border border-border bg-surface-muted px-sm"
        style={{ minHeight: 50 }}>
        <MetadataText style={{ color: colors.textPrimary }}>{dateLabel(value)}</MetadataText>
        <CalendarDays size={18} color={colors.textSecondary} />
      </Pressable>
      {hint ? <MetadataText>{hint}</MetadataText> : null}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 items-center justify-center px-lg" style={{ backgroundColor: 'rgba(0,0,0,0.58)' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close date picker"
            onPress={() => setVisible(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            accessibilityViewIsModal
            className="w-full max-w-sm gap-md rounded-lg border border-border bg-surface p-md"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => moveMonth(-1)}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-md">
                <ChevronLeft size={20} color={colors.textPrimary} />
              </Pressable>
              <MetadataText style={{ color: colors.textPrimary }}>
                {new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(month)}
              </MetadataText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => moveMonth(1)}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-md">
                <ChevronRight size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View className="flex-row">
              {WEEKDAYS.map((weekday, index) => (
                <View key={`${weekday}-${index}`} className="flex-1 items-center py-xxs">
                  <MetadataText>{weekday}</MetadataText>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {cells.map((day, index) => {
                if (day === null) return <View key={`blank-${index}`} style={{ width: '14.2857%', aspectRatio: 1 }} />;
                const isSelected = selectedDate?.getFullYear() === month.getFullYear()
                  && selectedDate.getMonth() === month.getMonth()
                  && selectedDate.getDate() === day;
                const selected = new Date(month.getFullYear(), month.getMonth(), day, 12);
                const isoDate = toIsoDate(selected);
                return (
                  <Pressable
                    key={isoDate}
                    accessibilityRole="button"
                    accessibilityLabel={new Intl.DateTimeFormat('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    }).format(selected)}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(isoDate);
                      setVisible(false);
                    }}
                    className="items-center justify-center rounded-full"
                    style={{
                      width: '14.2857%',
                      aspectRatio: 1,
                      backgroundColor: isSelected ? colors.accent : 'transparent',
                    }}>
                    <MetadataText style={{ color: isSelected ? colors.background : colors.textPrimary }}>
                      {day}
                    </MetadataText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setVisible(false)}
              className="items-center rounded-md border border-border py-sm"
              style={{ borderColor: colors.border }}>
              <MetadataText style={{ color: isDark ? colors.textSecondary : colors.textPrimary }}>Cancel</MetadataText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}