import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClassificationBadge } from '@/components/classification-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScanRecord } from '@/lib/database';

interface Props {
  item: ScanRecord;
  onPress: () => void;
}

export function ScanHistoryRow({ item, onPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const formattedDate = new Date(item.scanned_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.icon + '22' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.thumbnail, { backgroundColor: colors.icon + '22' }]}>
        {item.thumbnail_url ? (
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnailImage}
            contentFit="contain"
          />
        ) : (
          <Text style={styles.thumbnailPlaceholder}>🍽</Text>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.productName, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.product_name || 'Unknown Product'}
        </Text>
        {item.brand ? (
          <Text style={[styles.brand, { color: colors.icon }]} numberOfLines={1}>
            {item.brand}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <ClassificationBadge status={item.classification} size="sm" />
          <Text style={[styles.date, { color: colors.icon }]}>{formattedDate}</Text>
        </View>
      </View>

      <IconSymbol name="chevron.right" size={16} color={colors.icon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbnailImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
  },
  brand: {
    fontSize: 13,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
  },
});
