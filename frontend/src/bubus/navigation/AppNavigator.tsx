import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useThemeContext } from "../../context/ThemeContext";
import { Member3ExitContext } from "./Member3ExitContext";
import AvoidScreen from "../screens/AvoidScreen";
import ChatScreen from "../screens/ChatScreen";
import ConflictScreen from "../screens/ConflictScreen";
import IngredientKnowledgeBaseScreen from "../screens/IngredientKnowledgeBaseScreen";
import IngredientDetailScreen from "../screens/IngredientDetailScreen";
import RecommendationScreen from "../screens/RecommendationScreen";
import ReportScreen from "../screens/ReportScreen";
import { RootStackParamList, UserProfile } from "../types/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  initialProfile: UserProfile;
  onExit?: () => void;
}

export default function AppNavigator({ initialProfile, onExit }: AppNavigatorProps) {
  const { palette } = useThemeContext();

  return (
    <Member3ExitContext.Provider value={onExit}>
      <NavigationIndependentTree>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Recommendation"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.background },
            }}
          >
            <Stack.Screen
              name="Recommendation"
              component={RecommendationScreen}
              initialParams={{ profile: initialProfile }}
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
              name="IngredientKnowledgeBase"
              component={IngredientKnowledgeBaseScreen}
              options={{ title: "Ingredient Knowledge Base" }}
            />
            <Stack.Screen
              name="Report"
              component={ReportScreen}
              options={{ title: "Final Report" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    </Member3ExitContext.Provider>
  );
}
