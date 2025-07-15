import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Button, Surface, Text } from "react-native-paper";

export default function Index() {
  type Habits = {
    id: number;
    user_id: string;
    title: string;
    description: string;
    streak_count: number;
    last_completed: Text;
    frequency: string;
  };
  const signOut = useAuthStore(({ signOut }) => signOut);
  const user = useAuthStore((state) => state.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const router = useRouter();
  const [habits, setHabits] = useState<Habits[]>([]);
  const [username, setUsername] = useState<string>("");
  const [completedHabits, setCompletedHabits] = useState<string[]>([]);

  const swipeablerefs = useRef<{ [key: string]: Swipeable | null }>({});

  useEffect(() => {
    const init = async () => {
      await fetchUser();
    };
    init();
  }, [user?.id]);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("userProfile")
          .select("*")
          .eq("user_id", user?.id)
          .single<{ username: string }>();
        if (error) {
          console.log(error);
        }
        if (data && data.username) {
          setUsername(data.username);
        }
      } catch (error) {}
    };
    if (!user?.id) return;
    fetchUsername();
  }, [user?.id]);

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
      // console.log(data);

      setHabits(data as Habits[]);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchHabits();

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

    // For completed habits

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
          console.log("habit added successfully");
          setCompletedHabits((prev) => [...prev, payload.new.id]);
        }
      )
      .subscribe();

    fetchHabits();
    fetchTodaysHabitCompletion();
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(completedHabitChannel);
    };
  }, [user?.id]);

  const isCompletedHabit = (habitid: number) => {
    return completedHabits?.includes(habitid.toString());
  };

  const signOutFunc = async () => {
    try {
      await signOut();
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.replace("/auth");
        console.log("User signed out successfully");
      }, 100);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteHabit = async (id: number) => {
    if (id) {
      setHabits((prev) => prev.filter((habit) => habit.id !== id));
    }
    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) return;
    } catch (error) {
      console.log(error as Error);
    }
  };

  const fetchTodaysHabitCompletion = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("habit_completed")
        .select(`*, habits: id(title)`)
        .eq("user_id", user?.id)
        .gt("completed_at", today.toISOString());
      if (error) {
        console.log(error);
      }
      console.log(data);

      setCompletedHabits(
        data ? data.map((item: any) => item.id.toString()) : []
      );
    } catch (error) {
      console.log(error instanceof Error);
    }
  };

  const handleCompleteHabit = async (id: number) => {
    if (!user?.id || completedHabits.includes(id.toString())) return;
    try {
      const currentDate = new Date().toISOString();
      const { data, error } = await supabase
        .from("habit_completed")
        .insert({
          id: id,
          user_id: user?.id,
          completed_at: currentDate,
        })
        .select();
      if (error) return;
      const habit = habits.find((habit) => habit.id === id);
      if (!habit) return;

      const { data: habitdata, error: habiterror } = await supabase
        .from("habits")
        .update({
          streak_count: habit.streak_count + 1,
          last_completed: currentDate,
        })
        .eq("id", id);
      if (habiterror) {
        console.log(habiterror);
      }
    } catch (error) {
      console.log(error instanceof Error);
    }
  };

  const renderRightActions = (habitid: number) => {
    return (
      <View style={styles.swipActionRight}>
        {isCompletedHabit(habitid) ? (
          <Text style={{ color: "#fff" }}>Completed</Text>
        ) : (
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={24}
            color={"#fff"}
          />
        )}
      </View>
    );
  };

  const renderLeftActions = () => {
    return (
      <View style={styles.swipActionLeft}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={24}
          color={"#fff"}
        />
      </View>
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {user ? (
          <Text>Welcome {username.split(" ")[0]}</Text>
        ) : (
          <Link href="/auth">
            <Text>Click to login</Text>
          </Link>
        )}
        <View>
          <Text variant="headlineSmall" style={styles.title}>
            Today's Habit
          </Text>
        </View>

        {user ? (
          <Button mode="text" onPress={signOutFunc}>
            <Text>Signout</Text>
          </Button>
        ) : (
          <></>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {habits?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text>No habits,</Text>
            <Link href="/add-habit">
              <Text style={styles.emptyStateText}>Click to add habits</Text>
            </Link>
          </View>
        ) : (
          habits.map((habit) => {
            const {
              id,
              title,
              description,
              frequency,
              last_completed,
              streak_count,
            } = habit;
            return (
              <Swipeable
                ref={(ref) => {
                  swipeablerefs.current[habit.id] = ref;
                }}
                key={id}
                overshootLeft={false}
                overshootRight={false}
                renderLeftActions={renderLeftActions}
                renderRightActions={() => renderRightActions(id)}
                onSwipeableOpen={(direction) => {
                  if (direction === "left") {
                    handleDeleteHabit(id);
                  } else if (direction === "right") {
                    handleCompleteHabit(id);
                  }

                  swipeablerefs.current[habit?.id]?.close();
                }}
              >
                <Surface
                  style={[
                    styles.card,
                    isCompletedHabit(id) && styles.cardCompleted,
                  ]}
                  elevation={0}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.carddesc}>{description}</Text>
                    <View style={styles.cardfooter}>
                      <View style={styles.streakBadge}>
                        <MaterialCommunityIcons
                          name="fire"
                          size={18}
                          color={"#ff99800"}
                        />
                        <Text style={styles.streaktext}>
                          {streak_count} day streak
                        </Text>
                      </View>
                      <View style={styles.frequencybadge}>
                        <Text style={styles.frequencytext}>
                          {frequency.charAt(0).toUpperCase() +
                            frequency.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Surface>
              </Swipeable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "bold",
  },
  card: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#f7f2fa",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#22223b",
  },
  carddesc: {
    fontSize: 15,
    marginBottom: 16,
    color: "#6c6c80",
  },
  cardfooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streaktext: {
    marginLeft: 6,
    color: "#ff9800",
    fontWeight: "bold",
    fontSize: 14,
  },

  frequencybadge: {
    backgroundColor: "#ede7f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  frequencytext: {
    color: "#7c4dff",
    fontWeight: "bold",
    fontSize: 14,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
  },
  emptyStateText: {
    color: "#666666",
  },

  swipActionLeft: {
    justifyContent: "center",
    alignItems: "flex-start",
    flex: 1,
    backgroundColor: "#e53935",
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingLeft: 16,
  },
  swipActionRight: {
    justifyContent: "center",
    alignItems: "flex-end",
    flex: 1,
    backgroundColor: "#4caf50",
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingRight: 16,
  },
  cardCompleted: {
    opacity: 0.5,
  },
});
