import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
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
import { getRecommendation } from "../services/api";
import { getUserProfile } from "../services/profileService";
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

interface SelectBoxProps<T extends string> {
  label: string;
  value: T;
  options: T[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}

function SelectBox<T extends string>({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
}: SelectBoxProps<T>) {
  return (
    <View style={styles.selectWrap}>
      <Text style={styles.selectLabel}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={onToggle}>
        <Text style={styles.selectValue}>{value}</Text>
        <Text style={styles.selectArrow}>{open ? "^" : "v"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.optionsPanel}>
          {options.map((option) => (
            <Pressable
              key={option}
              style={[
                styles.optionRow,
                option === value && styles.selectedOptionRow,
              ]}
              onPress={() => onSelect(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  option === value && styles.selectedOptionText,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function RecommendationScreen({ navigation }: Props) {
  const baseProfile = getUserProfile();
  const [lesion, setLesion] = useState<Lesion>(baseProfile.lesion);
  const [severity, setSeverity] = useState<Severity>(baseProfile.severity);
  const [openSelect, setOpenSelect] = useState<"lesion" | "severity" | null>(
    null
  );
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const profile: UserProfile = {
    ...baseProfile,
    lesion,
    severity,
  };

  async function runPrediction(nextProfile: UserProfile = profile) {
    try {
      setLoading(true);
      setError("");
      const data = await getRecommendation(nextProfile);
      setResult(data);
    } catch {
      setResult(null);
      setError("Unable to generate recommendations. Please check the selected profile values.");
    } finally {
      setLoading(false);
    }
  }

  function handleLesionSelect(value: Lesion) {
    const nextProfile = { ...profile, lesion: value };
    setLesion(value);
    setOpenSelect(null);
    runPrediction(nextProfile);
  }

  function handleSeveritySelect(value: Severity) {
    const nextProfile = { ...profile, severity: value };
    setSeverity(value);
    setOpenSelect(null);
    runPrediction(nextProfile);
  }

  useEffect(() => {
    runPrediction(profile);
    // Initial prediction only. Later predictions run when dropdown values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.phone}>
        <View style={styles.statusBar}>
          <Text style={styles.time}>9:41</Text>
          <Text style={styles.statusIcons}>LTE 100%</Text>
        </View>

        <View style={styles.topBar}>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.back}>{"<"}</Text>
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => navigation.navigate("Chat", { profile })}
          >
            <Text style={styles.bookmark}>AI</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Recommended{"\n"}Ingredients</Text>
        <Text style={styles.subtitle}>
          Select lesion and risk level to generate your recommendation.
        </Text>

        <View style={styles.selectorCard}>
          <SelectBox
            label="Skin Lesion"
            value={lesion}
            options={lesions}
            open={openSelect === "lesion"}
            onToggle={() =>
              setOpenSelect(openSelect === "lesion" ? null : "lesion")
            }
            onSelect={handleLesionSelect}
          />
          <SelectBox
            label="Risk Level"
            value={severity}
            options={severities}
            open={openSelect === "severity"}
            onToggle={() =>
              setOpenSelect(openSelect === "severity" ? null : "severity")
            }
            onSelect={handleSeveritySelect}
          />
          <PrimaryButton title="Run Prediction" onPress={() => runPrediction()} />
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Condition</Text>
            <Text style={styles.metricValue}>{lesion}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Severity</Text>
            <Text style={styles.metricValue}>{severity}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Confidence</Text>
            <Text style={styles.confidenceValue}>
              {result?.recommended[0]?.confidence ?? 0}%
            </Text>
          </View>
        </View>

        {loading && <ActivityIndicator color="#0057FF" style={styles.loader} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result?.recommended.slice(0, 5).map((ingredient, index) => (
          <IngredientCard
            key={ingredient.name}
            ingredient={ingredient}
            rank={index + 1}
            onPress={() => navigation.navigate("IngredientDetail", { ingredient })}
          />
        ))}

        {result && result.recommended.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No direct match found</Text>
            <Text style={styles.emptyText}>
              Try a lower risk level or ask Rebeka for supportive guidance. For high severity concerns, dermatologist advice is recommended.
            </Text>
          </View>
        ) : null}

        {result && result.profileWarnings.length > 0 ? (
          <View style={styles.warningPanel}>
            <Text style={styles.warningTitle}>Profile Safety Notes</Text>
            {result.profileWarnings.slice(0, 3).map((warning) => (
              <Text key={warning} style={styles.warningText}>
                ! {warning}
              </Text>
            ))}
          </View>
        ) : null}

        {result ? (
          <View style={styles.actions}>
            <PrimaryButton
              title="View Full Report"
              onPress={() =>
                navigation.navigate("Report", {
                  result,
                  profile,
                })
              }
            />
            <View style={styles.secondaryGrid}>
              <View style={styles.gridButton}>
                <PrimaryButton
                  title="Avoid"
                  onPress={() => navigation.navigate("Avoid", { avoid: result.avoid })}
                  variant="secondary"
                />
              </View>
              <View style={styles.gridButton}>
                <PrimaryButton
                  title="Conflicts"
                  onPress={() =>
                    navigation.navigate("Conflict", { conflicts: result.conflicts })
                  }
                  variant="secondary"
                />
              </View>
            </View>
            <PrimaryButton
              title="Ask Rebeka"
              onPress={() => navigation.navigate("Chat", { profile })}
              variant="secondary"
            />
          </View>
        ) : null}

        <Text style={styles.disclaimer}>{result?.disclaimer}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  phone: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderColor: "#CED6E4",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    paddingTop: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  time: {
    color: "#030720",
    fontWeight: "800",
  },
  statusIcons: {
    color: "#030720",
    fontSize: 11,
    fontWeight: "700",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8FF",
  },
  back: {
    color: "#071033",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
  },
  bookmark: {
    color: "#0057FF",
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: "#070B25",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 25,
    marginTop: 6,
  },
  subtitle: {
    color: "#263457",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  selectorCard: {
    backgroundColor: "#F8FBFF",
    borderColor: "#BFD5FF",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  selectWrap: {
    position: "relative",
    zIndex: 10,
  },
  selectLabel: {
    color: "#0057FF",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
  },
  selectButton: {
    minHeight: 44,
    borderColor: "#D5E1F5",
    borderWidth: 1,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: {
    color: "#070B25",
    fontSize: 15,
    fontWeight: "800",
  },
  selectArrow: {
    color: "#0057FF",
    fontSize: 16,
    fontWeight: "900",
  },
  optionsPanel: {
    borderColor: "#D5E1F5",
    borderWidth: 1,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    marginTop: 6,
    overflow: "hidden",
  },
  optionRow: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomColor: "#EEF2F7",
    borderBottomWidth: 1,
  },
  selectedOptionRow: {
    backgroundColor: "#EAF2FF",
  },
  optionText: {
    color: "#263457",
    fontSize: 14,
    fontWeight: "700",
  },
  selectedOptionText: {
    color: "#0057FF",
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    backgroundColor: "#F8FBFF",
    borderColor: "#BFD5FF",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    backgroundColor: "#D5E1F5",
  },
  metricLabel: {
    color: "#0057FF",
    fontSize: 10,
    fontWeight: "800",
  },
  metricValue: {
    color: "#070B25",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },
  confidenceValue: {
    color: "#06A43D",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },
  loader: {
    marginVertical: 24,
  },
  error: {
    color: "#DC2626",
    marginBottom: 14,
  },
  emptyState: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
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
  warningPanel: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  warningTitle: {
    color: "#9A3412",
    fontWeight: "900",
    marginBottom: 6,
  },
  warningText: {
    color: "#7C2D12",
    lineHeight: 20,
    marginTop: 2,
  },
  actions: {
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
  },
});
