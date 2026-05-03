import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PrimaryButton from "../components/PrimaryButton";
import {
  AvoidItem,
  IngredientRecommendation,
  RootStackParamList,
} from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Report">;

const reportId = "DS2026-05-02-001";

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseConflict(message: string) {
  const [firstPart] = message.split(" because ");
  const pair = firstPart
    .replace(" should not be combined with ", " x ")
    .replace(" with ", " x ");

  return {
    pair: pair.length > 45 ? pair.slice(0, 45) : pair,
    reason: message.includes("because")
      ? message.split(" because ")[1]
      : "May increase irritation if used together.",
  };
}

function InfoRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, accent ? { backgroundColor: accent } : null]}>
        <Text style={styles.infoIconText}>{label.slice(0, 1)}</Text>
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "None"}</Text>
      </View>
    </View>
  );
}

function SectionTitle({
  title,
  tone = "blue",
}: {
  title: string;
  tone?: "blue" | "green" | "red" | "orange" | "purple";
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, styles[`${tone}Icon`]]}>
        <Text style={styles.sectionIconText}>{title.slice(0, 1)}</Text>
      </View>
      <Text style={[styles.sectionTitle, styles[`${tone}Title`]]}>{title}</Text>
    </View>
  );
}

function Gauge({ severity }: { severity: string }) {
  const severityIndex = severity === "High" ? 2 : severity === "Medium" ? 1 : 0;

  return (
    <View style={styles.gauge}>
      <View
        style={[
          styles.gaugeNeedle,
          severityIndex === 0 && styles.gaugeLow,
          severityIndex === 1 && styles.gaugeMedium,
          severityIndex === 2 && styles.gaugeHigh,
        ]}
      />
      <View style={styles.gaugeBase} />
    </View>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  return (
    <View style={styles.ringOuter}>
      <View style={styles.ringInner}>
        <Text style={styles.ringText}>{value}%</Text>
      </View>
    </View>
  );
}

function IngredientReportCard({
  item,
  index,
}: {
  item: IngredientRecommendation;
  index: number;
}) {
  const colors = ["#DCFCE7", "#DBEAFE", "#FEF3C7", "#EDE9FE", "#E0F2FE"];

  return (
    <View style={styles.ingredientCard}>
      <View style={[styles.moleculeCircle, { backgroundColor: colors[index % colors.length] }]}>
        <Text style={styles.moleculeText}>{item.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.ingredientText}>
        <Text style={styles.ingredientName}>{item.name}</Text>
        <Text style={styles.smallLine}>Product Type: {item.productType}</Text>
        <Text style={styles.greenLine}>Recommended Usage: {item.percentage}</Text>
        {item.benefits.slice(0, 3).map((benefit) => (
          <Text key={benefit} style={styles.bullet}>
            - {benefit}
          </Text>
        ))}
      </View>
      <View style={styles.confidenceBadge}>
        <Text style={styles.confidenceNumber}>{item.confidence}%</Text>
        <Text style={styles.confidenceLabel}>Confidence</Text>
      </View>
    </View>
  );
}

function AvoidReportCard({ item }: { item: AvoidItem }) {
  return (
    <View style={styles.avoidCard}>
      <View style={styles.avoidCircle}>
        <Text style={styles.avoidInitial}>{item.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.avoidText}>
        <Text style={styles.avoidName}>{item.name}</Text>
        <Text style={styles.smallLine}>Reason:</Text>
        <Text style={styles.redLine}>{item.reason}</Text>
      </View>
      <View style={styles.xCircle}>
        <Text style={styles.xText}>x</Text>
      </View>
    </View>
  );
}

export default function ReportScreen({ route, navigation }: Props) {
  const { profile, result } = route.params;
  const topConfidence = result.recommended[0]?.confidence ?? 0;
  const topRecommended = result.recommended.slice(0, 3);
  const avoidItems = result.avoid.slice(0, 2);
  const conflicts = result.conflicts.slice(0, 3);

  function handleSave() {
    Alert.alert("Report saved", "Your report is ready in this session.");
  }

  function handleShare() {
    const recommended = result.recommended
      .slice(0, 5)
      .map((item) => `${item.name} (${item.percentage})`)
      .join(", ");

    Share.share({
      message: `DermaSafe AI Skin Analysis Report\nReport ID: ${reportId}\nLesion: ${profile.lesion}\nSeverity: ${profile.severity}\nRecommended: ${recommended}\n${result.disclaimer}`,
    });
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.report}>
        <View style={styles.topControls}>
          <Pressable style={styles.navButton} onPress={() => navigation.goBack()}>
            <Text style={styles.navButtonText}>{"<"}</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={handleShare}>
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>DS</Text>
            </View>
            <Text style={styles.brandName}>DermaSafe AI</Text>
            <Text style={styles.brandTag}>AI-Powered Skin Health Assistant</Text>
          </View>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.mainTitle}>SKIN ANALYSIS REPORT</Text>
            <Text style={styles.mainSubtitle}>
              Your Personalized Skin Health & Ingredient Recommendation
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaText}>Report ID: {reportId}</Text>
            <Text style={styles.metaText}>Date: {todayLabel()}</Text>
            <Text style={styles.metaText}>Time: 10:30 AM</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.panel, styles.halfPanel]}>
            <SectionTitle title="USER INFORMATION" />
            <View style={styles.infoGrid}>
              <InfoRow label="Age" value={`${profile.age}`} />
              <InfoRow label="Sun Exposure" value={profile.sunExposure} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow
                label="Uses Skincare Products"
                value={profile.usesSkincareProducts ? "Yes" : "No"}
              />
              <InfoRow label="Skin Type" value={profile.skinType} />
              <InfoRow
                label="Allergies"
                value={profile.allergies.length ? profile.allergies.join(", ") : "None"}
              />
              <InfoRow label="Environment" value={profile.environment} />
              <InfoRow
                label="Previous Issues"
                value={
                  profile.previousSkinIssues.length
                    ? profile.previousSkinIssues.join(", ")
                    : "None"
                }
              />
              <InfoRow
                label="Genetic / Family Issues"
                value={profile.geneticIssues.length ? profile.geneticIssues.join(", ") : "None"}
              />
            </View>
          </View>

          <View style={[styles.panel, styles.halfPanel]}>
            <SectionTitle title="ANALYSIS SUMMARY" />
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Detected Condition</Text>
                <View style={styles.conditionCircle}>
                  <Text style={styles.conditionIcon}>SK</Text>
                </View>
                <Text style={styles.summaryValue}>{profile.lesion}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Severity Level</Text>
                <Gauge severity={profile.severity} />
                <Text style={styles.summaryValue}>{profile.severity}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>System Confidence</Text>
                <ConfidenceRing value={topConfidence} />
              </View>
            </View>
            <View style={styles.successNote}>
              <Text style={styles.checkCircle}>✓</Text>
              <Text style={styles.successText}>
                This analysis is based on AI evaluation and the profile information provided.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.panel, styles.widePanel]}>
            <SectionTitle title="RECOMMENDED INGREDIENTS" tone="green" />
            {topRecommended.map((item, index) => (
              <IngredientReportCard key={item.name} item={item} index={index} />
            ))}
            <View style={styles.patchNote}>
              <Text style={styles.patchIcon}>✓</Text>
              <Text style={styles.patchText}>Patch test recommended before using new products.</Text>
            </View>
          </View>

          <View style={[styles.sideColumn, styles.widePanel]}>
            <View style={styles.panel}>
              <SectionTitle title="INGREDIENTS TO AVOID" tone="red" />
              {avoidItems.length ? (
                avoidItems.map((item) => <AvoidReportCard key={item.name} item={item} />)
              ) : (
                <Text style={styles.emptyText}>No avoid ingredients detected.</Text>
              )}
            </View>

            <View style={styles.panel}>
              <SectionTitle title="CONFLICT WARNINGS" tone="orange" />
              {conflicts.length ? (
                conflicts.map((message) => {
                  const conflict = parseConflict(message);
                  return (
                    <View key={message} style={styles.conflictRow}>
                      <View style={styles.warningDot}>
                        <Text style={styles.warningDotText}>!</Text>
                      </View>
                      <View style={styles.conflictText}>
                        <Text style={styles.conflictPair}>{conflict.pair}</Text>
                        <Text style={styles.conflictReason}>{conflict.reason}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No conflicts detected.</Text>
              )}
              <Text style={styles.conflictFooter}>
                Always introduce active ingredients gradually.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.panel, styles.halfPanel]}>
            <SectionTitle title="SUGGESTED SKINCARE ROUTINE" tone="blue" />
            <View style={styles.routineTable}>
              <View style={styles.routineRow}>
                <Text style={styles.routineStep}>Cleanser</Text>
                <Text style={styles.routineText}>
                  {topRecommended[1]?.name || "Gentle cleanser"}{"\n"}Use twice daily
                </Text>
              </View>
              <View style={styles.routineRow}>
                <Text style={styles.routineStep}>Treatment</Text>
                <Text style={styles.routineText}>
                  {topRecommended[0]?.name || "Recommended serum"}{"\n"}Use as directed
                </Text>
              </View>
              <View style={styles.routineRow}>
                <Text style={styles.routineStep}>Moisturizer</Text>
                <Text style={styles.routineText}>
                  Lightweight, non-comedogenic{"\n"}Use twice daily
                </Text>
              </View>
              <View style={[styles.routineRow, styles.lastRoutineRow]}>
                <Text style={styles.routineStep}>Sunscreen</Text>
                <Text style={styles.routineText}>
                  Broad spectrum SPF 30+{"\n"}Use every morning
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.panel, styles.halfPanel]}>
            <SectionTitle title="PERSONALIZED SKIN TIPS" tone="purple" />
            {[
              "Maintain a gentle skincare routine.",
              `Use products suitable for ${profile.skinType.toLowerCase()} skin.`,
              "Avoid picking or squeezing irritated skin.",
              "Keep your skin hydrated.",
              "Use sunscreen daily, even indoors.",
              "Consult a dermatologist if the condition worsens.",
            ].map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.tipDot}>
                  <Text style={styles.tipDotText}>✓</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
            <View style={styles.productArt}>
              <View style={styles.tube} />
              <View style={styles.bottle}>
                <View style={styles.bottleCap} />
              </View>
              <View style={styles.jar} />
            </View>
          </View>
        </View>

        {result.profileWarnings.length ? (
          <View style={styles.warningPanel}>
            <Text style={styles.warningPanelTitle}>PROFILE SAFETY NOTES</Text>
            {result.profileWarnings.map((warning) => (
              <Text key={warning} style={styles.warningPanelText}>
                - {warning}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.disclaimerBox}>
          <View style={styles.shieldCircle}>
            <Text style={styles.shieldText}>!</Text>
          </View>
          <View style={styles.disclaimerTextWrap}>
            <Text style={styles.disclaimerTitle}>DISCLAIMER</Text>
            <Text style={styles.disclaimerText}>
              This report is generated by an AI-based system for general skincare
              guidance only and is not a medical diagnosis. Please consult a
              dermatologist for personalized medical advice.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <PrimaryButton title="Save Report" onPress={handleSave} />
          </View>
          <View style={styles.actionItem}>
            <PrimaryButton title="Share Report" onPress={handleShare} variant="secondary" />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>DermaSafe AI</Text>
          <Text style={styles.footerText}>Thank you for trusting DermaSafe AI!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#EAF4F8",
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  report: {
    width: "100%",
    maxWidth: 980,
    backgroundColor: "#FFFFFF",
    borderColor: "#CBE4EA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navButton: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8FB",
    borderColor: "#CBE4EA",
    borderWidth: 1,
  },
  navButtonText: {
    color: "#0A3154",
    fontSize: 18,
    fontWeight: "900",
  },
  shareText: {
    color: "#0D7C90",
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 24,
  },
  brandBlock: {
    width: 170,
    alignItems: "center",
  },
  logoCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: "#22AAA1",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#22AAA1",
    fontSize: 20,
    fontWeight: "900",
  },
  brandName: {
    color: "#0C9E97",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  brandTag: {
    color: "#0B2440",
    fontSize: 11,
    textAlign: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  mainTitle: {
    color: "#0A3154",
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    textAlign: "center",
  },
  mainSubtitle: {
    color: "#0B2440",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
  metaBlock: {
    width: 175,
    alignItems: "flex-end",
  },
  metaText: {
    color: "#0B2440",
    fontSize: 13,
    lineHeight: 22,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },
  panel: {
    backgroundColor: "#FAFEFF",
    borderColor: "#C9E9ED",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  halfPanel: {
    flexGrow: 1,
    flexBasis: 390,
  },
  widePanel: {
    flexGrow: 1,
    flexBasis: 430,
  },
  sideColumn: {
    gap: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  blueIcon: {
    backgroundColor: "#52C4D3",
  },
  greenIcon: {
    backgroundColor: "#13A36F",
  },
  redIcon: {
    backgroundColor: "#EF767A",
  },
  orangeIcon: {
    backgroundColor: "#F59E0B",
  },
  purpleIcon: {
    backgroundColor: "#8B6AC8",
  },
  sectionIconText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  blueTitle: {
    color: "#0A3154",
  },
  greenTitle: {
    color: "#059669",
  },
  redTitle: {
    color: "#EF4444",
  },
  orangeTitle: {
    color: "#F97316",
  },
  purpleTitle: {
    color: "#7C5DB1",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
  },
  infoRow: {
    width: "50%",
    minWidth: 165,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#67CBD3",
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    color: "#0A3154",
    fontSize: 13,
    fontWeight: "900",
  },
  infoValue: {
    color: "#0B2440",
    fontSize: 13,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    minHeight: 34,
  },
  conditionCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#DDF5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  conditionIcon: {
    color: "#16A36F",
    fontSize: 22,
    fontWeight: "900",
  },
  summaryValue: {
    color: "#111827",
    fontWeight: "900",
    marginTop: 8,
  },
  gauge: {
    width: 100,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeBase: {
    width: 78,
    height: 39,
    borderTopLeftRadius: 78,
    borderTopRightRadius: 78,
    borderWidth: 13,
    borderBottomWidth: 0,
    borderColor: "#D1D5DB",
    position: "absolute",
    bottom: 22,
  },
  gaugeNeedle: {
    width: 6,
    height: 44,
    backgroundColor: "#111827",
    borderRadius: 3,
    position: "absolute",
    bottom: 28,
    zIndex: 2,
  },
  gaugeLow: {
    transform: [{ rotate: "35deg" }],
  },
  gaugeMedium: {
    transform: [{ rotate: "0deg" }],
  },
  gaugeHigh: {
    transform: [{ rotate: "-35deg" }],
  },
  ringOuter: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 14,
    borderColor: "#20B8B1",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#F8FDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: {
    color: "#0A3154",
    fontSize: 22,
    fontWeight: "900",
  },
  successNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAFBF6",
    borderColor: "#9CE1D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#35BBA5",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "900",
  },
  successText: {
    flex: 1,
    color: "#0F172A",
    lineHeight: 19,
  },
  ingredientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F7FFFB",
    borderColor: "#B8E6D6",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  moleculeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  moleculeText: {
    color: "#0A3154",
    fontWeight: "900",
    fontSize: 18,
  },
  ingredientText: {
    flex: 1,
  },
  ingredientName: {
    color: "#0A3154",
    fontSize: 18,
    fontWeight: "900",
  },
  smallLine: {
    color: "#0B2440",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  greenLine: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  redLine: {
    color: "#EF1111",
    fontSize: 13,
    marginTop: 2,
  },
  bullet: {
    color: "#111827",
    fontSize: 12,
    lineHeight: 17,
  },
  confidenceBadge: {
    width: 74,
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7DDCE",
    backgroundColor: "#E9F9F4",
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceNumber: {
    color: "#0A3154",
    fontSize: 18,
    fontWeight: "900",
  },
  confidenceLabel: {
    color: "#0B2440",
    fontSize: 11,
    fontWeight: "700",
  },
  patchNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAFBF6",
    borderRadius: 12,
    padding: 12,
  },
  patchIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#35BBA5",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "900",
  },
  patchText: {
    color: "#0F172A",
  },
  avoidCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF8F8",
    borderColor: "#F8B4B4",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  avoidCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#F2F9F5",
    borderColor: "#F8B4B4",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avoidInitial: {
    color: "#0A3154",
    fontWeight: "900",
  },
  avoidText: {
    flex: 1,
  },
  avoidName: {
    color: "#EF1111",
    fontSize: 17,
    fontWeight: "900",
  },
  xCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: "#EF1111",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  xText: {
    color: "#EF1111",
    fontSize: 24,
    fontWeight: "900",
  },
  conflictRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  warningDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF0D3",
    alignItems: "center",
    justifyContent: "center",
  },
  warningDotText: {
    color: "#F97316",
    fontWeight: "900",
  },
  conflictText: {
    flex: 1,
  },
  conflictPair: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  conflictReason: {
    color: "#3F2E16",
    fontSize: 13,
    marginTop: 2,
  },
  conflictFooter: {
    color: "#3F2E16",
    marginTop: 4,
    paddingLeft: 40,
  },
  routineTable: {
    borderColor: "#D5E7F8",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  routineRow: {
    flexDirection: "row",
    borderBottomColor: "#D5E7F8",
    borderBottomWidth: 1,
  },
  lastRoutineRow: {
    borderBottomWidth: 0,
  },
  routineStep: {
    width: 140,
    color: "#0A3154",
    fontWeight: "900",
    padding: 12,
    backgroundColor: "#F4FAFF",
  },
  routineText: {
    flex: 1,
    color: "#111827",
    lineHeight: 20,
    padding: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  tipDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#8B6AC8",
    alignItems: "center",
    justifyContent: "center",
  },
  tipDotText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  tipText: {
    flex: 1,
    color: "#111827",
    lineHeight: 19,
  },
  productArt: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  tube: {
    width: 36,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#86D5DF",
    transform: [{ skewX: "-8deg" }],
  },
  bottle: {
    width: 46,
    height: 88,
    borderRadius: 10,
    backgroundColor: "#74C9D4",
    alignItems: "center",
  },
  bottleCap: {
    width: 22,
    height: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: "#0EA5B7",
    marginTop: -10,
  },
  jar: {
    width: 52,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#6BC2CC",
    marginTop: 36,
  },
  warningPanel: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningPanelTitle: {
    color: "#9A3412",
    fontWeight: "900",
    marginBottom: 6,
  },
  warningPanelText: {
    color: "#7C2D12",
    lineHeight: 20,
  },
  disclaimerBox: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#FFF8E8",
    borderColor: "#F5D58B",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  shieldCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FDECC8",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldText: {
    color: "#7C4A03",
    fontSize: 24,
    fontWeight: "900",
  },
  disclaimerTextWrap: {
    flex: 1,
  },
  disclaimerTitle: {
    color: "#8A4B08",
    fontSize: 16,
    fontWeight: "900",
  },
  disclaimerText: {
    color: "#3F2E16",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  actionItem: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#008F7D",
    marginHorizontal: -22,
    marginBottom: -22,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  footerText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    lineHeight: 20,
  },
});
