import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  Body,
  Card,
  GhostButton,
  PrimaryButton,
  RiskMeter,
  Screen,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { fetchIngredientRecommendations, pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import type { IngredientRecommendation } from "../lib/types";
import { colors, spacing } from "../lib/theme";

function titleFor(decision: string, risk?: string): string {
  if (decision === "quality_reject") return "Photograph not suitable";
  if (decision === "abstain") return "No single grade";
  if (decision === "unavailable") return "Model not loaded";
  return risk ? `${risk} risk` : "Unavailable";
}

export default function ResultScreen() {
  const { lastResult, lastPhotoUri } = useApp();
  const [showCam, setShowCam] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientRecommendation | null>(null);

  useEffect(() => {
    if (!lastResult) {
      router.replace("/assess");
    }
  }, [lastResult]);

  useEffect(() => {
    if (!lastResult || lastResult.decision !== "grade" || !lastResult.risk) return;
    const condition = lastResult.condition?.used || lastResult.lesion || "rash";
    fetchIngredientRecommendations(condition, lastResult.risk)
      .then(setIngredients)
      .catch(() => setIngredients(null));
  }, [lastResult]);

  if (!lastResult) return null;

  const data = lastResult;
  const overlay = data.explainability?.overlay_jpeg;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.pill, pillStyle(data.decision)]}>
          <Text style={styles.pillText}>
            {DECISION_LABEL[data.decision] || data.decision}
          </Text>
        </View>

        <Text style={styles.kicker}>
          {data.model.loaded ? "Screening result" : "Quality check only"}
        </Text>
        <Text style={styles.headline}>{titleFor(data.decision, data.risk)}</Text>
        <Body>{data.guidance?.summary || data.disclaimer}</Body>

        {data.guidance?.alert ? (
          <Card>
            <Text style={styles.alert}>{data.guidance.alert}</Text>
          </Card>
        ) : null}

        {lastPhotoUri ? (
          <View style={styles.photoStack}>
            <Image source={{ uri: lastPhotoUri }} style={styles.photo} />
            {overlay && data.explainability?.available && showCam ? (
              <Image source={{ uri: overlay }} style={styles.overlay} />
            ) : null}
          </View>
        ) : null}

        {overlay && data.explainability?.available ? (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show Grad-CAM overlay</Text>
            <Switch value={showCam} onValueChange={setShowCam} trackColor={{ true: colors.sage }} />
          </View>
        ) : null}

        {data.model.loaded && data.decision !== "quality_reject" ? (
          <View style={styles.meters}>
            <RiskMeter label="Low" value={data.probabilities.Low} tone="low" />
            <RiskMeter label="Medium" value={data.probabilities.Medium} tone="mid" />
            <RiskMeter label="High" value={data.probabilities.High} tone="high" />
          </View>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Quality</Text>
          <Text style={styles.cardBody}>
            Score {data.quality.score.toFixed(2)} · {data.quality.width}×{data.quality.height}
          </Text>
          <Text style={styles.cardBody}>
            {(data.quality.flags || []).join(", ") || "No quality flags"}
          </Text>
        </Card>

        {data.guidance?.steps?.length ? (
          <Card>
            <Text style={styles.cardTitle}>Next steps</Text>
            {data.guidance.steps.map((step: string) => (
              <Text key={step} style={styles.step}>
                • {step}
              </Text>
            ))}
          </Card>
        ) : null}

        {ingredients ? (
          <Card>
            <Text style={styles.cardTitle}>Ingredient suggestions (JSON knowledge-base)</Text>
            <Text style={styles.cardBody}>{ingredients.note}</Text>
            {ingredients.ingredients.map((item) => (
              <View key={item.name} style={styles.ingredient}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.cardBody}>{item.benefit}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Text style={styles.fine}>
          Confidence {pct(data.confidence)} · margin {pct(data.margin)}
        </Text>
        <Text style={styles.fine}>{data.disclaimer}</Text>

        <PrimaryButton label="View guidance" onPress={() => router.push("/guidance")} />
        <GhostButton label="Structured report" onPress={() => router.push("/report")} />
        <GhostButton label="New screening" onPress={() => router.replace("/assess")} />
      </ScrollView>
    </Screen>
  );
}

function pillStyle(decision: string) {
  if (decision === "grade") return styles.pill_grade;
  if (decision === "abstain") return styles.pill_abstain;
  if (decision === "quality_reject") return styles.pill_quality_reject;
  return styles.pill_unavailable;
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pill_grade: { backgroundColor: "rgba(47,74,62,0.15)" },
  pill_abstain: { backgroundColor: "rgba(176,122,43,0.15)" },
  pill_quality_reject: { backgroundColor: "rgba(155,64,48,0.15)" },
  pill_unavailable: { backgroundColor: "rgba(94,86,77,0.15)" },
  pillText: { color: colors.ink, fontWeight: "700", fontSize: 12 },
  kicker: { color: colors.sage, fontWeight: "600" },
  headline: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  alert: { color: colors.high, fontWeight: "600" },
  photoStack: { position: "relative", borderRadius: 18, overflow: "hidden" },
  photo: { width: "100%", height: 280 },
  overlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.72,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: { color: colors.ink, fontWeight: "600" },
  meters: { gap: spacing.sm },
  cardTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  cardBody: { color: colors.muted, lineHeight: 22 },
  step: { color: colors.muted, lineHeight: 22 },
  ingredient: { gap: 2, marginTop: spacing.xs },
  ingredientName: { color: colors.sage, fontWeight: "700" },
  fine: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
