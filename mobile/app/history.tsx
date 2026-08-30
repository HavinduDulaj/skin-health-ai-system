import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Body, Screen, Title } from "../components/ui";
import { listScreenings } from "../lib/db";
import type { ScreeningHistoryRow } from "../lib/types";
import { colors, spacing } from "../lib/theme";
import { useFocusEffect } from "expo-router";

export default function HistoryScreen() {
  const [rows, setRows] = useState<ScreeningHistoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setRows(await listScreenings());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen style={styles.root}>
      <Title>On-device history</Title>
      <Body>
        Stored locally in SQLite on this phone. JSON summaries only — photographs are never saved.
      </Body>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No screenings yet. Run your first assessment.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {item.condition || item.lesion || "Screening"} · {item.risk || item.decision}
            </Text>
            <Text style={styles.rowMeta}>
              {new Date(item.created_at).toLocaleString()} · {item.display_name || "Anonymous"}
            </Text>
            {item.summary ? <Text style={styles.rowSummary}>{item.summary}</Text> : null}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 0 },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.muted, marginTop: spacing.lg },
  row: {
    backgroundColor: colors.paper2,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  rowTitle: { color: colors.ink, fontWeight: "700", textTransform: "capitalize" },
  rowMeta: { color: colors.muted, fontSize: 12 },
  rowSummary: { color: colors.muted, lineHeight: 20 },
});
