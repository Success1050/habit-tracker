import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#ccc" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "#f5f5f5",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: "#6200ee",
        tabBarInactiveTintColor: "#666666",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today's Habits",
          tabBarIcon: ({ color, size }) => {
            return (
              <MaterialCommunityIcons
                name="calendar-today"
                size={size}
                color={color}
              />
            );
          },
        }}
      />

      <Tabs.Screen
        name="streaks"
        options={{
          title: "Streaks",
          tabBarIcon: ({ color, size }) => {
            return (
              <MaterialCommunityIcons
                name="chart-line"
                size={size}
                color={color}
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="add-habit"
        options={{
          title: "Streaks",
          tabBarIcon: ({ color, size }) => {
            return (
              <MaterialCommunityIcons
                name="plus-circle"
                size={size}
                color={color}
              />
            );
          },
        }}
      />
    </Tabs>
  );
}
