import { Switch as RNSwitch } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColor?: string;
  thumbColor?: string;
}

export function Switch({
  value,
  onValueChange,
  disabled = false,
  trackColor: customTrack,
  thumbColor: customThumb,
}: SwitchProps) {
  const { scheme } = useTheme();

  const track = {
    false: customTrack || scheme.surfaceVariant,
    true: customTrack || scheme.primary,
  };

  const thumb = value
    ? customThumb || scheme.onPrimary
    : customThumb || scheme.outline;

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={track}
      thumbColor={thumb}
      ios_backgroundColor={track.false}
    />
  );
}
