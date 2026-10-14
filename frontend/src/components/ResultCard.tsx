import { StyleSheet, Text, View } from 'react-native';

import { useThemeContext } from '../context/ThemeContext';
import type { ScanResult } from '../types';

interface ResultCardProps {
  result: ScanResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const { palette } = useThemeContext();
  const percent = Math.round(result.confidence * 100);
  const isHealthy = result.condition === 'Healthy';
  const statusColor = isHealthy || !result.reviewRequired ? palette.success : palette.warning;
  const statusText = isHealthy ? 'Good' : result.reviewRequired ? 'Review' : 'OK';

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.circle,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: statusColor }]}>
          <Text style={styles.okText}>{statusText}</Text>
        </View>
        <Text style={[styles.condition, { color: isHealthy ? palette.success : palette.primary }]}>
          {isHealthy ? 'No skin condition detected' : result.reviewRequired ? `Possible ${result.condition}` : result.condition}
        </Text>
        <Text style={[styles.label, { color: palette.secondaryText }]}>
          {isHealthy ? 'Skin status confidence' : 'Confidence'}
        </Text>
        <Text style={[styles.percent, { color: statusColor }]}>{percent}%</Text>
        {isHealthy ? (
          <Text style={[styles.reviewText, { color: palette.secondaryText }]}>
            Skin looks good in this image. Keep monitoring if symptoms appear.
          </Text>
        ) : result.reviewRequired ? (
          <Text style={[styles.reviewText, { color: palette.secondaryText }]}>Low certainty. Check top predictions.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  okText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  circle: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 252,
    justifyContent: 'center',
    padding: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    width: 252,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  condition: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    marginTop: 10,
  },
  percent: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 6,
  },
  reviewText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    textAlign: 'center',
  },
});
