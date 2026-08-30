import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Body,
  Card,
  Fine,
  GhostButton,
  GradeTriad,
  PrimaryButton,
  Screen,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { fetchIngredientRecommendations, pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import type { IngredientRecommendation } from "../lib/types";
import { colors, fonts, gradeColor, radius, spacing } from "../lib/theme";

function titleFor(decision: string, risk?: string): string {
  if (decision === "quality_reject") return "Photo needs a retake";
  if (decision === "abstain") return "Unclear — no single grade";
  if (decision === "unavailable") return "Screening unavailable";
  return risk ? `${risk} risk` : "Unavailable";
}

export default function ResultScreen() {
  const { lastResult, lastPhotoUri } = useApp();
  const [showCam, setShowCam] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientRecommendation | null>(null);

  useEffect(() => {
    if (!lastResult) router.replace("/assess");
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
  const issued = data.decision === "grade" ? data.risk : null;
  const cond = data.condition?.used || data.lesion;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{DECISION_LABEL[data.decision] || data.decision}</Text>
        <Text style={[styles.headline, { color: gradeColor(issued) }]}>
          {titleFor(data.decision, data.risk)}
        </Text>
        <Body>{data.guidance?.summary || data.disclaimer}</Body>

        {cond ? (
          <Text style={styles.condition}>
            Looks like {cond}
            {data.condition?.source === "model" ? "" : " (you selected)"}.
          </Text>
        ) : null}

        {data.guidance?.alert ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{data.guidance.alert}</Text>
          </View>
        ) : null}

        {lastPhotoUri ? (
          <View style={styles.plate}>
            <Image source={{ uri: lastPhotoUri }} style={styles.photo} />
            {overlay && data.explainability?.available && showCam ? (
              <Image source={{ uri: overlay }} style={styles.overlay} />
            ) : null}
          </View>
        ) : null}

        {overlay && data.explainability?.available ? (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show focus map</Text>
            <Switch
              value={showCam}
              onValueChange={setShowCam}
              trackColor={{ true: colors.sage, false: colors.wash }}
              thumbColor={colors.white}
            />
          </View>
        ) : null}

        {data.model.loaded && data.decision !== "quality_reject" && data.decision !== "unavailable" ? (
          <GradeTriad probabilities={data.probabilities} leading={issued} />
        ) : data.decision === "quality_reject" ? (
          <Card>
            <Text style={styles.cardTitle}>Try another photo</Text>
            <Text style={styles.cardBody}>
              The image was too blurry, dark, or small. Retake in better light.
            </Text>
          </Card>
        ) : null}

        {data.decision === "grade" || data.decision === "abstain" ? (
          <Fine>Confidence {pct(data.confidence)}</Fine>
        ) : null}

        {data.guidance?.steps?.length ? (
          <Card>
            <Text style={styles.cardTitle}>What you can do</Text>
            {data.guidance.steps.map((step, i) => (
              <Text key={step} style={styles.step}>
                {i + 1}. {step}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Photo quality</Text>
          <Text style={styles.cardBody}>
            Score {data.quality.score.toFixed(2)}
            {(data.quality.flags || []).length
              ? ` · ${(data.quality.flags || []).join(", ").replaceAll("_", " ")}`
              : " · looks fine"}
          </Text>
        </Card>

        {ingredients ? (
          <Card>
            <Text style={styles.cardTitle}>Ingredient ideas</Text>
            <Text style={styles.cardBody}>{ingredients.note}</Text>
            {ingredients.ingredients.map((item) => (
              <View key={item.name} style={styles.ingredient}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.cardBody}>{item.benefit}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Fine>{data.disclaimer}</Fine>

        <PrimaryButton label="Read guidance" onPress={() => router.push("/guidance")} />
        <GhostButton label="Full report" onPress={() => router.push("/report")} />
        <GhostButton label="New photo" onPress={() => router.replace("/assess")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  kicker: {
    color: colors.sage,
    fontFamily: fonts.sansSemi,
    fontSize: 13,
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  condition: {
    fontFamily: fonts.sansMed,
    color: colors.muted,
    fontSize: 15,
    textTransform: "capitalize",
  },
  alert: {
    borderRadius: radius.tight,
    borderWidth: 1,
    borderColor: "rgba(196, 92, 74, 0.28)",
    backgroundColor: "rgba(196, 92, 74, 0.08)",
    padding: 14,
  },
  alertText: { color: colors.high, fontFamily: fonts.sansMed, lineHeight: 21 },
  plate: {
    height: 280,
    overflow: "hidden",
    borderRadius: radius.plate,
    backgroundColor: colors.wash,
  },
  photo: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFill, opacity: 0.7 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 14 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 21, fontSize: 14 },
  step: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
  ingredient: { gap: 2, marginTop: 4 },
  ingredientName: { color: colors.sage, fontFamily: fonts.sansSemi },
});
