import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ingredient } from "../types/types";

interface IngredientCardProps {
  ingredient: Ingredient;
  onPress?: () => void;
  rank?: number;
}

function getAccentColor(name: string) {
  if (name === "Niacinamide") {
    return "#00A6A6";
  }
  if (name === "Azelaic Acid" || name === "Centella Asiatica") {
    return "#2BBFA8";
  }
  if (name === "Adapalene") {
    return "#7C3AED";
  }
  if (name === "Benzoyl Peroxide") {
    return "#2F7DFF";
  }
  return "#0F66FF";
}

export default function IngredientCard({
  ingredient,
  onPress,
  rank,
}: IngredientCardProps) {
  const accentColor = getAccentColor(ingredient.name);
  const displayRank =
    rank ?? (ingredient.confidence >= 90 ? 1 : ingredient.confidence >= 85 ? 2 : 3);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.rank}>
        <Text style={styles.rankText}>{displayRank}</Text>
      </View>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <View style={[styles.bottleCap, { backgroundColor: accentColor }]} />
          <View
            style={[
              styles.bottle,
              {
                backgroundColor: `${accentColor}2B`,
                borderColor: accentColor,
              },
            ]}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{ingredient.name}</Text>
          <Text style={styles.meta}>{ingredient.productType}</Text>
          <Text style={styles.percentage}>
            {ingredient.percentage}
            <Text style={styles.confidence}>  Confidence: {ingredient.confidence}%</Text>
          </Text>
          <Text style={styles.benefit}>{ingredient.benefits[0]}</Text>
        </View>
        <Text style={styles.chevron}>{">"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 11,
    borderColor: "#DCE3F0",
    borderWidth: 1,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  rank: {
    position: "absolute",
    left: -1,
    top: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#13B84A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  rankText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F2F8FF",
    borderColor: "#CFE1FF",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottleCap: {
    width: 13,
    height: 9,
    borderRadius: 3,
    marginBottom: -1,
  },
  bottle: {
    width: 24,
    height: 36,
    borderRadius: 6,
    borderWidth: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#070B25",
    fontSize: 15,
    fontWeight: "900",
  },
  meta: {
    color: "#0057FF",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  percentage: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
    lineHeight: 17,
  },
  confidence: {
    color: "#13A538",
  },
  chevron: {
    color: "#071033",
    fontSize: 20,
    fontWeight: "800",
  },
  benefit: {
    color: "#111827",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
});
