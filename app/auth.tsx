import { useAuthStore } from "@/lib/store";
import { useRouter } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";

const AuthScreen = () => {
  const [currentState, setCurrentState] = React.useState<string>("login"); // "login" or "signup"
  const [email, setemail] = React.useState<string>(""); // "login" or "signup"
  const [username, setusername] = React.useState<string>(""); // "login" or "signup"
  const [password, setpassword] = React.useState<string>(""); // "login" or "signup"
  const [errors, seterrors] = React.useState<string | null>(""); // "login" or "signup"
  const { signIn, signUp } = useAuthStore();
  const router = useRouter();

  const handleAuth = () => {
    if (currentState === "login") {
      if (!email || !password) {
        seterrors("Please enter email and password");
        return;
      }

      if (password.length < 6) {
        seterrors("Password must be at least 6 characters long");
        return;
      }

      seterrors(null); // Clear errors if validation passes
      // Handle login logic

      signIn(email, password)
        .then((error) => {
          if (error) {
            seterrors(error);
          } else {
            router.replace("/");
            // Navigate to the mainn app or home screen
            console.log("Login successful");
          }
        })
        .catch((err) => {
          seterrors(err.message);
        });
      console.log("Logging in with", { email, password });
    } else {
      // Handle signup logic
      if (!email || !password || !username) {
        seterrors("Please fill in all fields");
        return;
      }

      if (password.length < 6) {
        seterrors("Password must be at least 6 characters long");
        return;
      }

      seterrors(null); // Clear errors if validation passes
      signUp(username, email, password)
        .then((error) => {
          if (error) {
            seterrors(error);
          } else {
            router.replace("/");
            // Navigate to the main app or home screen
            console.log("Signup successful");
          }
        })
        .catch((err) => {
          seterrors(err.message);
        });
      console.log("Signing up with", { username, email, password });
    }
  };
  const theme = useTheme();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title} variant="headlineMedium">
          {currentState === "login" ? "Welcome back" : "Create Account"}
        </Text>
        {currentState === "login" ? (
          <></>
        ) : (
          <TextInput
            style={styles.input}
            // value={username}
            onChangeText={setusername}
            label="Name"
            autoCapitalize="none"
            placeholder="John Doe"
            keyboardType="default"
            mode="outlined"
          />
        )}
        <TextInput
          style={styles.input}
          onChangeText={setemail}
          label="Email"
          // value={email}
          autoCapitalize="none"
          placeholder="example@gmail.com"
          keyboardType="email-address"
          mode="outlined"
        />
        <TextInput
          style={styles.input}
          // value={password}
          onChangeText={setpassword}
          label="Password"
          autoCapitalize="none"
          placeholder="********"
          secureTextEntry={true}
          mode="outlined"
        />

        {errors && (
          <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
            {errors}
          </Text>
        )}

        <Button mode="contained" style={styles.button} onPress={handleAuth}>
          {currentState === "login" ? "Sign In" : "Sign Up"}
        </Button>

        <Button
          style={styles.switchModeButton}
          mode="text"
          onPress={() =>
            setCurrentState(currentState === "login" ? "signup" : "login")
          }
        >
          <Text>
            {currentState === "login"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </Text>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  title: {
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  switchModeButton: {
    marginTop: 16,
  },
});
