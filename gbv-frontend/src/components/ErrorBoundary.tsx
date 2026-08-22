import { Component, type ReactNode, type ErrorInfo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { generateLightScheme } from "../theme/colors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const scheme = generateLightScheme();

      return (
        <View style={[styles.container, { backgroundColor: scheme.background }]}>
          <View style={styles.content}>
            <View style={[styles.iconCircle, { backgroundColor: scheme.errorContainer }]}>
              <Ionicons name="shield-outline" size={40} color={scheme.error} />
            </View>
            <Text style={[styles.title, { color: scheme.onBackground }]}>
              Something went wrong
            </Text>
            <Text style={[styles.subtitle, { color: scheme.onSurfaceVariant }]}>
              An unexpected error occurred. Our team has been notified. Please try again.
            </Text>
            {__DEV__ && this.state.error && (
              <ScrollView
                style={[styles.errorDetails, { backgroundColor: scheme.surfaceVariant }]}
              >
                <Text style={{ color: scheme.error, fontFamily: "monospace", fontSize: 12 }}>
                  {this.state.error.message}
                </Text>
              </ScrollView>
            )}
            <Pressable
              onPress={this.handleReset}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: scheme.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: scheme.onPrimary }]}>
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    alignItems: "center",
    maxWidth: 320,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  errorDetails: {
    width: "100%",
    maxHeight: 120,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
