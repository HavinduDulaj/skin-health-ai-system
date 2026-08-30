import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, spacing } from "../lib/theme";

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

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
      style={[styles.btnPrimary, disabled && styles.btnDisabled]}
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
    <Pressable style={styles.btnGhost} onPress={onPress}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.sage,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.paper2,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  btnPrimary: {
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  btnGhost: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnGhostText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  meterWrap: { gap: 6 },
  meterLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meterLabel: { color: colors.ink, fontWeight: "600" },
  meterValue: { color: colors.muted },
  track: {
    height: 8,
    backgroundColor: "rgba(28,24,20,0.08)",
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
  fill_low: { backgroundColor: colors.low },
  fill_mid: { backgroundColor: colors.mid },
  fill_high: { backgroundColor: colors.high },
});
