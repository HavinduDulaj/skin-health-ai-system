import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Body, Eyebrow, Screen, Title } from "../components/ui";
import { listScreenings } from "../lib/db";
import type { ScreeningHistoryRow } from "../lib/types";
import { colors, fonts, spacing } from "../lib/theme";

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
      <Eyebrow>On-device log</Eyebrow>
      <Title>SQLite, this phone only.</Title>
      <Body>
        JSON summaries. Photographs are never written to the log. Pull down to refresh.
      </Body>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.sage} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No plates yet. Run a capture to start the log.</Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.n}>{String(rows.length - index).padStart(2, "0")}</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>
                {item.condition || item.lesion || "Screening"} · {item.risk || item.decision}
              </Text>
              <Text style={styles.rowMeta}>
                {new Date(item.created_at).toLocaleString()} · {item.display_name || "Anonymous"}
              </Text>
              {item.summary ? <Text style={styles.rowSummary}>{item.summary}</Text> : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 0 },
  list: { gap: 10, paddingBottom: 48, paddingTop: 4 },
  empty: { color: colors.muted, fontFamily: fonts.serifItalic, fontSize: 16, marginTop: spacing.lg },
  row: {
    backgroundColor: colors.paper2,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    gap: 12,
  },
  n: { fontFamily: fonts.serif, color: colors.sage, fontSize: 14, width: 26 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
    textTransform: "capitalize",
    fontSize: 15,
  },
  rowMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
  rowSummary: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 20, fontSize: 13 },
});
