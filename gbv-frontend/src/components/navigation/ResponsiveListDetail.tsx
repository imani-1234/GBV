import { View, StyleSheet } from "react-native";
import { useBreakpoint, isWide } from "../../hooks/useBreakpoint";
import type { Breakpoint } from "../../hooks/useBreakpoint";

interface ResponsiveListDetailProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  showDetail: boolean;
  listWidth?: number;
}

export function ResponsiveListDetail({ list, detail, showDetail, listWidth = 380 }: ResponsiveListDetailProps) {
  const bp: Breakpoint = useBreakpoint();
  const wide = isWide(bp);

  if (wide && showDetail) {
    return (
      <View style={[styles.row, { minHeight: "100%" as any }]}>
        <View style={[styles.list, { width: listWidth }]}>{list}</View>
        <View style={styles.detail}>{detail}</View>
      </View>
    );
  }

  if (showDetail) {
    return <View style={styles.full}>{detail}</View>;
  }

  return <View style={styles.full}>{list}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flex: 1 },
  list: { borderRightWidth: 1, borderRightColor: "#E0E0E0" },
  detail: { flex: 1 },
  full: { flex: 1 },
});
