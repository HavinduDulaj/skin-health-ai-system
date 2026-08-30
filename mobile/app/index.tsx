import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Body,
  GhostButton,
  Mark,
  PrimaryButton,
  Screen,
  StatusLamp,
  Title,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { API_URL } from "../lib/config";
import { colors, fonts, spacing } from "../lib/theme";

export default function HomeScreen() {
  const { health, apiOnline } = useApp();

  const lamp = apiOnline
    ? health?.model_loaded
      ? "Ready to screen"
      : "Connected · quality check only"
    : `Offline · start API at ${API_URL}`;

  return (
    <Screen style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Mark size={22} />
          <Text style={styles.brandName}>Derma-Safe</Text>
        </View>

        <Title>Check a skin concern in a few steps.</Title>
        <Body>
          Take a clear photo. We estimate Low, Medium, or High risk for acne,
          burns, rash, or warts — and may ask you to retake a blurry shot.
        </Body>

        <View style={styles.actions}>
          <PrimaryButton label="Start screening" onPress={() => router.push("/enter")} />
          <GhostButton label="Past results" onPress={() => router.push("/history")} />
        </View>

        <StatusLamp on={apiOnline} label={lamp} />

        <Text style={styles.note}>
          Screening only — not a medical diagnosis.{" "}
          <Text style={styles.link} onPress={() => router.push("/method")}>
            How it works
          </Text>
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: spacing.lg },
  scroll: { gap: spacing.md, paddingBottom: 48 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  brandName: {
    fontFamily: fonts.serifSemi,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  actions: { gap: spacing.sm, marginTop: 8 },
  note: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  link: { color: colors.sage, fontFamily: fonts.sansSemi },
});
