import { StyleSheet, Text, View } from 'react-native';

import { useThemeContext } from '../context/ThemeContext';
import type { ScanResult } from '../types';

interface ResultCardProps {
  result: ScanResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const { palette } = useThemeContext();
  const percent = Math.round(result.confidence * 100);

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
        <View style={[styles.iconCircle, { backgroundColor: palette.success }]}>
          <Text style={styles.okText}>OK</Text>
        </View>
        <Text style={[styles.condition, { color: palette.primary }]}>{result.condition}</Text>
        <Text style={[styles.label, { color: palette.secondaryText }]}>Confidence</Text>
        <Text style={[styles.percent, { color: palette.success }]}>{percent}%</Text>
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
    borderRadius: 999,
    borderWidth: 1,
    height: 252,
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
});
