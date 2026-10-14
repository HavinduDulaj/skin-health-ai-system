import { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { AppIcon, MetricTile, ProgressBar, ScreenHeader, StatusPill, StepIndicator } from '../components/DesignSystem';
import ResultCard from '../components/ResultCard';
import { useThemeContext } from '../context/ThemeContext';
import { storageService } from '../services/storageService';
import type { ScreenProps } from '../types';

export default function ResultScreen({ navigation, route }: ScreenProps<'Result'>) {
  const { palette } = useThemeContext();
  const [saved, setSaved] = useState(false);
  const { result } = route.params;
  const isHealthy = result.condition === 'Healthy';
  const webScrollStyle = Platform.OS === 'web' ? ({ overflowY: 'auto' } as never) : null;

  const handleSave = async () => {
    await storageService.addHistoryItem(result);
    setSaved(true);
    Alert.alert('Saved', 'This scan has been added to your history.');
  };

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && styles.webSafeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled
        showsVerticalScrollIndicator
        style={[styles.scrollView, webScrollStyle]}
      >
        <ScreenHeader title="Detection Result" subtitle="AI analysis summary" />
        <StepIndicator steps={['Capture', 'Review', 'Analyze']} activeIndex={2} />
        <View style={[styles.summaryCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {result.imageUri ? <Image source={{ uri: result.imageUri }} style={styles.previewImage} /> : null}
          <View style={styles.summaryCopy}>
            <Text style={[styles.summaryLabel, { color: palette.secondaryText }]}>
              {isHealthy ? 'Skin Status' : 'Detected Condition'}
            </Text>
            <Text style={[styles.condition, { color: isHealthy ? palette.success : palette.text }]}>
              {isHealthy ? 'No visible condition detected' : result.condition}
            </Text>
            <View style={styles.summaryPills}>
              <StatusPill label={`${Math.round(result.confidence * 100)}% confidence`} tone="green" icon="checkmark-circle-outline" />
              {result.confidenceBand ? <StatusPill label={`${result.confidenceBand} certainty`} tone="blue" icon="analytics-outline" /> : null}
            </View>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <MetricTile
            label={isHealthy ? 'Status' : 'Condition'}
            value={isHealthy ? 'Healthy' : result.condition}
            tone={isHealthy ? 'green' : 'blue'}
            icon={isHealthy ? 'shield-checkmark-outline' : 'medical-outline'}
          />
          <MetricTile
            label="Confidence"
            value={`${Math.round(result.confidence * 100)}%`}
            tone={result.reviewRequired ? 'amber' : 'green'}
            icon="checkmark-circle-outline"
          />
          <MetricTile
            label="Review"
            value={result.reviewRequired ? 'Needed' : 'Clear'}
            tone={result.reviewRequired ? 'amber' : 'green'}
            icon="shield-checkmark-outline"
          />
        </View>
        <ResultCard result={result} />

        {result.gradCamImage ? (
          <View style={[styles.explainBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.explainHead}>
              <View>
                <Text style={[styles.riskTitle, { color: palette.text }]}>AI Focus Map</Text>
                <Text style={[styles.riskMeta, { color: palette.secondaryText }]}>
                  Grad-CAM{result.gradCamLayer ? ` - ${result.gradCamLayer}` : ''}
                </Text>
              </View>
              <StatusPill label="Explainable AI" tone="blue" icon="scan-outline" />
            </View>
            <View style={styles.imageCompare}>
              {result.imageUri ? (
                <View style={styles.compareItem}>
                  <Image source={{ uri: result.imageUri }} style={styles.explainImage} />
                  <Text style={[styles.compareLabel, { color: palette.secondaryText }]}>Original</Text>
                </View>
              ) : null}
              <View style={styles.compareItem}>
                <Image source={{ uri: result.gradCamImage }} style={styles.explainImage} />
                <Text style={[styles.compareLabel, { color: palette.secondaryText }]}>Model focus</Text>
              </View>
            </View>
          </View>
        ) : null}

        {typeof result.uncertainty === 'number' ? (
          <View style={[styles.evidenceBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.riskHead}>
              <Text style={[styles.riskTitle, { color: palette.text }]}>Model Uncertainty</Text>
              <Text style={[styles.riskMeta, { color: palette.secondaryText }]}>{Math.round(result.uncertainty * 100)}%</Text>
            </View>
            <ProgressBar value={Math.round(result.uncertainty * 100)} color={result.uncertainty > 0.65 ? palette.warning : palette.teal} />
          </View>
        ) : null}

        {result.topPredictions?.length ? (
          <View style={[styles.evidenceBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.riskHead}>
              <Text style={[styles.riskTitle, { color: palette.text }]}>Top Predictions</Text>
              {result.reviewRequired ? <StatusPill label="Needs review" tone="amber" icon="warning-outline" /> : null}
            </View>
            <View style={styles.predictionList}>
              {result.topPredictions.map((item) => (
                <View key={item.condition} style={styles.predictionRow}>
                  <View style={styles.predictionLabelRow}>
                    <Text style={[styles.riskMeta, { color: palette.text }]}>{item.condition}</Text>
                    <Text style={[styles.riskMeta, { color: palette.secondaryText }]}>{Math.round(item.confidence * 100)}%</Text>
                  </View>
                  <ProgressBar value={Math.round(item.confidence * 100)} color={palette.primary} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.disclaimerBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.disclaimerText, { color: palette.secondaryText }]}>
            {isHealthy
              ? 'No visible issue was detected in this image. This is decision-support only, not a medical diagnosis.'
              : 'This result is for decision-support only and is not a medical diagnosis.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton disabled={saved} icon={saved ? 'checkmark-circle-outline' : 'bookmark-outline'} label={saved ? 'Saved to History' : 'Save to History'} onPress={handleSave} />
          {!isHealthy ? (
            <AppButton
              icon="shield-checkmark-outline"
              label="View Risk Analysis"
              onPress={() => navigation.navigate('RiskResult', { result })}
              variant="secondary"
            />
          ) : null}
          <AppButton icon="home-outline" label="Back to Dashboard" onPress={() => navigation.navigate('Dashboard')} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  webSafeArea: {
    height: '100vh' as never,
    overflow: 'hidden' as never,
  },
  scrollView: {
    flex: 1,
    height: '100%' as never,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  summaryCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    width: '100%',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    marginTop: 14,
    width: '100%',
  },
  previewImage: {
    borderRadius: 8,
    height: 104,
    width: 104,
  },
  summaryCopy: {
    flex: 1,
    gap: 7,
  },
  summaryPills: {
    alignItems: 'flex-start',
    gap: 7,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  condition: {
    fontSize: 19,
    fontWeight: '800',
  },
  disclaimerBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  riskBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  evidenceBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  explainBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginTop: 18,
    padding: 16,
    width: '100%',
  },
  explainHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageCompare: {
    flexDirection: 'row',
    gap: 12,
  },
  compareItem: {
    flex: 1,
    gap: 7,
  },
  explainImage: {
    aspectRatio: 1,
    borderRadius: 8,
    width: '100%',
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  riskTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  riskHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  riskMeta: {
    fontSize: 13,
    lineHeight: 19,
  },
  scoreBlock: {
    gap: 8,
    marginTop: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskAction: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  factorList: {
    gap: 9,
    marginTop: 14,
  },
  factorRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  factorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  predictionList: {
    gap: 8,
  },
  predictionRow: {
    gap: 7,
  },
  predictionLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    marginTop: 22,
    width: '100%',
  },
});
