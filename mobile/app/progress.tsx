import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Eyebrow, Fine, Screen, Title } from "../components/ui";
import { listSessions, type ProgressScan } from "../lib/progressStore";
import { colors, fonts, radius, spacing } from "../lib/theme";

function pretty(value?: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function when(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ProgressScreen() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listSessions>>
  >([]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      listSessions()
        .then((items) => {
          if (live) setRows(items);
        })
        .catch(() => {
          if (live) setRows([]);
        });
      return () => {
        live = false;
      };
    }, [])
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Eyebrow>My skin progress</Eyebrow>
        <Title>Tracked scans on this phone.</Title>
        <Body>Personal monitoring only. These records stay on this device.</Body>
        {rows.length === 0 ? <Fine>No tracked scans yet. Save one from a result.</Fine> : null}
        {rows.map((row) => {
          const latest = row.latest as ProgressScan | undefined;
          return (
            <Pressable
              key={row.id}
              style={styles.card}
              onPress={() => router.push({ pathname: "/compare", params: { id: row.id } })}
            >
              <Text style={styles.date}>{when(latest?.created_at || row.created_at)}</Text>
              <Text style={styles.line}>
                {pretty(latest?.condition)} · {pretty(latest?.risk)} risk
              </Text>
              {row.product ? <Text style={styles.meta}>Product: {row.product}</Text> : null}
              {row.reminder ? (
                <Text style={styles.meta}>Reminder: {when(row.reminder)}</Text>
              ) : (
                <Text style={styles.meta}>No upcoming reminder</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.sm, paddingBottom: 48 },
  card: {
    backgroundColor: colors.paper2,
    borderRadius: radius.plate,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 4,
  },
  date: { fontFamily: fonts.sansMed, color: colors.muted },
  line: { fontFamily: fonts.serifSemi, fontSize: 20, color: colors.ink },
  meta: { fontFamily: fonts.sans, color: colors.ink },
});
