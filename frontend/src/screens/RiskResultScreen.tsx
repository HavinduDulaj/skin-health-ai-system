import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { AppIcon, ProgressBar, ScreenHeader, StatusPill, StepIndicator } from '../components/DesignSystem';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

export default function RiskResultScreen({ navigation, route }: ScreenProps<'RiskResult'>) {
  const { palette } = useThemeContext();
  const { result } = route.params;
  const decision = result.riskDecision || (result.riskLevel ? 'grade' : 'unavailable');
  const hasRiskLevel = result.riskLevel === 'Low' || result.riskLevel === 'Medium' || result.riskLevel === 'High';
  const isGrade = decision === 'grade' && hasRiskLevel;
  const decisionLabel =
    decision === 'quality_reject'
      ? 'Retake image'
      : decision === 'abstain'
        ? 'Model abstained'
        : decision === 'unavailable'
          ? 'Model unavailable'
          : 'Risk graded';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <ScreenHeader title="Risk Level Analysis" subtitle="Member 2 screening result" />
        <StepIndicator steps={['Disease', 'Risk', 'Guidance']} activeIndex={1} />

        <View style={[styles.contextCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.contextIcon}>
            <AppIcon name="medical-outline" size={24} color={palette.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.eyebrow, { color: palette.secondaryText }]}>MEMBER 1 INPUT</Text>
            <Text style={[styles.condition, { color: palette.text }]}>{result.condition}</Text>
            <Text style={[styles.meta, { color: palette.secondaryText }]}>
              Disease confidence {Math.round(result.confidence * 100)}%
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: palette.secondaryText }]}>MEMBER 2 DECISION</Text>
              <Text style={[styles.title, { color: palette.text }]}>Risk screening</Text>
            </View>
            <StatusPill
              label={decisionLabel}
              tone={isGrade ? (result.riskLevel === 'High' ? 'red' : result.riskLevel === 'Medium' ? 'amber' : 'green') : 'amber'}
              icon={isGrade ? 'shield-checkmark-outline' : 'warning-outline'}
            />
          </View>

          {isGrade ? (
            <>
              <Text style={[styles.riskValue, { color: result.riskLevel === 'High' ? palette.danger : result.riskLevel === 'Medium' ? palette.warning : palette.success }]}>
                {result.riskLevel} Risk
              </Text>
              {typeof result.riskConfidence === 'number' ? (
                <View style={styles.metricBlock}>
                  <View style={styles.metricRow}>
                    <Text style={[styles.meta, { color: palette.secondaryText }]}>Model confidence</Text>
                    <Text style={[styles.metricValue, { color: palette.text }]}>{result.riskConfidence}%</Text>
                  </View>
                  <ProgressBar value={result.riskConfidence} color={palette.primary} />
                </View>
              ) : null}
              {typeof result.riskScore === 'number' ? (
                <View style={styles.metricBlock}>
                  <View style={styles.metricRow}>
                    <Text style={[styles.meta, { color: palette.secondaryText }]}>Weighted risk score</Text>
                    <Text style={[styles.metricValue, { color: palette.text }]}>{result.riskScore}/100</Text>
                  </View>
                  <ProgressBar value={result.riskScore} color={result.riskLevel === 'High' ? palette.danger : result.riskLevel === 'Medium' ? palette.warning : palette.success} />
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[styles.notice, { color: palette.secondaryText }]}>
              {result.suggestedAction || 'Member 2 did not commit a Low, Medium, or High grade for this image.'}
            </Text>
          )}
        </View>

        <View style={styles.primaryAction}>
          {!hasRiskLevel ? (
            <Text style={[styles.actionNotice, { color: palette.secondaryText }]}>
              The risk model did not commit a severity. Confirm the severity on the ingredient screen before running its model.
            </Text>
          ) : null}
          <AppButton
            icon="flask-outline"
            label="Continue to Ingredient Recommendations"
            onPress={() => navigation.navigate('IngredientRecommendations', { result })}
          />
        </View>

        {typeof result.riskQuality?.score === 'number' ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.metricRow}>
              <Text style={[styles.title, { color: palette.text }]}>Image quality</Text>
              <Text style={[styles.metricValue, { color: palette.text }]}>{Math.round(result.riskQuality.score * 100)}%</Text>
            </View>
            <ProgressBar value={Math.round(result.riskQuality.score * 100)} color={result.riskQuality.is_low_quality ? palette.warning : palette.teal} />
            {result.riskQuality.flags?.map((flag) => (
              <Text key={flag} style={[styles.meta, { color: palette.secondaryText }]}>• {flag}</Text>
            ))}
          </View>
        ) : null}

        {result.suggestedAction && isGrade ? (
          <View style={[styles.guidanceCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Recommended action</Text>
            <Text style={[styles.notice, { color: palette.secondaryText }]}>{result.suggestedAction}</Text>
          </View>
        ) : null}

        {result.riskFactors?.length ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Evidence and indicators</Text>
            {result.riskFactors.map((factor) => (
              <View key={factor} style={styles.factorRow}>
                <AppIcon name="analytics-outline" size={17} color={palette.primary} />
                <Text style={[styles.factorText, { color: palette.secondaryText }]}>{factor}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.disclaimer, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.meta, { color: palette.secondaryText }]}>This is a research screening result, not a medical diagnosis.</Text>
        </View>

        <View style={styles.actions}>
          <AppButton icon="arrow-back-outline" label="Back to Disease Result" onPress={() => navigation.goBack()} variant="secondary" />
          <AppButton icon="home-outline" label="Back to Dashboard" onPress={() => navigation.navigate('Dashboard')} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignItems: 'center', flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  flex: { flex: 1 },
  contextCard: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 16, width: '100%' },
  contextIcon: { alignItems: 'center', backgroundColor: '#E8F3F8', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  card: { borderRadius: 10, borderWidth: 1, gap: 14, marginTop: 14, padding: 18, width: '100%' },
  guidanceCard: { borderLeftWidth: 4, borderRadius: 10, borderWidth: 1, gap: 8, marginTop: 14, padding: 18, width: '100%' },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  condition: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  title: { fontSize: 17, fontWeight: '800' },
  meta: { fontSize: 13, lineHeight: 19 },
  riskValue: { fontSize: 34, fontWeight: '900', marginVertical: 4 },
  metricBlock: { gap: 7 },
  metricRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  metricValue: { fontSize: 14, fontWeight: '800' },
  notice: { fontSize: 14, lineHeight: 22 },
  factorRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9 },
  factorText: { flex: 1, fontSize: 13, lineHeight: 19 },
  disclaimer: { borderRadius: 10, borderWidth: 1, marginTop: 14, padding: 16, width: '100%' },
  primaryAction: { gap: 10, marginTop: 18, width: '100%' },
  actionNotice: { fontSize: 13, lineHeight: 19 },
  actions: { gap: 10, marginTop: 18, width: '100%' },
});
