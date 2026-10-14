import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import IngredientCard from "../components/IngredientCard";
import PrimaryButton from "../components/PrimaryButton";
import { useThemeContext } from "../../context/ThemeContext";
import { Member3ExitContext } from "../navigation/Member3ExitContext";
import { getRecommendation } from "../services/api";
import {
  RecommendationResult,
  RootStackParamList,
  UserProfile,
} from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Recommendation">;
type Lesion = UserProfile["lesion"];
type Severity = UserProfile["severity"];

const lesions: Lesion[] = ["Acne", "Burn", "Rash", "Wart"];
const severities: Severity[] = ["Low", "Medium", "High"];

function SegmentControl<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: T[];
  onSelect: (value: T) => void;
}) {
  const { palette } = useThemeContext();
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: palette.primary }]}>{label}</Text>
      <View style={styles.segmentGrid}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${option}`}
              key={option}
              onPress={() => onSelect(option)}
              style={[
                styles.segment,
                { backgroundColor: palette.subtleSurface, borderColor: palette.border },
                selected && { backgroundColor: palette.primary, borderColor: palette.primary },
              ]}
            >
              <Text style={[styles.segmentText, { color: selected ? palette.buttonText : palette.text }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepRail() {
  const { palette } = useThemeContext();
  return (
    <View style={styles.stepRail}>
      {["Profile", "Model", "Safety"].map((step, index) => (
        <View key={step} style={styles.stepItem}>
          <View style={[styles.stepCircle, { backgroundColor: palette.primary }]}>
            <Text style={[styles.stepNumber, { color: palette.buttonText }]}>{index + 1}</Text>
          </View>
          <Text style={[styles.stepLabel, { color: palette.secondaryText }]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = "blue",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber";
}) {
  const { palette } = useThemeContext();
  const color = tone === "green" ? "#12805C" : tone === "amber" ? "#E08A1E" : "#0F62D9";
  return (
    <View style={[styles.metricCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.metricLabel, { color: palette.secondaryText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function ProfileInfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { palette } = useThemeContext();
  return (
    <View style={styles.profileInfoRow}>
      <View style={[styles.profileInfoIcon, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name={icon} size={17} color={palette.primary} />
      </View>
      <View style={styles.profileInfoCopy}>
        <Text style={[styles.profileInfoLabel, { color: palette.secondaryText }]}>{label}</Text>
        <Text style={[styles.profileInfoValue, { color: palette.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function RecommendationScreen({ navigation, route }: Props) {
  const exitMember3 = useContext(Member3ExitContext);
  const { palette } = useThemeContext();
  const baseProfile = route.params.profile;
  const [lesion, setLesion] = useState<Lesion>(baseProfile.lesion);
  const [severity, setSeverity] = useState<Severity>(baseProfile.severity);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const profile: UserProfile = useMemo(
    () => ({
      ...baseProfile,
      lesion,
      severity,
    }),
    [baseProfile, lesion, severity]
  );

  async function runPrediction(nextProfile: UserProfile = profile) {
    const sequence = ++requestSequence.current;
    try {
      setLoading(true);
      setError("");
      setResult(null);
      const data = await getRecommendation(nextProfile);
      if (sequence === requestSequence.current) setResult(data);
    } catch (err) {
      if (sequence !== requestSequence.current) return;
      const message =
        err instanceof Error
          ? err.message
          : "Unable to generate recommendations. Please check the selected profile values.";
      setResult(null);
      setError(message);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  function updateLesion(value: Lesion) {
    const nextProfile = { ...profile, lesion: value };
    setLesion(value);
    runPrediction(nextProfile);
  }

  function updateSeverity(value: Severity) {
    const nextProfile = { ...profile, severity: value };
    setSeverity(value);
    runPrediction(nextProfile);
  }

  useEffect(() => {
    runPrediction(profile);
    // Run once when opened with the incoming scan/user profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topConfidence = result?.recommended[0]?.confidence ?? 0;
  const recommendationCount = result?.recommended.length ?? 0;

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    exitMember3?.();
  }

  return (
    <ScrollView style={[styles.page, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable
          style={[styles.iconButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back-outline" size={22} color={palette.text} />
        </Pressable>
        <Pressable
          style={[styles.iconButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          onPress={() => navigation.navigate("Chat", { profile })}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={palette.primary} />
        </Pressable>
      </View>

      <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
        <View style={[styles.heroIcon, { backgroundColor: palette.surface }]}>
          <Ionicons name="leaf-outline" size={26} color={palette.success} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.kicker, { color: palette.success }]}>Member 3 module</Text>
          <Text style={[styles.title, { color: palette.text }]}>Ingredient Recommendations</Text>
          <Text style={[styles.subtitle, { color: palette.secondaryText }]}>
            Model-ranked ingredient guidance with allergy and conflict safety checks.
          </Text>
        </View>
      </View>

      <StepRail />

      <View style={[styles.modelCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Trained ML Model</Text>
          <Text style={[styles.cardSubtitle, { color: palette.success }]}>
            {result?.modelInfo?.modelAvailable
              ? `${result.modelInfo.trainingRows?.toLocaleString() ?? "95,040"} pairwise training rows`
              : "Loading live model status"}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.statusBadgeText, { color: result?.modelInfo?.modelAvailable ? palette.success : palette.secondaryText }]}>
            {result?.modelInfo?.modelAvailable ? "Live" : "Checking"}
          </Text>
        </View>
      </View>

      <View style={[styles.inputCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <SegmentControl label="Detected Skin Lesion" value={lesion} options={lesions} onSelect={updateLesion} />
        <SegmentControl label="Severity Level" value={severity} options={severities} onSelect={updateSeverity} />
        <View style={[styles.profileGrid, { backgroundColor: palette.subtleSurface, borderColor: palette.border }]}>
          <ProfileInfoRow icon="water-outline" label="Skin Type" value={profile.skinType} />
          <ProfileInfoRow icon="partly-sunny-outline" label="Environment" value={profile.environment} />
          <ProfileInfoRow icon="sunny-outline" label="Sun Exposure" value={profile.sunExposure} />
          <ProfileInfoRow
            icon="alert-circle-outline"
            label="Allergies"
            value={profile.allergies.length ? profile.allergies.join(", ") : "None"}
          />
        </View>
        <PrimaryButton icon="sparkles-outline" title={loading ? 'Analyzing…' : 'Run Prediction'} disabled={loading} onPress={() => runPrediction()} />
      </View>

      <View style={styles.metricRow}>
        <MetricCard icon="medical-outline" label="Condition" value={lesion} />
        <MetricCard icon="flame-outline" label="Severity" value={severity} tone="amber" />
        <MetricCard icon="analytics-outline" label="Top model score" value={recommendationCount ? `${topConfidence}%` : "—"} tone="green" />
      </View>

      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ActivityIndicator color={palette.primary} />
          <Text style={[styles.loadingTitle, { color: palette.text }]}>Analyzing profile</Text>
          <Text style={[styles.loadingText, { color: palette.secondaryText }]}>Ranking ingredients and applying safety filters.</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorCard, { backgroundColor: palette.dangerSoft, borderColor: palette.danger }]}>
          <Ionicons name="alert-circle-outline" size={20} color={palette.danger} />
          <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <>
          <View style={styles.sectionHead}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Recommended</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.secondaryText }]}>{recommendationCount} ingredients met the recommendation criteria</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: palette.primarySoft }]}>
              <Text style={[styles.countBadgeText, { color: palette.primary }]}>{recommendationCount}</Text>
            </View>
          </View>

          {result.recommended.slice(0, 5).map((ingredient, index) => (
            <IngredientCard
              key={ingredient.name}
              ingredient={ingredient}
              rank={index + 1}
              onPress={() => navigation.navigate("IngredientDetail", { ingredient })}
            />
          ))}

          {result.recommended.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: palette.subtleSurface, borderColor: palette.warning }]}>
              <Text style={[styles.emptyTitle, { color: palette.warning }]}>No qualifying recommendations</Text>
              <Text style={[styles.emptyText, { color: palette.secondaryText }]}>
                No ingredients met the recommendation criteria after allergy exclusions. Keep your profile accurate and consult a qualified professional for guidance.
              </Text>
            </View>
          ) : null}

          <View style={styles.safetySummary}>
            <MetricCard icon="warning-outline" label="Avoid" value={`${result.avoid.length}`} tone="amber" />
            <MetricCard icon="git-compare-outline" label="Conflicts" value={`${result.conflicts.length}`} tone="green" />
            <MetricCard icon="shield-checkmark-outline" label="Safety" value="On" />
          </View>

          {result.profileWarnings.length > 0 ? (
            <View style={[styles.warningPanel, { backgroundColor: palette.subtleSurface, borderColor: palette.warning }]}>
              <Text style={[styles.warningTitle, { color: palette.warning }]}>Profile Safety Notes</Text>
              {result.profileWarnings.slice(0, 3).map((warning) => (
                <View key={warning} style={styles.warningRow}>
                  <Ionicons name="alert-circle-outline" size={16} color={palette.warning} />
                  <Text style={[styles.warningText, { color: palette.secondaryText }]}>{warning}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              title="View Full Report"
              icon="document-text-outline"
              onPress={() => navigation.navigate("Report", { result, profile })}
            />
            <View style={styles.secondaryGrid}>
              <View style={styles.gridButton}>
                <PrimaryButton
                  title="Avoid"
                  icon="warning-outline"
                  onPress={() => navigation.navigate("Avoid", { avoid: result.avoid })}
                  variant="secondary"
                />
              </View>
              <View style={styles.gridButton}>
                <PrimaryButton
                  title="Conflicts"
                  icon="git-compare-outline"
                  onPress={() => navigation.navigate("Conflict", { conflicts: result.conflicts })}
                  variant="secondary"
                />
              </View>
            </View>
            <View style={styles.secondaryGrid}>
              <View style={styles.gridButton}>
                <PrimaryButton
                  title="Ask Rebeka"
                  icon="chatbubbles-outline"
                  onPress={() => navigation.navigate("Chat", { profile })}
                  variant="secondary"
                />
              </View>
              <View style={styles.gridButton}>
                <PrimaryButton
                  title="Knowledge Base"
                  icon="library-outline"
                  onPress={() => navigation.navigate("IngredientKnowledgeBase")}
                  variant="secondary"
                />
              </View>
            </View>
          </View>

          <Text style={[styles.disclaimer, { color: palette.muted }]}>{result.disclaimer}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F6FAFC",
  },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 34,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
    shadowColor: "#0F62D9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#E8F7F0",
    borderRadius: 8,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  heroCopy: {
    flex: 1,
  },
  kicker: {
    color: "#12805C",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: "#102033",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 4,
  },
  subtitle: {
    color: "#526376",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  stepRail: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 14,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    alignItems: "center",
    backgroundColor: "#0F62D9",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  stepNumber: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  stepLabel: {
    color: "#526376",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  modelCard: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 14,
  },
  cardTitle: {
    color: "#14532D",
    fontSize: 15,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#12805C",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeLive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  statusBadgeText: {
    color: "#526376",
    fontSize: 11,
    fontWeight: "900",
  },
  statusBadgeTextLive: {
    color: "#12805C",
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginBottom: 12,
    padding: 14,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: "#0F62D9",
    fontSize: 12,
    fontWeight: "900",
  },
  segmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    alignItems: "center",
    backgroundColor: "#F8FBFF",
    borderColor: "#D5E1F5",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 74,
    paddingHorizontal: 12,
  },
  segmentSelected: {
    backgroundColor: "#0F62D9",
    borderColor: "#0F62D9",
  },
  segmentText: {
    color: "#102033",
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextSelected: {
    color: "#FFFFFF",
  },
  profileGrid: {
    backgroundColor: "#F8FBFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileInfoRow: {
    alignItems: "center",
    borderBottomColor: "#E7EEF9",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  profileInfoIcon: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  profileInfoCopy: {
    flex: 1,
  },
  profileInfoLabel: {
    color: "#526376",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  profileInfoValue: {
    color: "#102033",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 92,
    padding: 10,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    marginBottom: 7,
    width: 30,
  },
  metricLabel: {
    color: "#526376",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#102033",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#BFD5FF",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  loadingTitle: {
    color: "#102033",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  loadingText: {
    color: "#526376",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  errorCard: {
    alignItems: "center",
    backgroundColor: "#FFECEC",
    borderColor: "#FCA5A5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  errorText: {
    color: "#D64545",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#102033",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#526376",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  countBadgeText: {
    color: "#0F62D9",
    fontSize: 14,
    fontWeight: "900",
  },
  emptyState: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  emptyTitle: {
    color: "#9A3412",
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: {
    color: "#7C2D12",
    lineHeight: 20,
  },
  safetySummary: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  warningPanel: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 14,
  },
  warningTitle: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "900",
  },
  warningRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  warningText: {
    color: "#7C2D12",
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    gap: 4,
    marginTop: 2,
  },
  secondaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  gridButton: {
    flex: 1,
  },
  disclaimer: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: "center",
  },
});
