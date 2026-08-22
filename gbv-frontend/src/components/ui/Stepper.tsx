import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";

interface Step {
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const { scheme, spacing, borderRadius, typography } = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isFuture = index > currentStep;

        let circleBg = scheme.surfaceVariant;
        let circleText = scheme.onSurfaceVariant;
        let icon: string | null = null;
        let lineColor = scheme.outlineVariant;

        if (isCompleted) {
          circleBg = scheme.primary;
          icon = "checkmark";
          lineColor = scheme.primary;
        } else if (isCurrent) {
          circleBg = scheme.primaryContainer;
          circleText = scheme.primary;
        }

        return (
          <View key={index} style={styles.stepWrap}>
            {/* Connecting line */}
            {index > 0 && (
              <View style={[styles.line, { backgroundColor: lineColor }]} />
            )}
            <View style={styles.step}>
              <View style={[styles.circle, { backgroundColor: circleBg, borderWidth: isCurrent ? 2 : 0, borderColor: isCurrent ? scheme.primary : "transparent" }]}>
                {icon ? (
                  <Ionicons name={icon as any} size={16} color={scheme.onPrimary} />
                ) : (
                  <Text style={[typography.label.medium, { color: circleText, fontWeight: "700" }]}>{index + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  typography.label.small,
                  { color: isCurrent ? scheme.primary : scheme.onSurfaceVariant, marginTop: 4, textAlign: "center" },
                  isCurrent && { fontWeight: "700" },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function AnimatedStepContent({ children, stepKey }: { children: React.ReactNode; stepKey: number }) {
  return (
    <Animated.View
      key={stepKey}
      entering={SlideInRight.duration(300).springify()}
      exiting={SlideOutLeft.duration(200)}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 8, paddingVertical: 16 },
  stepWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  step: { alignItems: "center", flex: 1 },
  circle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  line: { height: 2, flex: 1, marginBottom: 16, marginHorizontal: -4 },
});
