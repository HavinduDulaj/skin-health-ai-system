import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "IngredientDetail">;

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#0F62D9" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function IngredientDetailScreen({ route, navigation }: Props) {
  const { ingredient } = route.params;

  function handleShare() {
    Share.share({
      message: `${ingredient.name}: ${ingredient.productType}, ${ingredient.percentage}. Benefits: ${ingredient.benefits.join(", ")}.`,
    });
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back-outline" size={22} color="#102033" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#0F62D9" />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.ingredientIcon}>
          <Ionicons name="flask-outline" size={28} color="#12805C" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.title}>{ingredient.name}</Text>
          <Text style={styles.subtitle}>{ingredient.productType}</Text>
          <View style={styles.recommendBadge}>
            <Text style={styles.recommendBadgeText}>Top recommendation</Text>
          </View>
        </View>
      </View>

      <View style={styles.gaugeCard}>
        <Text style={styles.cardTitle}>Model score</Text>
        <View style={styles.gauge}>
          <Text style={styles.gaugeValue}>{ingredient.confidence}%</Text>
          <Text style={styles.gaugeLabel}>
            Research ranking score, not clinical certainty
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoTile icon="cube-outline" label="Product Type" value={ingredient.productType} />
        <InfoTile icon="calendar-outline" label="Recommended Usage" value={ingredient.percentage} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Key Benefits</Text>
        {ingredient.benefits.map((benefit) => (
          <View key={benefit} style={styles.listRow}>
            <Ionicons name="checkmark-circle-outline" size={17} color="#12805C" />
            <Text style={styles.listText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Factors</Text>
        <View style={styles.factorWrap}>
          {ingredient.profileFactorsConsidered.map((factor) => (
            <View key={factor} style={styles.factorChip}>
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cautionCard}>
        <Text style={styles.cautionTitle}>Cautions</Text>
        {ingredient.cautions.length > 0 ? (
          ingredient.cautions.map((caution) => (
            <View key={caution} style={styles.listRow}>
              <Ionicons name="warning-outline" size={17} color="#E08A1E" />
              <Text style={styles.cautionText}>{caution}</Text>
            </View>
          ))
        ) : (
          <View style={styles.listRow}>
            <Ionicons name="warning-outline" size={17} color="#E08A1E" />
            <Text style={styles.cautionText}>Patch test before regular use and introduce slowly.</Text>
          </View>
        )}
      </View>

      <Text style={styles.disclaimer}>This is general skincare guidance and not a medical diagnosis.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F6FAFC" },
  content: { padding: 18, paddingBottom: 34, width: '100%', maxWidth: 960, alignSelf: 'center' },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  ingredientIcon: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  heroCopy: { flex: 1 },
  title: { color: "#102033", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#526376", fontSize: 13, fontWeight: "700", marginTop: 4 },
  recommendBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recommendBadgeText: { color: "#12805C", fontSize: 11, fontWeight: "900" },
  gaugeCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
  },
  cardTitle: { color: "#102033", fontSize: 16, fontWeight: "900", marginBottom: 12 },
  gauge: {
    alignItems: "center",
    borderColor: "#14A39A",
    borderTopWidth: 12,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 2,
    borderRadius: 120,
    height: 132,
    justifyContent: "center",
    width: 210,
  },
  gaugeValue: { color: "#12805C", fontSize: 36, fontWeight: "900" },
  gaugeLabel: { color: "#526376", fontSize: 13, fontWeight: "800", marginTop: 2 },
  infoGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
  infoTile: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    marginBottom: 8,
    width: 34,
  },
  infoLabel: { color: "#526376", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  infoValue: { color: "#102033", fontSize: 13, fontWeight: "800", lineHeight: 18, marginTop: 3 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  listRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, marginTop: 7 },
  listText: { color: "#102033", flex: 1, fontSize: 13, lineHeight: 19 },
  factorWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  factorChip: { backgroundColor: "#EAF3FF", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  factorText: { color: "#0F62D9", fontSize: 11, fontWeight: "800" },
  cautionCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  cautionTitle: { color: "#9A3412", fontSize: 16, fontWeight: "900", marginBottom: 8 },
  cautionText: { color: "#7C2D12", flex: 1, fontSize: 13, lineHeight: 19 },
  disclaimer: { color: "#64748B", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
});
