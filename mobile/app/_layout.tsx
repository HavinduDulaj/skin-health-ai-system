import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "../context/AppContext";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ title: "DermaSafe AI" }} />
        <Stack.Screen name="enter" options={{ title: "Session" }} />
        <Stack.Screen name="assess" options={{ title: "Screening" }} />
        <Stack.Screen name="result" options={{ title: "Result" }} />
        <Stack.Screen name="guidance" options={{ title: "Guidance" }} />
        <Stack.Screen name="report" options={{ title: "Report" }} />
        <Stack.Screen name="lab" options={{ title: "Lab" }} />
        <Stack.Screen name="method" options={{ title: "Method" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
      </Stack>
    </AppProvider>
  );
}
