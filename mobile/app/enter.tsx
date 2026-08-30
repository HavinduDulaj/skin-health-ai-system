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
import { Body, Eyebrow, Fine, PrimaryButton, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { colors, fonts, radius, spacing } from "../lib/theme";

export default function EnterScreen() {
  const { startSession } = useApp();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    if (!accepted) {
      Alert.alert("Almost there", "Please confirm you understand this is not a diagnosis.");
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
        <Eyebrow>Get started</Eyebrow>
        <Title>Before we begin</Title>
        <Body>
          Your name stays on this phone for the session. Please confirm this is
          risk guidance only — not a medical diagnosis.
        </Body>

        <View style={styles.field}>
          <Text style={styles.label}>
            Display name <Text style={styles.optional}>(optional)</Text>
          </Text>
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
            thumbColor={colors.white}
          />
          <Text style={styles.checkText}>
            I understand this tool provides risk-awareness guidance only and does
            not diagnose, treat, or replace a dermatologist.
          </Text>
        </View>

        <PrimaryButton
          label={busy ? "Saving…" : "Continue"}
          onPress={onContinue}
          disabled={busy}
        />
        <Fine>If something looks serious or is getting worse, see a clinician.</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 40 },
  field: { gap: 8 },
  label: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  optional: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.paper2,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
  checkRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  checkText: {
    flex: 1,
    color: colors.muted,
    lineHeight: 22,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
});
