import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextInputProps as RNTextInputProps,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface TextFieldProps extends Omit<RNTextInputProps, "style"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
}

export function TextField({
  label,
  value,
  onChangeText,
  error,
  helperText,
  multiline,
  secureTextEntry,
  leftIcon,
  rightIcon,
  disabled,
  containerStyle,
  ...props
}: TextFieldProps) {
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const isFloating = focused || (value != null && value.length > 0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isFloating ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFloating]);

  const borderColor = error
    ? scheme.error
    : focused
    ? scheme.primary
    : scheme.outline;

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: disabled ? scheme.surfaceVariant : "transparent",
            borderRadius: borderRadius.md,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {leftIcon && (
          <View style={[styles.leftIcon, { paddingLeft: spacing.md }]}>
            {leftIcon}
          </View>
        )}
        <View style={styles.inputArea}>
          {label && (
            <Animated.Text
              pointerEvents="none"
              style={[
                styles.label,
                {
                  color: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [scheme.onSurfaceVariant, scheme.primary],
                  }),
                  top: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [spacing.md, spacing.xs],
                  }),
                  fontSize: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      typography.body.large.fontSize,
                      typography.label.medium.fontSize,
                    ],
                  }),
                  lineHeight: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      typography.body.large.lineHeight,
                      typography.label.medium.lineHeight,
                    ],
                  }),
                },
              ]}
            >
              {label}
            </Animated.Text>
          )}
          <RNTextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            multiline={multiline}
            secureTextEntry={secureTextEntry}
            editable={!disabled}
            placeholderTextColor={scheme.onSurfaceVariant}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
              styles.input,
              {
                color: scheme.onSurface,
                paddingTop: label ? spacing.lg : spacing.md,
                minHeight: multiline ? 80 : undefined,
              },
              leftIcon ? { paddingLeft: spacing.xs } : {},
              rightIcon ? { paddingRight: spacing.xs } : {},
            ]}
            {...props}
          />
        </View>
        {rightIcon && (
          <View style={[styles.rightIcon, { paddingRight: spacing.md }]}>
            {rightIcon}
          </View>
        )}
      </View>
      {error ? (
        <Text
          style={[
            styles.helper,
            { color: scheme.error, ...typography.body.small },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helper,
            { color: scheme.onSurfaceVariant, ...typography.body.small },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
  },
  leftIcon: {
    justifyContent: "center",
    paddingTop: 14,
  },
  rightIcon: {
    justifyContent: "center",
    paddingTop: 14,
  },
  inputArea: { flex: 1, position: "relative" },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  label: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  helper: {
    marginTop: 4,
    marginHorizontal: 16,
  },
});
