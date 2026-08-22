import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";

interface TimelineStep {
  status: string;
  label: string;
  date?: string;
  description?: string;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
  currentStatus: string;
}

const statusOrder = [
  "draft", "submitted", "under_review", "PENDING_REVIEW", "ASSIGNED",
  "UNDER_REVIEW", "AWAITING_REPORTER_RESPONSE", "UNDER_INVESTIGATION",
  "REFERRED", "RESOLVED", "CLOSED", "REOPENED",
];

function getStepState(stepStatus: string, currentStatus: string): "completed" | "current" | "future" {
  const stepIdx = statusOrder.indexOf(stepStatus);
  const currentIdx = statusOrder.indexOf(currentStatus);
  if (stepIdx === -1 || currentIdx === -1) return "future";
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "current";
  return "future";
}

export function StatusTimeline({ steps, currentStatus }: StatusTimelineProps) {
  const { scheme, spacing, typography } = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const state = getStepState(step.status, currentStatus);
        const isLast = index === steps.length - 1;

        let dotColor = scheme.outlineVariant;
        let lineColor = scheme.outlineVariant;
        let labelColor = scheme.onSurfaceVariant;

        if (state === "completed") {
          dotColor = scheme.primary;
          lineColor = scheme.primary;
          labelColor = scheme.onSurface;
        } else if (state === "current") {
          dotColor = scheme.primary;
          lineColor = scheme.primary;
          labelColor = scheme.primary;
        }

        return (
          <View key={index} style={styles.row}>
            <View style={styles.column}>
              <View style={[styles.dot, { backgroundColor: dotColor, borderColor: state === "current" ? scheme.primaryContainer : "transparent", borderWidth: state === "current" ? 3 : 0 }]}>
                {state === "completed" && <Ionicons name="checkmark" size={10} color={scheme.onPrimary} />}
              </View>
              {!isLast && <View style={[styles.connector, { backgroundColor: lineColor }]} />}
            </View>
            <View style={[styles.content, { marginLeft: spacing.md, paddingBottom: isLast ? 0 : spacing.lg }]}>
              <Text style={[typography.title.small, { color: labelColor }]}>{step.label}</Text>
              {step.date && <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>{step.date}</Text>}
              {step.description && <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: 4 }]}>{step.description}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: { flexDirection: "row" },
  column: { alignItems: "center", width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  connector: { width: 2, flex: 1, minHeight: 24 },
  content: { flex: 1 },
});
