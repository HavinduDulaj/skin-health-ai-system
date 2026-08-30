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
import { Body, Eyebrow, Fine, PrimaryButton, Rule, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { colors, fonts, radius, spacing } from "../lib/theme";

export default function EnterScreen() {
  const { startSession } = useApp();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    if (!accepted) {
      Alert.alert(
        "Disclaimer required",
        "Accept the non-diagnostic disclaimer to continue."
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Session · on this device</Eyebrow>
        <Title>Before a photograph is taken.</Title>
        <Body>
          Your display name and screening log stay in SQLite on this phone. The
          server does not keep a record. This is risk awareness — not a diagnosis.
        </Body>

        <Rule />

        <View style={styles.field}>
          <Text style={styles.label}>Display name</Text>
          <Text style={styles.hint}>Optional. Printed on the local report only.</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Avishka"
            placeholderTextColor={colors.muted}
            maxLength={40}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.checkRow}>
          <Switch
            value={accepted}
            onValueChange={setAccepted}
            trackColor={{ true: colors.sage, false: colors.wash }}
            thumbColor={colors.paper2}
          />
          <Text style={styles.checkText}>
            I understand this tool provides risk-awareness guidance only and does
            not diagnose, treat, or replace a dermatologist.
          </Text>
        </View>

        <PrimaryButton
          label={busy ? "Saving…" : "Continue to capture"}
          onPress={onContinue}
          disabled={busy}
        />
        <Fine>R26-IT-058 · screening aid · photographs are not stored as a medical record.</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 40 },
  field: { gap: 6 },
  label: {
    color: colors.sage,
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  hint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.paper2,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
  checkRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  checkText: { flex: 1, color: colors.muted, lineHeight: 22, fontFamily: fonts.sans, fontSize: 14 },
});
