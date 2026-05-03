import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import ResultCard from '../components/ResultCard';
import { useThemeContext } from '../context/ThemeContext';
import { storageService } from '../services/storageService';
import type { ScreenProps } from '../types';

export default function ResultScreen({ navigation, route }: ScreenProps<'Result'>) {
  const { palette } = useThemeContext();
  const [saved, setSaved] = useState(false);
  const { result } = route.params;

  const handleSave = async () => {
    await storageService.addHistoryItem(result);
    setSaved(true);
    Alert.alert('Saved', 'This scan has been added to your history.');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: palette.text }]}>Result</Text>
        {result.imageUri ? <Image source={{ uri: result.imageUri }} style={styles.previewImage} /> : null}
        <ResultCard result={result} />

        <View style={[styles.disclaimerBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.disclaimerText, { color: palette.secondaryText }]}>
            This result is for decision-support only and is not a medical diagnosis.
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton disabled={saved} label={saved ? 'Saved to History' : 'Save to History'} onPress={handleSave} />
          <AppButton label="Back to Dashboard" onPress={() => navigation.navigate('Dashboard')} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 18,
    marginTop: 10,
  },
  previewImage: {
    borderRadius: 24,
    height: 170,
    marginBottom: 18,
    width: '100%',
  },
  disclaimerBox: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
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
