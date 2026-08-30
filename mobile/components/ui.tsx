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

export function TitleEm({ children }: { children: React.ReactNode }) {
  return <Text style={styles.titleEm}>{children}</Text>;
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

export function BrandMark({ size = 18 }: { size?: number }) {
  const inner = size * 0.34;
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner,
          backgroundColor: colors.sage,
        }}
      />
    </View>
  );
}

/** @deprecated use BrandMark */
export function Mark({ size = 18 }: { size?: number }) {
  return <BrandMark size={size} />;
}

export function BrandTitle() {
  return (
    <View style={styles.brandRow}>
      <BrandMark size={16} />
      <Text style={styles.brandName}>Derma-Safe</Text>
    </View>
  );
}

export function CaptureRing() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.ringOuter} />
    </View>
  );
}

export function HeroStage() {
  return (
    <View style={styles.stage}>
      <View style={styles.stageFrame}>
        <CaptureRing />
        <Text style={styles.stageCaption}>
          Daylight · fill the frame{"\n"}with the skin area
        </Text>
      </View>
      <Text style={styles.stageNote}>Made for a phone camera.</Text>
    </View>
  );
}

export function TrustList({ items }: { items: string[] }) {
  return (
    <View style={styles.trust}>
      {items.map((item) => (
        <View key={item} style={styles.trustItem}>
          <View style={styles.trustDot} />
          <Text style={styles.trustText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function StatusLamp({ on, label }: { on: boolean; label: string }) {
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

export function Chip({
  label,
  selected,
  onPress,
  capitalize = true,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  capitalize?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text
        style={[
          styles.chipText,
          !capitalize && styles.chipTextPlain,
          selected && styles.chipTextOn,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DecisionPill({
  label,
  kind,
}: {
  label: string;
  kind?: string;
}) {
  const tone =
    kind === "abstain"
      ? { color: colors.mid, borderColor: colors.mid }
      : kind === "quality_reject" || kind === "reject"
        ? { color: colors.high, borderColor: colors.high }
        : { color: colors.sage, borderColor: colors.lineStrong };
  return <Text style={[styles.pill, tone]}>{label}</Text>;
}

export function PipelineStrip({
  steps,
}: {
  steps: Array<{ title: string; status: string; detail: string }>;
}) {
  if (!steps.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.trace}
    >
      {steps.map((step) => {
        const held = step.status === "rejected" || step.status === "held";
        const passed = step.status === "passed";
        return (
          <View
            key={step.title}
            style={[
              styles.traceStep,
              passed && styles.tracePassed,
              held && styles.traceHeld,
            ]}
          >
            <Text style={styles.traceTitle}>{step.title}</Text>
            <Text style={styles.traceStatus}>{step.status}</Text>
            {step.detail ? (
              <Text style={styles.traceDetail} numberOfLines={3}>
                {step.detail}
              </Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

export function MeterBar({
  label,
  value,
  maxLabel,
}: {
  label: string;
  value: number;
  maxLabel?: string;
}) {
  const width = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <View style={styles.meter}>
      <View style={styles.meterLabel}>
        <Text style={styles.meterName}>{label}</Text>
        <Text style={styles.meterValue}>{maxLabel ?? width + "%"}</Text>
      </View>
      <View style={styles.qBar}>
        <View style={[styles.qFill, { width: `${width}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

export function Flag({ children }: { children: React.ReactNode }) {
  return <Text style={styles.flag}>{children}</Text>;
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
            style={[styles.triadCol, on && { borderColor: g.color }]}
          >
            <Text style={[styles.triadPct, { color: on ? g.color : colors.ink }]}>
              {value == null ? "—" : Math.round(value * 100)}
            </Text>
            <Text style={styles.triadUnit}>%</Text>
            <Text style={[styles.triadName, on && { color: g.color }]}>{g.key}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  styles[`fill_${g.tone}`],
                  { width: `${value ? Math.round(value * 100) : 0}%` as `${number}%` },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
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

export function ArchRow({
  index,
  title,
  summary,
}: {
  index: number;
  title: string;
  summary: string;
}) {
  return (
    <View style={styles.arch}>
      <Text style={styles.archN}>{String(index).padStart(2, "0")}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.archTitle}>{title}</Text>
        <Text style={styles.fine}>{summary}</Text>
      </View>
    </View>
  );
}

export function FooterNote({ children }: { children: React.ReactNode }) {
  return <Text style={styles.footer}>{children}</Text>;
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
    fontSize: 13,
    letterSpacing: 0.5,
    fontFamily: fonts.sansSemi,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    fontFamily: fonts.serifSemi,
  },
  titleEm: {
    fontFamily: fonts.serifItalic,
    color: colors.sage,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
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
  mark: {
    borderWidth: 1.5,
    borderColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.wash,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: {
    fontFamily: fonts.serifSemi,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  ringOuter: {
    position: "absolute",
    top: "18%",
    left: "18%",
    right: "18%",
    bottom: "18%",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(26, 36, 33, 0.28)",
  },
  stage: { gap: 10 },
  stageFrame: {
    aspectRatio: 4 / 5,
    borderRadius: 18,
    backgroundColor: "#d7e6e1",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  stageCaption: {
    fontFamily: fonts.serifItalic,
    color: "rgba(26, 36, 33, 0.72)",
    fontSize: 16,
    lineHeight: 22,
    padding: 18,
  },
  stageNote: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  trust: { gap: 8 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.sage2,
  },
  trustText: { color: colors.muted, fontFamily: fonts.sans, fontSize: 14 },
  lampRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  lamp: { width: 8, height: 8, borderRadius: 8 },
  lampText: { color: colors.muted, fontSize: 13, fontFamily: fonts.sansMed, flex: 1 },
  btnPrimary: {
    backgroundColor: colors.sage,
    borderRadius: radius.tight,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: colors.white,
    fontFamily: fonts.sansSemi,
    fontSize: 15,
  },
  btnGhost: {
    borderRadius: radius.tight,
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  btnGhostText: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
    fontSize: 15,
  },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.88 },
  chip: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.paper2,
  },
  chipOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  chipText: {
    color: colors.ink,
    fontFamily: fonts.sansMed,
    fontSize: 14,
    textTransform: "capitalize",
  },
  chipTextPlain: { textTransform: "none" },
  chipTextOn: { color: colors.white },
  pill: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.tight,
    borderWidth: 1,
    fontSize: 11,
    fontFamily: fonts.sansSemi,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  trace: { gap: 8, paddingRight: 8 },
  traceStep: {
    width: 148,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.plate,
    padding: 10,
    gap: 3,
  },
  tracePassed: { borderColor: "rgba(47, 125, 91, 0.45)" },
  traceHeld: { borderColor: "rgba(184, 134, 11, 0.5)" },
  traceTitle: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.ink },
  traceStatus: {
    fontFamily: fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  traceDetail: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, lineHeight: 15 },
  meter: { gap: 4 },
  meterLabel: { flexDirection: "row", justifyContent: "space-between" },
  meterName: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
  meterValue: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  qBar: {
    height: 5,
    backgroundColor: "rgba(26,36,33,0.08)",
    borderRadius: 1,
    overflow: "hidden",
  },
  qFill: { height: "100%", backgroundColor: colors.sage2 },
  flag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontFamily: fonts.sans,
    color: colors.ink,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  track: {
    height: 4,
    backgroundColor: "rgba(26,36,33,0.08)",
    borderRadius: 1,
    overflow: "hidden",
    marginTop: 8,
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
    backgroundColor: colors.paper,
    borderRadius: radius.tight,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  triadPct: {
    fontFamily: fonts.serif,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  triadUnit: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, marginTop: 2 },
  triadName: {
    color: colors.muted,
    fontFamily: fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 6,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.tight,
    padding: 14,
    minWidth: "46%",
  },
  statValue: {
    fontFamily: fonts.serif,
    fontSize: 24,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  statLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 4 },
  arch: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.plate,
    backgroundColor: colors.paper2,
  },
  archN: { fontFamily: fonts.serif, fontSize: 16, color: colors.sage, width: 28 },
  archTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 15, marginBottom: 2 },
  footer: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
