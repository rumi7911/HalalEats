import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanHistoryRow } from '@/components/scan-history-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScanHistory } from '@/hooks/use-scan-history';
import { ScanRecord } from '@/lib/database';

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { scans, isLoading, error, refresh, clear } = useScanHistory();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function handleClear() {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all scan history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clear },
      ]
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.icon + '22' }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Scan History</Text>
        {scans.length > 0 ? (
          <TouchableOpacity onPress={handleClear} hitSlop={8}>
            <IconSymbol name="trash" size={20} color={colors.icon} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.icon, fontSize: 15 }}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.tint, fontSize: 15 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.centered}>
          <IconSymbol name="barcode.viewfinder" size={56} color={colors.icon} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No scans yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.icon }]}>
            Scan a product barcode to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item: ScanRecord) => item.barcode}
          renderItem={({ item }) => (
            <ScanHistoryRow
              item={item}
              onPress={() => router.push(`/product/${item.barcode}`)}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
