import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Body,
  Card,
  DecisionPill,
  Eyebrow,
  Fine,
  Flag,
  GhostButton,
  GradeTriad,
  MeterBar,
  PrimaryButton,
  Screen,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import type { AnalyzeResponse } from "../lib/types";
import { colors, fonts, gradeColor, radius, spacing } from "../lib/theme";

function pretty(name?: string | null): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function conditionView(data: AnalyzeResponse): { title: string; detail: string } {
  const cond = data.condition;
  const used = cond?.used || data.lesion;
  if (!used) return { title: "Condition was not identified.", detail: "" };

  const title = `Detected condition: ${pretty(used)}`;
  const detected = cond?.detected;
  const scoreFor = (name?: string) => {
    if (!name || !cond?.probabilities) return null;
    const value = cond.probabilities[name];
    return value == null ? null : Math.round(value * 100);
  };

  if (cond?.overridden && detected && detected !== used) {
    const score = scoreFor(detected);
    return {
      title,
      detail: `You selected this type. The model estimate was ${pretty(detected)}${
        score == null ? "" : ` (${score}%)`
      }.`,
    };
  }

  if (cond?.source === "model") {
    const score = scoreFor(used);
    const confidence =
      score == null ? "" : `${score}% among acne, burns, rash, and warts.`;
    const close = cond.uncertain
      ? " The four conditions are close — confirm the type if you know it."
      : "";
    return {
      title,
      detail: confidence
        ? `Identified by the model. ${confidence}${close}`
        : cond.note || "Identified by the model.",
    };
  }

  if (cond?.source === "user") {
    return { title, detail: "This matches the type you selected." };
  }

  return {
    title,
    detail: cond?.note || (data.lesion ? `Lesion context: ${pretty(data.lesion)}` : ""),
  };
}

function titleFor(decision: string, risk?: string): string {
  if (decision === "quality_reject") return "Photograph not suitable";
  if (decision === "abstain") return "No single grade";
  if (decision === "unavailable") return "Model not loaded";
  return risk ? `${risk} risk` : "Unavailable";
}

export default function ResultScreen() {
  const { lastResult, lastPhotoUri, followSessionId } = useApp();
  const [showCam, setShowCam] = useState(true);

  useEffect(() => {
    if (!lastResult) router.replace("/assess");
  }, [lastResult]);

  if (!lastResult) return null;

  const data = lastResult;
  const overlay = data.explainability?.overlay_jpeg;
  const issued = data.decision === "grade" ? data.risk : null;
  const kicker = data.model.loaded ? "Results" : "Quality check only";

  const condition = conditionView(data);

  const uncertain =
    data.decision === "abstain"
      ? "The top two grades are close, so no single risk level is shown."
      : data.uncertain && data.risk
        ? "The two leading grades are close."
        : data.confidence != null && data.decision === "grade"
          ? `Confidence ${pct(data.confidence)}.`
          : "";

  const ind = data.indicators;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>{kicker}</Eyebrow>
        {data.decision !== "grade" ? (
          <DecisionPill
            label={DECISION_LABEL[data.decision] || data.decision}
            kind={data.decision}
          />
        ) : null}
        <Text style={[styles.headline, { color: gradeColor(issued) }]}>
          {titleFor(data.decision, data.risk)}
        </Text>
        <Body>
          {data.guidance?.summary ||
            "A screening head is not on disk yet. Quality still ran."}
        </Body>

        {data.caution && data.guidance?.alert ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{data.guidance.alert}</Text>
          </View>
        ) : null}

        <Text style={styles.condition}>{condition.title}</Text>
        {condition.detail ? <Text style={styles.conditionDetail}>{condition.detail}</Text> : null}

        {data.model.loaded && data.decision !== "quality_reject" && data.decision !== "unavailable" ? (
          <Card>
            <Text style={styles.cardTitle}>Risk level</Text>
            <GradeTriad probabilities={data.probabilities} leading={issued} />
            {uncertain ? <Fine>{uncertain}</Fine> : null}
          </Card>
        ) : (
          <Card>
            <Text style={styles.cardTitle}>Risk level</Text>
            <Fine>
              {data.decision === "quality_reject"
                ? "Risk inference was not run. The quality gate rejected this frame first."
                : "No screening head on disk yet. Quality still ran."}
            </Fine>
          </Card>
        )}

        {data.guidance?.steps?.length ? (
          <Card>
            <Text style={styles.cardTitle}>Skin health advisory</Text>
            {data.guidance.headline ? <Fine>{data.guidance.headline}</Fine> : null}
            {data.guidance.steps.map((step, i) => (
              <Text key={step} style={styles.step}>
                {i + 1}. {step}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Severity indicators</Text>
          {ind ? (
            <>
              {ind.notes?.length ? <Fine>{ind.notes.join(" ")}</Fine> : null}
              <Fine>
                Texture {ind.texture_energy} · colour variation {ind.color_variation} ·
                irregularity {ind.structural_irregularity} · extent {ind.estimated_extent}
              </Fine>
            </>
          ) : (
            <Fine>No severity indicators on this run.</Fine>
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Photograph quality</Text>
          <MeterBar
            label="Quality score"
            value={data.quality.score}
            maxLabel={data.quality.score.toFixed(2)}
          />
          <Fine>
            {data.quality.width || "?"}×{data.quality.height || "?"} · brightness{" "}
            {Math.round(data.quality.brightness || 0)}
          </Fine>
          <View style={styles.flags}>
            {(data.quality.flags || []).length ? (
              data.quality.flags.map((flag) => (
                <Flag key={flag}>{flag.replaceAll("_", " ")}</Flag>
              ))
            ) : (
              <Flag>no quality flags</Flag>
            )}
          </View>
        </Card>

        {lastPhotoUri ? (
          <Card>
            <Text style={styles.cardTitle}>Your frame</Text>
            <View style={styles.plate}>
              <Image source={{ uri: lastPhotoUri }} style={styles.photo} />
              {overlay && data.explainability?.available && showCam ? (
                <Image source={{ uri: overlay }} style={styles.overlay} />
              ) : null}
            </View>
            {overlay && data.explainability?.available ? (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Show Grad-CAM overlay</Text>
                <Switch
                  value={showCam}
                  onValueChange={setShowCam}
                  trackColor={{ true: colors.sage, false: colors.wash }}
                  thumbColor={colors.white}
                />
              </View>
            ) : null}
            {data.explainability?.note ? <Fine>{data.explainability.note}</Fine> : null}
          </Card>
        ) : null}

        <View style={styles.actions}>
          {data.decision === "grade" || data.decision === "abstain" ? (
            <PrimaryButton
              label={followSessionId ? "Save follow-up scan" : "Track skin progress"}
              onPress={() => router.push("/track")}
            />
          ) : null}
          <GhostButton label="Risk guidance dashboard" onPress={() => router.push("/guidance")} />
          <GhostButton label="Advisory report" onPress={() => router.push("/report")} />
          <GhostButton label="New photo" onPress={() => router.replace("/assess")} />
        </View>
        <Fine>{data.disclaimer}</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  headline: {
    fontFamily: fonts.serifSemi,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    textTransform: "capitalize",
  },
  condition: {
    fontFamily: fonts.sansSemi,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  conditionDetail: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -8,
  },
  alert: {
    borderRadius: radius.tight,
    borderWidth: 1,
    borderColor: "rgba(196, 92, 74, 0.35)",
    backgroundColor: "rgba(196, 92, 74, 0.08)",
    padding: 14,
  },
  alertText: { color: colors.high, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  step: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  plate: {
    height: 260,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.wash,
  },
  photo: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFill, opacity: 0.7 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 14 },
  actions: { gap: spacing.sm, marginTop: 4 },
});
