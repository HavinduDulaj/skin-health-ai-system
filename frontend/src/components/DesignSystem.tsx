import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useThemeContext } from '../context/ThemeContext';
import { radii } from '../theme/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function AppIcon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { palette } = useThemeContext();
  return <Ionicons name={name} size={size} color={color ?? palette.primary} />;
}

export function IconButton({
  name,
  onPress,
  label,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  label?: string;
  style?: ViewStyle;
}) {
  const { palette } = useThemeContext();

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          opacity: pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      <AppIcon name={name} size={20} color={palette.text} />
    </Pressable>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const { palette } = useThemeContext();

  return (
    <View style={styles.header}>
      <View style={styles.headerAction}>{left}</View>
      <View style={styles.headerCopy}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: palette.secondaryText }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerAction}>{right}</View>
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'blue',
  icon,
}: {
  label: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'neutral';
  icon?: IconName;
}) {
  const { palette } = useThemeContext();
  const toneMap = {
    blue: [palette.primarySoft, palette.primary],
    green: ['#E8F7F0', palette.success],
    amber: ['#FFF5E6', palette.warning],
    red: ['#FFECEC', palette.danger],
    neutral: [palette.subtleSurface, palette.secondaryText],
  } as const;
  const [backgroundColor, color] = toneMap[tone];

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      {icon ? <AppIcon name={icon} size={14} color={color} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { palette } = useThemeContext();
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
      <View style={[styles.progressFill, { backgroundColor: color ?? palette.primary, width: `${safeValue}%` }]} />
    </View>
  );
}

export function StepIndicator({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  const { palette } = useThemeContext();

  return (
    <View style={styles.stepWrap}>
      {steps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <View key={step} style={styles.stepItem}>
            <View style={styles.stepLineWrap}>
              {index > 0 ? (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: index <= activeIndex ? palette.primary : palette.border },
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: complete || active ? palette.primary : palette.subtleSurface,
                    borderColor: complete || active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text style={[styles.stepNumber, { color: complete || active ? '#FFFFFF' : palette.muted }]}>
                  {complete ? 'OK' : index + 1}
                </Text>
              </View>
            </View>
            <Text style={[styles.stepText, { color: active ? palette.primary : palette.secondaryText }]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function MetricTile({
  label,
  value,
  tone = 'blue',
  icon,
}: {
  label: string;
  value: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'neutral';
  icon?: IconName;
}) {
  const { palette } = useThemeContext();
  const toneColor = {
    blue: palette.primary,
    green: palette.success,
    amber: palette.warning,
    red: palette.danger,
    neutral: palette.secondaryText,
  }[tone];

  return (
    <View style={[styles.metricTile, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${toneColor}18` }]}>
        {icon ? <AppIcon name={icon} size={18} color={toneColor} /> : null}
      </View>
      <Text style={[styles.metricLabel, { color: palette.secondaryText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  headerAction: {
    alignItems: 'center',
    minWidth: 42,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  stepWrap: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 14,
    width: '100%',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepLineWrap: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: '100%',
  },
  stepLine: {
    height: 2,
    left: '-50%',
    position: 'absolute',
    right: '50%',
    top: 13,
  },
  stepCircle: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
    zIndex: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '900',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  metricTile: {
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 92,
    padding: 12,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 30,
    justifyContent: 'center',
    marginBottom: 8,
    width: 30,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
});
