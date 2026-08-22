import { useCallback, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface BottomSheetProps {
  snapPoints: string[];
  children: ReactNode;
  onClose?: () => void;
  visible: boolean;
}

export function BottomSheet({
  snapPoints: snap,
  children,
  onClose,
  visible,
}: BottomSheetProps) {
  const { scheme, borderRadius } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => snap, [snap]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) onClose?.();
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheetModalProvider>
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: scheme.surface,
          borderRadius: borderRadius.xl,
        }}
        handleIndicatorStyle={{
          backgroundColor: scheme.outlineVariant,
          width: 32,
          height: 4,
          borderRadius: 2,
        }}
        onDismiss={onClose}
      >
        <BottomSheetView style={styles.content}>
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
