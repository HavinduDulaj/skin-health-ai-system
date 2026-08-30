import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius, spacing } from "../lib/theme";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Fine({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.fine, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Rule() {
  return <View style={styles.rule} />;
}

export function Mark({ size = 16 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size,
          backgroundColor: colors.high,
        }}
      />
    </View>
  );
}

export function CaptureRing() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.ringOuter} />
      <View style={styles.ringInner} />
    </View>
  );
}

export function StatusLamp({
  on,
  label,
}: {
  on: boolean;
  label: string;
}) {
  return (
    <View style={styles.lampRow}>
      <View style={[styles.lamp, { backgroundColor: on ? colors.sage2 : colors.high }]} />
      <Text style={styles.lampText}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btnPrimary,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.btnPrimaryText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
      onPress={onPress}
    >
      <Text style={styles.btnGhostText}>{label}</Text>
    </Pressable>
  );
}

export function RiskMeter({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number | null;
  tone: "low" | "mid" | "high";
}) {
  const width = value ? `${Math.round(value * 100)}%` : "0%";
  return (
    <View style={styles.meterWrap}>
      <View style={styles.meterLabelRow}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>
          {value == null ? "—" : `${Math.round(value * 100)}%`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, styles[`fill_${tone}`], { width: width as `${number}%` }]} />
      </View>
    </View>
  );
}

export function GradeTriad({
  probabilities,
  leading,
}: {
  probabilities: Record<string, number | null>;
  leading?: string | null;
}) {
  const grades: Array<{ key: string; tone: "low" | "mid" | "high"; color: string }> = [
    { key: "Low", tone: "low", color: colors.low },
    { key: "Medium", tone: "mid", color: colors.mid },
    { key: "High", tone: "high", color: colors.high },
  ];
  return (
    <View style={styles.triad}>
      {grades.map((g) => {
        const value = probabilities[g.key];
        const on = leading === g.key;
        return (
          <View
            key={g.key}
            style={[styles.triadCol, on && { borderColor: g.color, backgroundColor: colors.paper }]}
          >
            <Text style={[styles.triadPct, { color: on ? g.color : colors.ink }]}>
              {value == null ? "—" : Math.round(value * 100)}
            </Text>
            <Text style={styles.triadUnit}>%</Text>
            <Text style={[styles.triadName, on && { color: g.color }]}>{g.key}</Text>
            <View style={styles.track}>
              <View
                style={[styles.fill, styles[`fill_${g.tone}`], { width: `${value ? Math.round(value * 100) : 0}%` as `${number}%` }]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function PipelineStrip({
  steps,
}: {
  steps: Array<{ title: string; status: string; detail?: string }>;
}) {
  if (!steps.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipeRow}>
      {steps.map((step, index) => (
        <View key={`${step.title}-${index}`} style={[styles.pipePlate, pipeTone(step.status)]}>
          <Text style={styles.pipeN}>{String(index + 1).padStart(2, "0")}</Text>
          <Text style={styles.pipeTitle} numberOfLines={2}>
            {step.title}
          </Text>
          <Text style={styles.pipeStatus}>{step.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function pipeTone(status: string): ViewStyle {
  if (status === "passed") return { borderColor: "rgba(62, 107, 79, 0.45)" };
  if (status === "rejected" || status === "held") return { borderColor: "rgba(176, 122, 43, 0.55)" };
  return { opacity: 0.72 };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.sage,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontFamily: fonts.sansSemi,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontFamily: fonts.serif,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.sans,
  },
  fine: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.sans,
  },
  card: {
    backgroundColor: colors.paper2,
    borderRadius: radius.plate,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.lineStrong,
  },
  mark: {
    borderWidth: 1.5,
    borderColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  ringOuter: {
    position: "absolute",
    top: "16%",
    left: "16%",
    right: "16%",
    bottom: "16%",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(28, 24, 20, 0.34)",
  },
  ringInner: {
    position: "absolute",
    top: "26%",
    left: "26%",
    right: "26%",
    bottom: "26%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(28, 24, 20, 0.18)",
  },
  lampRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  lamp: { width: 7, height: 7, borderRadius: 7 },
  lampText: { color: colors.muted, fontSize: 13, fontFamily: fonts.sansMed, flex: 1 },
  btnPrimary: {
    backgroundColor: colors.ink,
    borderRadius: radius.tight,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: colors.paper2,
    fontFamily: fonts.sansSemi,
    fontSize: 15,
  },
  btnGhost: {
    borderRadius: radius.tight,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  btnGhostText: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
    fontSize: 15,
  },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.82 },
  meterWrap: { gap: 6 },
  meterLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  meterLabel: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 14 },
  meterValue: { color: colors.muted, fontFamily: fonts.sans, fontSize: 14 },
  track: {
    height: 4,
    backgroundColor: "rgba(28,24,20,0.08)",
    borderRadius: 1,
    overflow: "hidden",
  },
  fill: { height: "100%" },
  fill_low: { backgroundColor: colors.low },
  fill_mid: { backgroundColor: colors.mid },
  fill_high: { backgroundColor: colors.high },
  triad: { flexDirection: "row", gap: 8 },
  triadCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper2,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 2,
  },
  triadPct: {
    fontFamily: fonts.serif,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  triadUnit: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  triadName: {
    color: colors.muted,
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  pipeRow: { gap: 8, paddingRight: spacing.md },
  pipePlate: {
    width: 118,
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper2,
    padding: 10,
    gap: 4,
  },
  pipeN: { fontFamily: fonts.serif, color: colors.sage, fontSize: 13 },
  pipeTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12, lineHeight: 16 },
  pipeStatus: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stat: {
    flex: 1,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    minWidth: "46%",
  },
  statValue: {
    fontFamily: fonts.serif,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  statLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 4 },
});
