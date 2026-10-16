import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Body, Eyebrow, Fine, GhostButton, PrimaryButton, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { compareScans, dueFromChoice, PROGRESS_DISCLAIMER } from "../lib/compare";
import {
  addProduct,
  addReminder,
  deleteSession,
  loadSession,
  removeProduct,
  rescheduleReminder,
  setReminderStatus,
  type ProgressProduct,
  type ProgressReminder,
  type ProgressScan,
  type ProgressSession,
} from "../lib/progressStore";
import { colors, fonts, radius, spacing } from "../lib/theme";

function pretty(value?: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function reminderParts(iso?: string | null): { day: string; time: string; local: string } {
  const date = iso ? new Date(iso) : new Date(NaN);
  if (Number.isNaN(date.getTime())) return { day: "—", time: "", local: "" };
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    day: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    time: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    local: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function futureIso(raw: string): string {
  const due = new Date(raw.trim().replace(" ", "T"));
  if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) return "";
  return due.toISOString();
}

function when(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function CompareScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { setFollowSessionId } = useApp();
  const [session, setSession] = useState<ProgressSession | null>(null);
  const [scans, setScans] = useState<ProgressScan[]>([]);
  const [products, setProducts] = useState<ProgressProduct[]>([]);
  const [reminders, setReminders] = useState<ProgressReminder[]>([]);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState("");
  const [picked, setPicked] = useState("");
  const [remindError, setRemindError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<ProgressReminder | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) {
      setReady(true);
      return;
    }
    const data = await loadSession(id);
    setSession(data.session);
    setScans(data.scans);
    setProducts(data.products);
    setReminders(data.reminders);
    setReady(true);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        setSession(null);
        setReady(true);
      });
    }, [refresh])
  );

  if (!ready) {
    return (
      <Screen>
        <Body>Loading saved scans…</Body>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <Title>No tracked session</Title>
        <Body>This record is missing or was deleted.</Body>
        <PrimaryButton label="My skin progress" onPress={() => router.replace("/progress")} />
      </Screen>
    );
  }

  const record = session;
  const previous = scans[scans.length - 2];
  const latest = scans[scans.length - 1];
  const comparison =
    previous && latest
      ? compareScans(
          {
            decision: previous.decision,
            condition: previous.condition,
            risk: previous.risk,
            bodyArea: previous.body_area,
          },
          {
            decision: latest.decision,
            condition: latest.condition,
            risk: latest.risk,
            bodyArea: latest.body_area,
          }
        )
      : null;

  async function onAddProduct() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start.trim())) {
      Alert.alert("Product usage", "Add a start date as YYYY-MM-DD.");
      return;
    }
    await addProduct(record.id, trimmed, start.trim(), notes.trim());
    setName("");
    setStart("");
    setNotes("");
    await refresh();
  }

  function fillQuick(days: string) {
    const due = dueFromChoice(days);
    if (!due) return;
    setCustom(reminderParts(due).local);
    setPicked(days);
    setRemindError("");
  }

  async function onAddReminder() {
    const dueAt = futureIso(custom);
    if (!dueAt) {
      setRemindError("Choose a date and time in the future.");
      return;
    }
    await addReminder(record.id, dueAt);
    setCustom("");
    setPicked("");
    setRemindError("");
    await refresh();
  }

  async function onSaveReschedule() {
    if (!editing) return;
    const dueAt = futureIso(editValue);
    if (!dueAt) {
      setEditError("Choose a date and time in the future.");
      return;
    }
    await rescheduleReminder(editing.id, dueAt);
    setEditing(null);
    setEditError("");
    await refresh();
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Eyebrow>Skin progress comparison</Eyebrow>
        <Title>{previous ? "Previous and latest scan" : "First tracked scan"}</Title>
        {scans.map((scan, index) => (
          <View key={scan.id} style={styles.card}>
            <Text style={styles.kicker}>
              {scans.length === 1
                ? "Saved scan"
                : index === 0
                  ? "Previous scan"
                  : index === scans.length - 1
                    ? "Latest scan"
                    : `Scan ${index + 1}`}
            </Text>
            <Text style={styles.line}>{when(scan.created_at)}</Text>
            <Text style={styles.line}>Condition: {pretty(scan.condition)}</Text>
            <Text style={styles.line}>Predicted risk: {pretty(scan.risk)}</Text>
            {scan.body_area ? <Text style={styles.line}>Body area: {scan.body_area}</Text> : null}
            {!scan.image_uri ? <Fine>The saved photo for this scan is unavailable.</Fine> : null}
          </View>
        ))}
        {comparison ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Progress summary</Text>
            <Body>{comparison.summary}</Body>
            {comparison.notes.map((note) => (
              <Fine key={note}>{note}</Fine>
            ))}
          </View>
        ) : (
          <Fine>A comparison appears after a follow-up scan is saved to this session.</Fine>
        )}
        <View style={styles.card}>
          <Text style={styles.kicker}>Product used</Text>
          {products.length === 0 ? <Fine>No product recorded.</Fine> : null}
          {products.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.line}>
                {item.name} · {item.start_date}
                {item.notes ? ` · ${item.notes}` : ""}
              </Text>
              <GhostButton
                label="Remove"
                onPress={() => {
                  void removeProduct(item.id).then(refresh);
                }}
              />
            </View>
          ))}
          <TextInput value={name} onChangeText={setName} placeholder="Product name" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={start} onChangeText={setStart} placeholder="Start date YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Usage notes" placeholderTextColor={colors.muted} style={styles.input} />
          <GhostButton label="Add product" onPress={() => void onAddProduct()} />
        </View>
        <View style={styles.card}>
          <Text style={styles.kicker}>Reminders</Text>
          <Fine>A reminder is a personal prompt. It does not mean it is medically safe to wait.</Fine>
          {reminders.filter((item) => item.status === "scheduled").length === 0 ? (
            <Fine>No upcoming reminder.</Fine>
          ) : null}
          {reminders
            .filter((item) => item.status === "scheduled")
            .sort((a, b) => a.due_at.localeCompare(b.due_at))
            .map((item) => {
              const parts = reminderParts(item.due_at);
              const latestScan = scans[scans.length - 1];
              return (
                <View key={item.id} style={styles.remindCard}>
                  <Text style={styles.remindDate}>{parts.day}</Text>
                  <Text style={styles.remindTime}>{parts.time}</Text>
                  <Text style={styles.kicker}>Scheduled</Text>
                  {latestScan ? (
                    <Fine>
                      {pretty(latestScan.condition)} · {pretty(latestScan.risk)} risk
                    </Fine>
                  ) : null}
                  <View style={styles.remindActions}>
                    <PrimaryButton label="Done" onPress={() => void setReminderStatus(item.id, "completed").then(refresh)} />
                    <GhostButton
                      label="Reschedule"
                      onPress={() => {
                        setEditing(item);
                        setEditValue(parts.local);
                        setEditError("");
                      }}
                    />
                    <GhostButton label="Cancel reminder" onPress={() => void setReminderStatus(item.id, "cancelled").then(refresh)} />
                  </View>
                </View>
              );
            })}
          {reminders.some((item) => item.status !== "scheduled") ? (
            <Pressable onPress={() => setShowHistory((open) => !open)}>
              <Text style={styles.historyToggle}>
                {showHistory ? "Hide earlier reminders" : `Earlier reminders (${reminders.filter((item) => item.status !== "scheduled").length})`}
              </Text>
            </Pressable>
          ) : null}
          {showHistory
            ? reminders
                .filter((item) => item.status !== "scheduled")
                .map((item) => {
                  const parts = reminderParts(item.due_at);
                  return (
                    <Text key={item.id} style={styles.historyLine}>
                      {parts.day} · {parts.time} · {pretty(item.status)}
                    </Text>
                  );
                })
            : null}
          <Text style={styles.section}>Add a reminder</Text>
          <View style={styles.chips}>
            {[
              ["1", "Tomorrow"],
              ["3", "In 3 days"],
              ["7", "In 7 days"],
              ["14", "In 14 days"],
            ].map(([days, label]) => (
              <Pressable key={days} onPress={() => fillQuick(days)} style={[styles.quick, picked === days && styles.quickOn]}>
                <Text style={[styles.quickText, picked === days && styles.quickTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={custom}
            onChangeText={(value) => {
              setCustom(value);
              setPicked("");
            }}
            placeholder="2026-10-20 09:00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
          />
          {remindError ? <Text style={styles.error}>{remindError}</Text> : null}
          <PrimaryButton label="Save reminder" onPress={() => void onAddReminder()} />
        </View>
        <Modal visible={editing != null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheet}>
              <Text style={styles.section}>Reschedule</Text>
              <Fine>Currently scheduled</Fine>
              <Text style={styles.remindDate}>{reminderParts(editing?.due_at).day}</Text>
              <Text style={styles.remindTime}>{reminderParts(editing?.due_at).time}</Text>
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                placeholder="2026-10-20 09:00"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="none"
              />
              {editError ? <Text style={styles.error}>{editError}</Text> : null}
              <PrimaryButton label="Save changes" onPress={() => void onSaveReschedule()} />
              <GhostButton label="Back" onPress={() => setEditing(null)} />
            </View>
          </View>
        </Modal>
        <PrimaryButton
          label="Check skin again"
          onPress={() => {
            setFollowSessionId(record.id);
            router.push({ pathname: "/assess", params: { follow: "1" } });
          }}
        />
        <GhostButton
          label="Delete this tracking record"
          onPress={() => {
            Alert.alert("Delete tracking record", "This removes the saved scans, product notes, and reminders for this session.", [
              { text: "Keep", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  void deleteSession(record.id).then(() => router.replace("/progress"));
                },
              },
            ]);
          }}
        />
        <Fine>{PROGRESS_DISCLAIMER}</Fine>
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
    gap: 6,
  },
  kicker: { fontFamily: fonts.sansSemi, color: colors.sage, textTransform: "uppercase", letterSpacing: 0.6, fontSize: 12 },
  line: { fontFamily: fonts.sans, color: colors.ink, flex: 1 },
  row: { gap: 4 },
  block: { gap: 4 },
  actions: { gap: 6 },
  remindCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.tight,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 2,
  },
  remindDate: { fontFamily: fonts.serifSemi, fontSize: 22, color: colors.ink },
  remindTime: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
  remindActions: { gap: 8, marginTop: spacing.sm },
  historyToggle: { fontFamily: fonts.sansMed, color: colors.muted, marginTop: spacing.sm },
  historyLine: { fontFamily: fonts.sans, color: colors.ink, marginTop: 4 },
  section: { fontFamily: fonts.serifSemi, fontSize: 22, color: colors.ink, marginTop: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quick: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.paper2,
  },
  quickOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  quickText: { fontFamily: fonts.sansMed, color: colors.ink },
  quickTextOn: { color: colors.white },
  error: { fontFamily: fonts.sans, color: colors.high },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(26,36,33,0.45)" },
  sheet: {
    backgroundColor: colors.paper2,
    borderTopLeftRadius: radius.plate,
    borderTopRightRadius: radius.plate,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    fontFamily: fonts.sans,
    color: colors.ink,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
