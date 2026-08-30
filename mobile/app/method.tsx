import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { Card, Screen, Title } from "../components/ui";
import { fetchResearch } from "../lib/api";
import { colors, spacing } from "../lib/theme";

export default function MethodScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchResearch()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.sage} />
      </Screen>
    );
  }

  const method = data?.method || {};
  const contributions = (data?.contributions || []) as Array<{ title: string; summary: string }>;
  const architecture = (data?.architecture || []) as Array<{ title: string; summary: string }>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Research method</Title>
        {method.problem ? <Text style={styles.body}>{method.problem}</Text> : null}
        {method.model ? <Text style={styles.body}>{method.model}</Text> : null}

        {(method.pipeline || []).map((step: string) => (
          <Text key={step} style={styles.step}>
            • {step}
          </Text>
        ))}

        {contributions.map((item) => (
          <Card key={item.title}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.summary}</Text>
          </Card>
        ))}

        {architecture.map((item, idx) => (
          <Card key={item.title}>
            <Text style={styles.cardTitle}>
              {String(idx + 1).padStart(2, "0")} · {item.title}
            </Text>
            <Text style={styles.body}>{item.summary}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  body: { color: colors.muted, lineHeight: 22 },
  step: { color: colors.muted, lineHeight: 22 },
  cardTitle: { color: colors.ink, fontWeight: "700" },
});
