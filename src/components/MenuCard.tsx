import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SDV, pixelChrome } from '../theme/stardewPixel';

interface Props {
  title: string;
  subtitle?: string;
  onPress: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function MenuCard({ title, subtitle, onPress, compact, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact, styles.cardSurface, style]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text
          style={[styles.title, compact && styles.titleCompact]}
          numberOfLines={compact ? 2 : undefined}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, compact && styles.subtitleCompact]}
            numberOfLines={compact ? 2 : undefined}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight color={SDV.ink} size={compact ? 20 : 24} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    ...pixelChrome,
    borderRadius: 10,
    marginBottom: 16,
  },
  cardCompact: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 0,
    minHeight: 92,
  },
  cardSurface: { backgroundColor: SDV.panel },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 4, color: SDV.ink },
  titleCompact: { fontSize: 13, marginBottom: 2, lineHeight: 17, color: SDV.ink },
  subtitle: { fontSize: 11, fontWeight: '600', color: SDV.subtext },
  subtitleCompact: { fontSize: 9, lineHeight: 13, color: SDV.subtext },
});
