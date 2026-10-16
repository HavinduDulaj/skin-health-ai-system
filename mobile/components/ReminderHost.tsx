import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";
import { dueReminders, snoozeReminder } from "../lib/progressStore";

export function ReminderHost() {
  const shown = useRef("");

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const due = await dueReminders();
        const first = due[0];
        if (!active || !first || shown.current === first.id) return;
        shown.current = first.id;
        Alert.alert("DermaSafe AI", "It's time for your skin follow-up check.", [
          { text: "Later", onPress: () => void snoozeReminder(first.id) },
          {
            text: "Check now",
            onPress: () =>
              router.push({ pathname: "/compare", params: { id: first.session_id } }),
          },
        ]);
      } catch {
        /* database not ready yet */
      }
    };
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return null;
}
