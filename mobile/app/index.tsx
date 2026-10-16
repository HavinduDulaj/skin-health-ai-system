import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Eyebrow,
  GhostButton,
  PrimaryButton,
  Screen,
  Title,
  TitleEm,
  TrustList,
} from "../components/ui";
import { colors, fonts, spacing } from "../lib/theme";

const LINKS: Array<{
  label: string;
  href: "/guidance" | "/report" | "/history" | "/progress" | "/lab" | "/method";
}> = [
  { label: "Guidance", href: "/guidance" },
  { label: "Report", href: "/report" },
  { label: "How it works", href: "/method" },
  { label: "History", href: "/history" },
  { label: "Progress", href: "/progress" },
  { label: "Lab", href: "/lab" },
];

export default function HomeScreen() {
  return (
    <Screen style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Skin risk screening</Eyebrow>
        <Title>
          Check a skin concern{"\n"}
          <TitleEm>in a few steps.</TitleEm>
        </Title>
        <Body>
          Take a clear photo. We estimate <Text style={styles.strong}>Low</Text>,{" "}
          <Text style={styles.strong}>Medium</Text>, or <Text style={styles.strong}>High</Text>{" "}
          risk for acne, burns, rash, or warts — and may ask you to retake a blurry
          shot.
        </Body>

        <View style={styles.actions}>
          <PrimaryButton label="Start screening" onPress={() => router.push("/enter")} />
          <GhostButton label="How it works" onPress={() => router.push("/method")} />
        </View>

        <TrustList
          items={["Quality-checked photos", "May abstain when unsure", "Not a diagnosis"]}
        />

        <View style={styles.nav}>
          {LINKS.map((item) => (
            <Pressable key={item.href} onPress={() => router.push(item.href)}>
              <Text style={styles.navLink}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: spacing.lg },
  scroll: { gap: spacing.md, paddingBottom: 48 },
  strong: { fontFamily: fonts.sansSemi, color: colors.ink },
  actions: { gap: spacing.sm, marginTop: 4 },
  nav: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingTop: 4,
  },
  navLink: {
    color: colors.muted,
    fontFamily: fonts.sansMed,
    fontSize: 15,
  },
});
