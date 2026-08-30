import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { BrandTitle } from "../components/ui";
import { AppProvider } from "../context/AppContext";
import { colors, fonts } from "../lib/theme";

const header = {
  headerStyle: { backgroundColor: colors.paper },
  headerTintColor: colors.ink,
  headerShadowVisible: false,
  headerTitleStyle: {
    fontFamily: fonts.serifSemi,
    fontSize: 17,
    color: colors.ink,
  },
  headerBackTitle: "Back",
  headerBackTitleStyle: { fontFamily: fonts.sansMed, fontSize: 15 },
  contentStyle: { backgroundColor: colors.paper },
} as const;

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_400Regular: require("../assets/fonts/Fraunces_400Regular.ttf"),
    Fraunces_400Regular_Italic: require("../assets/fonts/Fraunces_400Regular_Italic.ttf"),
    Fraunces_600SemiBold: require("../assets/fonts/Fraunces_600SemiBold.ttf"),
    InstrumentSans_400Regular: require("../assets/fonts/InstrumentSans_400Regular.ttf"),
    InstrumentSans_500Medium: require("../assets/fonts/InstrumentSans_500Medium.ttf"),
    InstrumentSans_600SemiBold: require("../assets/fonts/InstrumentSans_600SemiBold.ttf"),
  });

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={header}>
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => <BrandTitle />,
            headerTitleAlign: "left",
          }}
        />
        <Stack.Screen name="enter" options={{ title: "Get started" }} />
        <Stack.Screen name="assess" options={{ title: "Photo" }} />
        <Stack.Screen name="result" options={{ title: "Results" }} />
        <Stack.Screen name="guidance" options={{ title: "Guidance" }} />
        <Stack.Screen name="report" options={{ title: "Report" }} />
        <Stack.Screen name="lab" options={{ title: "Lab" }} />
        <Stack.Screen name="method" options={{ title: "How it works" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
      </Stack>
    </AppProvider>
  );
}
