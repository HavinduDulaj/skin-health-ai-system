import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";
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
  const { palette } = useThemeContext();
  const accentColor = getAccentColor(ingredient.name);
  const displayRank =
    rank ?? (ingredient.confidence >= 90 ? 1 : ingredient.confidence >= 85 ? 2 : 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${ingredient.name}, model score ${ingredient.confidence} percent`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          shadowColor: palette.shadow,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.rank, { backgroundColor: accentColor }]}>
        <Text style={styles.rankText}>{displayRank}</Text>
      </View>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}55` }]}>
          <Ionicons name="leaf-outline" size={26} color={accentColor} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: palette.text }]}>{ingredient.name}</Text>
          <Text style={[styles.meta, { color: palette.primary }]}>{ingredient.productType}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.percentage, { color: palette.text }]}>{ingredient.percentage}</Text>
            <Text style={[styles.confidence, { color: palette.success, backgroundColor: palette.surface }]}>
              {ingredient.confidence}% model score
            </Text>
          </View>
          <Text style={[styles.benefit, { color: palette.secondaryText }]}>{ingredient.benefits[0]}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={18} color={palette.secondaryText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
    backgroundColor: "#F2F8FF",
    borderColor: "#CFE1FF",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#102033",
    fontSize: 15,
    fontWeight: "900",
  },
  meta: {
    color: "#0F62D9",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  percentage: {
    color: "#102033",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
    lineHeight: 17,
  },
  confidence: {
    color: "#12805C",
    backgroundColor: "#E8F7F0",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  benefit: {
    color: "#111827",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5,
  },
});
