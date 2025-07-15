import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const FREQUENCIES = ["daily", "weekly", "monthly"];

const AddHabit = () => {
  type Frequency = (typeof FREQUENCIES)[number];
  const [title, setTitle] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [frequency, setFrequency] = React.useState<Frequency>("daily");
  const [error, seterror] = useState("");
  const [success, setsuccess] = useState("");
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    const getUser = async () => {
      await fetchUser();
    };
    getUser();
  }, []);

  const handleSubmit = async () => {
    // if (!user?.id) return;
    if (!user) {
      console.log("please login");
      router.push("/auth");
      return;
    } else if (!title || !description || !frequency) {
      console.log("Please fill in all fields");
      return;
    }
    // if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("habits")
        .insert({
          user_id: user.id,
          title: title,
          description: description,
          streak_count: 0,
          last_completed: new Date().toISOString(),
          frequency: frequency,
        })
        .select();

      if (error) {
        console.log(error.message);
        return;
      }
      setsuccess("Habit added successfully");

      setTitle("");
      setDescription("");
      setFrequency("");
      setsuccess("");
      router.back();
      // console.log("Habit added successfully:", data);
    } catch (error) {
      if (error instanceof Error) {
        seterror(error.message);
        return;
      }
      seterror("there was an error creating habit");
      console.error("there was an error creating habit:", error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="title"
        mode="outlined"
        style={styles.input}
        onChangeText={setTitle}
        value={title}
      />
      <TextInput
        label="Description"
        mode="outlined"
        style={styles.input}
        onChangeText={setDescription}
        value={description}
      />
      <View style={styles.frequencyContainer}>
        <SegmentedButtons
          value={frequency}
          onValueChange={(value) => setFrequency(value as Frequency)}
          buttons={FREQUENCIES.map((days) => ({
            value: days,
            label: days.charAt(0).toUpperCase() + days.slice(1),
          }))}
        />
      </View>
      <Button
        mode="contained"
        disabled={!title || !description || !frequency}
        onPress={handleSubmit}
      >
        Add Habit
      </Button>
      {error ? (
        <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
          {error}
        </Text>
      ) : (
        <Text style={{ color: theme.colors.primary, marginBottom: 16 }}>
          {success}
        </Text>
      )}
    </View>
  );
};

export default AddHabit;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5", // Dark background color
    // Your desired background color
  },
  input: {
    marginBottom: 16,
  },
  frequencyContainer: {
    marginBottom: 24,
  },
});
