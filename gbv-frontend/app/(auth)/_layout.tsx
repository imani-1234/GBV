import { Stack } from "expo-router/stack";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reporting-mode" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="anonymous-access" />
      <Stack.Screen name="resources" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
