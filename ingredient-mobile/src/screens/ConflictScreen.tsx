import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import ConflictCard from "../components/ConflictCard";
import PrimaryButton from "../components/PrimaryButton";
import { RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Conflict">;

export default function ConflictScreen({ route, navigation }: Props) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.phone}>
        <View style={styles.statusBar}>
          <Text style={styles.time}>9:41</Text>
          <Text style={styles.statusIcons}>LTE 100%</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{"<"}</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Ingredient Conflicts</Text>
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>!</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          These combinations may cause irritation or reduce tolerance.
        </Text>

        {route.params.conflicts.length === 0 ? (
          <Text style={styles.empty}>No conflicts detected.</Text>
        ) : (
          route.params.conflicts.slice(0, 3).map((conflict) => (
            <ConflictCard key={conflict} conflict={conflict} />
          ))
        )}

        <PrimaryButton title="Adjust Recommendations" onPress={() => navigation.goBack()} />
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8FF",
    marginBottom: 6,
  },
  back: {
    color: "#071033",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: "#070B25",
    fontSize: 22,
    fontWeight: "900",
  },
  alertBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  alertText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  subtitle: {
    color: "#263457",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 20,
  },
  empty: {
    color: "#166534",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 16,
    lineHeight: 20,
  },
});
