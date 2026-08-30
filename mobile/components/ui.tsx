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

export function Mark({ size = 18 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={{
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: size,
          backgroundColor: colors.sage,
        }}
      />
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
            style={[styles.triadCol, on && { borderColor: g.color, backgroundColor: colors.wash }]}
          >
            <Text style={[styles.triadPct, { color: on ? g.color : colors.ink }]}>
              {value == null ? "—" : Math.round(value * 100)}
              <Text style={styles.triadUnit}>%</Text>
            </Text>
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
    fontSize: 12,
    letterSpacing: 0.6,
    fontFamily: fonts.sansSemi,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
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
  mark: {
    borderWidth: 1.5,
    borderColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.wash,
  },
  ringOuter: {
    position: "absolute",
    top: "14%",
    left: "14%",
    right: "14%",
    bottom: "14%",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  lampRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  lamp: { width: 8, height: 8, borderRadius: 8 },
  lampText: { color: colors.muted, fontSize: 13, fontFamily: fonts.sansMed, flex: 1 },
  btnPrimary: {
    backgroundColor: colors.sage,
    borderRadius: radius.tight,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: colors.white,
    fontFamily: fonts.sansSemi,
    fontSize: 16,
  },
  btnGhost: {
    borderRadius: radius.tight,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
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
  track: {
    height: 5,
    backgroundColor: "rgba(26,36,33,0.08)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 6,
  },
  fill: { height: "100%", borderRadius: 999 },
  fill_low: { backgroundColor: colors.low },
  fill_mid: { backgroundColor: colors.mid },
  fill_high: { backgroundColor: colors.high },
  triad: { flexDirection: "row", gap: 10 },
  triadCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper2,
    borderRadius: radius.tight,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  triadPct: {
    fontFamily: fonts.serif,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  triadUnit: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  triadName: {
    color: colors.muted,
    fontFamily: fonts.sansMed,
    fontSize: 13,
    marginTop: 2,
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
});
