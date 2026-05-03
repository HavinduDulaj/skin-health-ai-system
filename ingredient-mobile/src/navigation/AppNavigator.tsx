import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AvoidScreen from "../screens/AvoidScreen";
import ChatScreen from "../screens/ChatScreen";
import ConflictScreen from "../screens/ConflictScreen";
import IngredientDetailScreen from "../screens/IngredientDetailScreen";
import RecommendationScreen from "../screens/RecommendationScreen";
import ReportScreen from "../screens/ReportScreen";
import { RootStackParamList } from "../types/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Recommendation"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F8FBFF" },
          }}
        >
          <Stack.Screen
            name="Recommendation"
            component={RecommendationScreen}
            options={{ title: "Ingredient Recommendation" }}
          />
          <Stack.Screen
            name="Avoid"
            component={AvoidScreen}
            options={{ title: "Avoid Ingredients" }}
          />
          <Stack.Screen
            name="Conflict"
            component={ConflictScreen}
            options={{ title: "Conflicts" }}
          />
          <Stack.Screen
            name="IngredientDetail"
            component={IngredientDetailScreen}
            options={{ title: "Ingredient Detail" }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: "Rebeka" }}
          />
          <Stack.Screen
            name="Report"
            component={ReportScreen}
            options={{ title: "Final Report" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
