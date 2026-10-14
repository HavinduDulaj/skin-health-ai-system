import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import Card from '../components/Card';
import { AppIcon, ScreenHeader, StatusPill } from '../components/DesignSystem';
import { useThemeContext } from '../context/ThemeContext';
import { storageService } from '../services/storageService';
import type { ScanResult } from '../types';

export default function HistoryScreen() {
  const { palette } = useThemeContext();
  const [history, setHistory] = useState<ScanResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      storageService.getHistory().then(setHistory).catch(() => setHistory([]));
    }, [])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={history}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ScreenHeader title="History" subtitle="Saved scan results" />}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <AppIcon name="document-text-outline" size={42} color={palette.muted} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No scans yet</Text>
            <Text style={[styles.emptyText, { color: palette.secondaryText }]}>
              Saved scan results will appear here after you analyze and save an image.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <View style={styles.row}>
              {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.thumbnail} /> : null}
              <View style={styles.copy}>
                <Text style={[styles.condition, { color: palette.text }]}>{item.condition}</Text>
                <Text style={[styles.meta, { color: palette.secondaryText }]}>
                  {Math.round(item.confidence * 100)}% Confidence
                </Text>
                <Text style={[styles.meta, { color: palette.secondaryText }]}>
                  {new Date(item.date).toLocaleString()}
                </Text>
              </View>
              {item.riskLevel ? (
                <StatusPill
                  label={`${item.riskLevel} Risk`}
                  tone={item.riskLevel === 'High' ? 'red' : item.riskLevel === 'Medium' ? 'amber' : 'green'}
                />
              ) : null}
              <AppIcon name="chevron-forward-outline" size={18} color={palette.secondaryText} />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  itemCard: {
    marginBottom: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    borderRadius: 8,
    height: 64,
    width: 64,
  },
  copy: {
    flex: 1,
  },
  condition: {
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  emptyCard: {
    alignItems: 'center',
  },
});
