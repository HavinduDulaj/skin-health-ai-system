import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "IngredientDetail">;

export default function IngredientDetailScreen({ route, navigation }: Props) {
  const { ingredient } = route.params;

  function handleShare() {
    Share.share({
      message: `${ingredient.name}: ${ingredient.productType}, ${ingredient.percentage}. Benefits: ${ingredient.benefits.join(", ")}.`,
    });
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.phone}>
        <View style={styles.statusBar}>
          <Text style={styles.time}>9:41</Text>
          <Text style={styles.statusIcons}>LTE 100%</Text>
        </View>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{"<"}</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {ingredient.name}
          </Text>
          <Pressable style={styles.iconButton} onPress={handleShare}>
            <Text style={styles.share}>{"^"}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.dropperCap} />
          <View style={styles.dropper} />
          <View style={styles.bottle}>
            <Text style={styles.bottleText}>{ingredient.confidence}%</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Product Type</Text>
            <Text style={styles.infoValue}>{ingredient.productType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Recommended Usage</Text>
            <Text style={styles.infoValue}>{ingredient.percentage}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Confidence</Text>
            <Text style={styles.goodValue}>{ingredient.confidence}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          {ingredient.benefits.map((benefit) => (
            <Text key={benefit} style={styles.bullet}>
              OK {benefit}
            </Text>
          ))}
        </View>

        <View style={styles.cautionBox}>
          <Text style={styles.cautionTitle}>Caution</Text>
          {ingredient.cautions.length > 0 ? (
            ingredient.cautions.map((caution) => (
              <Text key={caution} style={styles.body}>
                ! {caution}
              </Text>
            ))
          ) : (
            <Text style={styles.body}>
              Introduce slowly and avoid combining with strong actives unless advised by a professional.
            </Text>
          )}
        </View>

        <Text style={styles.disclaimer}>
          This is general skincare guidance and not a medical diagnosis.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  phone: {
    width: "100%",
    maxWidth: 390,
    minHeight: 620,
    backgroundColor: "#FFFFFF",
    borderColor: "#CED6E4",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    paddingTop: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  time: {
    color: "#030720",
    fontWeight: "800",
  },
  statusIcons: {
    color: "#030720",
    fontSize: 11,
    fontWeight: "700",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8FF",
  },
  back: {
    color: "#071033",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  title: {
    color: "#070B25",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },
  share: {
    color: "#0057FF",
    fontSize: 18,
    fontWeight: "900",
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    height: 170,
  },
  dropperCap: {
    width: 18,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EEF2F7",
    borderColor: "#CBD5E1",
    borderWidth: 1,
  },
  dropper: {
    width: 8,
    height: 34,
    backgroundColor: "#D6DEE9",
  },
  bottle: {
    width: 82,
    height: 98,
    borderRadius: 16,
    backgroundColor: "#36B8EE",
    borderColor: "#168BD8",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#168BD8",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  bottleText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  infoCard: {
    backgroundColor: "#F8FBFF",
    borderColor: "#E1EAFA",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomColor: "#E7EEF9",
    borderBottomWidth: 1,
  },
  infoLabel: {
    color: "#070B25",
    fontSize: 12,
    fontWeight: "800",
  },
  infoValue: {
    color: "#263457",
    fontSize: 12,
    maxWidth: "52%",
    textAlign: "right",
  },
  goodValue: {
    color: "#13A538",
    fontSize: 12,
    fontWeight: "900",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#070B25",
    fontWeight: "900",
    marginBottom: 8,
  },
  body: {
    color: "#334155",
    lineHeight: 21,
  },
  bullet: {
    color: "#0F7B2B",
    lineHeight: 22,
    fontWeight: "700",
  },
  cautionBox: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cautionTitle: {
    color: "#C76A00",
    fontWeight: "900",
    marginBottom: 6,
  },
  disclaimer: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
});
