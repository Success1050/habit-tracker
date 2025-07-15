import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Card, Text } from "react-native-paper";

const Streaks = () => {
  type Habits = {
    id: number;
    user_id: string;
    title: string;
    description: string;
    streak_count: number;
    last_completed: string;
    frequency: string;
  };

  const [habits, setHabits] = useState<Habits[]>([]);
  const [username, setUsername] = useState<string>("");
  const [completedHabits, setCompletedHabits] = useState<any[]>([]);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const init = async () => {
      await fetchUser();
    };
    init();
  }, []);

  const fetchHabits = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user?.id);
      if (error) {
        console.log("an error occured");
        return;
      }
      setHabits(data as Habits[]);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error);
      }
    }
  };

  const fetchCompletions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("habit_completed")
        .select(`*, habits: id(title)`) // Using id as foreign key
        .eq("user_id", user?.id);
      if (error) {
        console.log(error);
      }
      console.log("Completed habits data:", data);
      setCompletedHabits(data ?? []);
    } catch (error) {
      console.log(error instanceof Error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("habit-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "habits",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log("habit added successfully");
          setHabits((prev) => [...prev, payload.new as Habits]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "habits",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log("updated successfully");
          setHabits((prev) =>
            prev.map((habit) =>
              habit.id === payload.new.id ? (payload.new as Habits) : habit
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "habits",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log("deleted successfully");
          setHabits((prev) =>
            prev.filter((habit) => habit.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    // For completed habits - listen to both INSERT and DELETE
    const completedHabitChannel = supabase
      .channel("completedHabits_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "habit_completed",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log("habit completion added successfully");
          setCompletedHabits((prev) => [...prev, payload.new]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "habit_completed",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log("habit completion deleted");
          setCompletedHabits((prev) =>
            prev.filter((completion) => completion.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    fetchHabits();
    fetchCompletions();

    // Cleanup subscription on unmount
    // return () => {
    //   supabase.removeChannel(channel);
    //   supabase.removeChannel(completedHabitChannel);
    // };
  }, [user?.id]);

  interface streakData {
    streak: number;
    bestStreak: number;
    total: number;
  }

  const getStreakData = (habitid: number): streakData => {
    // Filter completions using id (your foreign key) instead of habit_id
    const habitcompleted = completedHabits
      .filter((c) => c.id === habitid)
      .sort(
        (a, b) =>
          new Date(a.completed_at).getTime() -
          new Date(b.completed_at).getTime()
      );

    // console.log(`Completions for habit ${habitid}:`, habitcompleted);

    if (habitcompleted.length === 0) {
      return { streak: 0, bestStreak: 0, total: 0 };
    }

    let currentStreak = 1;
    let bestStreak = 1;
    let total = habitcompleted.length;

    // Calculate current streak (from most recent backwards)
    const today = new Date();
    const mostRecent = new Date(
      habitcompleted[habitcompleted.length - 1].completed_at
    );
    const daysSinceLastCompletion = Math.floor(
      (today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If last completion was more than 1 day ago, current streak is 0
    let streak = daysSinceLastCompletion <= 1 ? 1 : 0;

    // Calculate streaks
    for (let i = habitcompleted.length - 1; i > 0; i--) {
      const currentDate = new Date(habitcompleted[i].completed_at);
      const previousDate = new Date(habitcompleted[i - 1].completed_at);
      const diff = Math.floor(
        (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diff <= 1.5) {
        currentStreak += 1;
        if (i === habitcompleted.length - 1 && daysSinceLastCompletion <= 1) {
          streak = currentStreak;
        }
      } else {
        bestStreak = Math.max(bestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    bestStreak = Math.max(bestStreak, currentStreak);

    return { streak, bestStreak, total };
  };

  const habitStreak = habits.map((habit) => {
    const { streak, bestStreak, total } = getStreakData(habit.id);
    return { habit, bestStreak, streak, total };
  });

  // Sort by total completions (descending) for "most completed"
  const rankedHabits = habitStreak.sort((a, b) => b.total - a.total);

  // console.log("Habits ranked by completion count:");
  // console.log(
  //   rankedHabits.map((item) => `${item.habit.title}: ${item.total} completions`)
  // );

  const badgeStyles = [styles.badge1, styles.badge2, styles.badge3];

  return (
    <View style={styles.rankingContainer}>
      <Text variant="headlineSmall" style={styles.title}>
        Habit streaks
      </Text>
      {rankedHabits.length > 0 && (
        <View>
          <Text style={styles.rankingTitle}>
            <MaterialCommunityIcons name="medal" />
            Top streaks
          </Text>
          {rankedHabits.slice(0, 3).map((item, key) => (
            <View key={key} style={styles.rankingRow}>
              <View style={[styles.rankingBadge, badgeStyles[key]]}>
                <Text style={styles.rankingBadgeText}>{key + 1}</Text>
              </View>
              <Text style={styles.rankingHabit}>{item.habit.title}</Text>
              <Text style={styles.rankingStreak}>{item.bestStreak}</Text>
              {/* You can add content here to display top streaks */}
            </View>
          ))}
        </View>
      )}
      {habits.length === 0 ? (
        <View>
          <Text>No habits yet, AA your first habit</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.container}
        >
          {rankedHabits.map(({ habit, bestStreak, streak, total }, key) => (
            <Card
              key={habit.id}
              style={[styles.card, key === 0 && styles.firstcard]}
            >
              <Card.Content>
                <Text variant="titleMedium" style={styles.habitTitles}>
                  {habit.title}
                </Text>
                <Text style={styles.habitDescription}>{habit.description}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statbadge}>
                    <Text style={styles.statbadgeText}>
                      <MaterialCommunityIcons
                        name="fire"
                        size={18}
                        color={"#ff99800"}
                      />
                      {streak}
                    </Text>

                    <Text style={styles.statlabel}>current</Text>
                  </View>
                  <View style={styles.statbadgeGold}>
                    <Text style={styles.statbadgeText}>
                      <MaterialCommunityIcons
                        name="trophy"
                        size={18}
                        color={"#ff99800"}
                      />
                      {bestStreak}
                    </Text>
                    <Text style={styles.statlabel}>Best</Text>
                  </View>
                  <View style={styles.statbadgeGreen}>
                    <Text style={styles.statbadgeText}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color={"#00ff00"}
                      />
                      {total}
                    </Text>
                    <Text style={styles.statlabel}>Total</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default Streaks;

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 16,
  },
  card: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  firstcard: {
    borderWidth: 2,
    borderColor: "#7c4dff",
  },
  habitTitles: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 2,
  },

  habitDescription: {
    color: "#6c6c80",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  statbadge: {
    backgroundColor: "#fff3e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statbadgeGold: {
    backgroundColor: "#fffde7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statbadgeGreen: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statbadgeText: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#2223b",
  },

  statlabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
    fontWeight: "500",
  },

  rankingContainer: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: "16",
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  rankingTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 12,
    color: "#7c4dff",
    letterSpacing: 0.5,
  },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8,
  },

  rankingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignContent: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#e0e0e0",
  },

  badge1: {
    backgroundColor: "#ffd700",
  },
  badge2: {
    backgroundColor: "#c0c0c0",
  },
  badge3: {
    backgroundColor: "#cd7f32",
  },

  rankingBadgeText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
  },

  rankingHabit: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: 600,
  },

  rankingStreak: {
    fontSize: 14,
    color: "7c4dff",
    fontWeight: "bold",
  },
});
