import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import WarningCard from "../components/WarningCard";
import { RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Avoid">;

export default function AvoidScreen({ route, navigation }: Props) {
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
          <Text style={styles.title}>Avoid Ingredients</Text>
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>!</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          These ingredients may not be suitable for your selected profile.
        </Text>

        {route.params.avoid.map((item) => (
          <WarningCard key={item.name} item={item} />
        ))}

        <View style={styles.note}>
          <View style={styles.infoCircle}>
            <Text style={styles.infoText}>i</Text>
          </View>
          <Text style={styles.noteText}>
            Note: Always patch test new products before regular use.
          </Text>
        </View>
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
    backgroundColor: "#FF3B30",
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
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },
  note: {
    backgroundColor: "#F4F9FF",
    borderColor: "#D8E7FF",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: "#0057FF",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    color: "#0057FF",
    fontWeight: "900",
  },
  noteText: {
    flex: 1,
    color: "#070B25",
    lineHeight: 19,
  },
});
