import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Body, Eyebrow, PrimaryButton, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { colors, spacing } from "../lib/theme";

export default function EnterScreen() {
  const { startSession } = useApp();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    if (!accepted) {
      Alert.alert(
        "Disclaimer required",
        "Please accept the non-diagnostic disclaimer to continue."
      );
      return;
    }
    setBusy(true);
    try {
      await startSession(name.trim());
      router.replace("/assess");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Eyebrow>Session</Eyebrow>
        <Title>Start a screening session.</Title>
        <Body>
          Your display name and history stay on this device in SQLite. Nothing is stored on
          the server. This tool provides risk awareness only — not a medical diagnosis.
        </Body>

        <View style={styles.field}>
          <Text style={styles.label}>Display name (optional)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Avishka"
            maxLength={40}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.checkRow}>
          <Switch value={accepted} onValueChange={setAccepted} trackColor={{ true: colors.sage }} />
          <Text style={styles.checkText}>
            I understand this tool provides risk-awareness guidance only and does not
            diagnose, treat, or replace a dermatologist.
          </Text>
        </View>

        <PrimaryButton
          label={busy ? "Saving…" : "Continue to screening"}
          onPress={onContinue}
          disabled={busy}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { color: colors.ink, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.paper2,
    color: colors.ink,
  },
  checkRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  checkText: { flex: 1, color: colors.muted, lineHeight: 22 },
});
