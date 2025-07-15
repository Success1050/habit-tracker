import { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "./supabase";

type AuthContextType = {
  user: User | null;
  signUp: (
    username: string,
    email: string,
    password: string
  ) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  //   signOut: () => Promise<void>;
  fetchUser: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthContextType>((set) => ({
  user: null,
  signUp: async (username: string, email: string, password: string) => {
    // Implement signUp logic here
    try {
      // Assuming you have a function to create a user in your auth system
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) {
        throw error;
      }

      const user = data.user;
      if (user) {
        const { data, error: profile_error } = await supabase
          .from("userProfile")
          .insert({
            user_id: user.id,
            username: username,
          });

        if (profile_error) {
          throw profile_error;
        }
      }
      set({ user: data.user });
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }

      return "An unexpected error occurred during signup";
    }
  },
  signIn: async (email, password) => {
    // Implement signIn logic here
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }

      return "An unexpected error occurred during signin";
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
    return;
  },

  fetchUser: async () => {
    try {
      const { data: user, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      set({ user: user.user });
      return null;
    } catch (error) {
      if (error instanceof Error) {
        set({ user: null });
        if (__DEV__) {
          console.error("Error fetching user:", error.message);
        }

        return error.message;
      }
      return "An unexpected error occurred during fetchUser";
    }
  },
}));
