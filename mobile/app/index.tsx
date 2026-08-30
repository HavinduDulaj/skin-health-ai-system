import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Card,
  Eyebrow,
  GhostButton,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { API_URL, APP_NAME, PROJECT_CODE } from "../lib/config";
import { colors, spacing } from "../lib/theme";

export default function HomeScreen() {
  const { health, apiOnline } = useApp();

  return (
    <Screen style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>{PROJECT_CODE} · skin health decision support</Eyebrow>
        <Title>Risk-level screening without a diagnosis.</Title>
        <Body>
          Photograph a lesion on your phone. {APP_NAME} identifies acne, burns, rash, or
          warts, grades Low, Medium, or High risk, and may abstain or reject a poor frame.
          Screening only — not a diagnosis.
        </Body>

        <View style={styles.actions}>
          <PrimaryButton
            label="Start a session"
            onPress={() => router.push("/enter")}
          />
          <GhostButton label="Research method" onPress={() => router.push("/method")} />
          <GhostButton label="Screening history" onPress={() => router.push("/history")} />
        </View>

        <View style={styles.trustRow}>
          <Text style={styles.trustItem}>Grad-CAM explanation</Text>
          <Text style={styles.trustItem}>SQLite on-device history</Text>
          <Text style={styles.trustItem}>JSON API exchange</Text>
        </View>

        <Card>
          <Text style={styles.cardTitle}>API status</Text>
          <Text style={styles.cardBody}>
            {apiOnline
              ? `${health?.version ?? "online"} · ${
                  health?.model_loaded ? `${health.model_kind} loaded` : "quality screening only"
                }`
              : `Python API offline at ${API_URL}. Run: python -m backend`}
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Tech stack</Text>
          <Text style={styles.cardBody}>
            Mobile: React Native + Expo + TypeScript{"\n"}
            Backend: Python REST API (FastAPI){"\n"}
            Ingredients: Node.js + Express + JSON{"\n"}
            AI/ML: TensorFlow, Keras, scikit-learn{"\n"}
            Storage: SQLite · Image processing: OpenCV
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: spacing.sm },
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  trustRow: { gap: spacing.xs },
  trustItem: { color: colors.sage2, fontSize: 14 },
  cardTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  cardBody: { color: colors.muted, lineHeight: 22 },
});
