import { useAuthStore } from "@/lib/store";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const hasMounted = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const init = async () => {
      if (!hasMounted.current) {
        hasMounted.current = true;
        await fetchUser();
      }
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading && user === null) {
      // User is not authenticated, redirect to login
      router.replace("/auth");
    }
  }, [user?.id, isLoading]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // If user is null after loading, don't render children (redirect will happen)
  if (user === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
