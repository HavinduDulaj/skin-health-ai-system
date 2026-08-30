import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Body, Eyebrow, Screen, Title } from "../components/ui";
import { listScreenings } from "../lib/db";
import type { ScreeningHistoryRow } from "../lib/types";
import { colors, fonts, radius, spacing } from "../lib/theme";

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
      <Eyebrow>Session log</Eyebrow>
      <Title>This phone only.</Title>
      <Body>
        Summaries from runs on this device. Photographs are not written to the
        log.
      </Body>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.sage} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No results yet. Run your first screening.</Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rowN}>{String(rows.length - index).padStart(2, "0")}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {item.condition || item.lesion || "Screening"} · {item.risk || item.decision}
              </Text>
              <Text style={styles.rowMeta}>
                {new Date(item.created_at).toLocaleString()}
                {item.display_name ? ` · ${item.display_name}` : ""}
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
  empty: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 15,
    marginTop: spacing.lg,
  },
  row: {
    backgroundColor: colors.paper2,
    padding: spacing.md,
    borderRadius: radius.plate,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  rowN: { fontFamily: fonts.serif, color: colors.sage, fontSize: 16, width: 28 },
  rowTitle: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
    textTransform: "capitalize",
    fontSize: 15,
  },
  rowMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  rowSummary: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 20, fontSize: 13, marginTop: 4 },
});
