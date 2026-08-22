import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Switch as RNSwitch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import {
  Button,
  TextField,
  Card,
  Chip,
  Badge,
  Avatar,
  Divider,
  IconButton,
  Checkbox,
  RadioGroup,
  Snackbar,
  Skeleton,
} from "../../src/components/ui";

export default function ThemeGallery() {
  const { scheme, isDark, setMode, spacing, borderRadius, typography } = useTheme();
  const [textValue, setTextValue] = useState("");
  const [chipSelected, setChipSelected] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("option1");
  const [snackVisible, setSnackVisible] = useState(false);

  const radioOptions = [
    { label: "Option 1", value: "option1" },
    { label: "Option 2", value: "option2" },
    { label: "Option 3", value: "option3" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typography.headline.small, { color: scheme.onBackground, marginBottom: spacing.sm }]}>
          Theme Gallery
        </Text>
        <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.lg }]}>
          Preview all M3 primitive components in light/dark mode
        </Text>

        {/* Mode Toggle */}
        <View style={[styles.row, { marginBottom: spacing.md }]}>
          <Text style={[typography.title.medium, { color: scheme.onBackground }]}>Dark Mode</Text>
          <RNSwitch
            value={isDark}
            onValueChange={(v) => setMode(v ? "dark" : "light")}
            trackColor={{ false: scheme.surfaceVariant, true: scheme.primaryContainer }}
            thumbColor={isDark ? scheme.onPrimaryContainer : scheme.outline}
          />
        </View>

        {/* ─── Buttons ─── */}
        <Section title="Button" scheme={scheme} typography={typography} spacing={spacing}>
          <View style={styles.row}>
            <Button title="Filled" variant="filled" onPress={() => {}} />
            <Button title="Tonal" variant="tonal" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Outlined" variant="outlined" onPress={() => {}} />
            <Button title="Text" variant="text" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Elevated" variant="elevated" onPress={() => {}} />
            <Button title="Loading" variant="filled" loading onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Disabled" variant="filled" disabled onPress={() => {}} />
            <Button title="Small" variant="tonal" size="sm" onPress={() => {}} />
            <Button title="Large" variant="filled" size="lg" onPress={() => {}} />
          </View>
        </Section>

        <Divider />

        {/* ─── TextField ─── */}
        <Section title="TextField" scheme={scheme} typography={typography} spacing={spacing}>
          <TextField
            label="Default"
            value={textValue}
            onChangeText={setTextValue}
            containerStyle={{ marginBottom: spacing.sm }}
          />
          <TextField
            label="With Error"
            value="bad input"
            onChangeText={() => {}}
            error="This field is required"
            containerStyle={{ marginBottom: spacing.sm }}
          />
          <TextField label="Secure" value="" onChangeText={() => {}} secureTextEntry />
          <TextField label="Multiline" value="" onChangeText={() => {}} multiline />
          <TextField label="Disabled" value="read only" onChangeText={() => {}} disabled />
        </Section>

        <Divider />

        {/* ─── Card ─── */}
        <Section title="Card" scheme={scheme} typography={typography} spacing={spacing}>
          <View style={{ gap: spacing.sm }}>
            <Card variant="elevated" padding="md">
              <Text style={[typography.title.medium, { color: scheme.onSurface }]}>Elevated Card</Text>
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>
                With shadow and rounded corners
              </Text>
            </Card>
            <Card variant="filled" padding="md">
              <Text style={[typography.title.medium, { color: scheme.onSurface }]}>Filled Card</Text>
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>
                Surface variant background, no shadow
              </Text>
            </Card>
            <Card variant="outlined" padding="md">
              <Text style={[typography.title.medium, { color: scheme.onSurface }]}>Outlined Card</Text>
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>
                Outline border, no shadow
              </Text>
            </Card>
          </View>
        </Section>

        <Divider />

        {/* ─── Chip ─── */}
        <Section title="Chip" scheme={scheme} typography={typography} spacing={spacing}>
          <View style={[styles.row, { flexWrap: "wrap", gap: spacing.xs }]}>
            <Chip label="Assist" variant="assist" />
            <Chip label="Filter" variant="filter" selected={chipSelected} onPress={() => setChipSelected(!chipSelected)} />
            <Chip label="Input" variant="input" />
            <Chip label="Suggestion" variant="suggestion" />
          </View>
        </Section>

        <Divider />

        {/* ─── Badge + Avatar ─── */}
        <Section title="Badge & Avatar" scheme={scheme} typography={typography} spacing={spacing}>
          <View style={[styles.row, { gap: spacing.xl }]}>
            <Badge count={3}>
              <Avatar name="John Doe" />
            </Badge>
            <Badge count={150}>
              <Avatar name="Jane Smith" color={scheme.secondary} />
            </Badge>
            <Badge>
              <Avatar name="AD" size="lg" />
            </Badge>
          </View>
        </Section>

        <Divider />

        {/* ─── Checkbox + Radio ─── */}
        <Section title="Selection Controls" scheme={scheme} typography={typography} spacing={spacing}>
          <View style={{ flexDirection: "row", gap: spacing.xl }}>
            <Checkbox checked={checkboxChecked} onChange={setCheckboxChecked} label="Checkbox" />
          </View>
          <RadioGroup options={radioOptions} value={radioValue} onChange={setRadioValue} />
        </Section>

        <Divider />

        {/* ─── Skeleton ─── */}
        <Section title="Skeleton" scheme={scheme} typography={typography} spacing={spacing}>
          <View style={{ gap: spacing.sm }}>
            <Skeleton width="100%" height={16} borderRadius={borderRadius.sm} />
            <Skeleton width="75%" height={16} borderRadius={borderRadius.sm} />
            <Skeleton width="50%" height={16} borderRadius={borderRadius.sm} />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
            <Skeleton width={48} height={48} borderRadius={borderRadius.full} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width="100%" height={14} borderRadius={borderRadius.sm} />
              <Skeleton width="60%" height={14} borderRadius={borderRadius.sm} />
            </View>
          </View>
        </Section>

        <Divider />

        {/* ─── Snackbar ─── */}
        <Section title="Snackbar" scheme={scheme} typography={typography} spacing={spacing}>
          <Button title="Show Snackbar" variant="tonal" onPress={() => setSnackVisible(true)} />
          <Button title="Show Error Snackbar" variant="tonal" onPress={() => setSnackVisible(true)} />
          <Snackbar
            visible={snackVisible}
            message="This is an info snackbar"
            action={{ label: "Dismiss", onPress: () => setSnackVisible(false) }}
            type="info"
            onDismiss={() => setSnackVisible(false)}
            duration={6000}
          />
        </Section>

        <Divider />

        {/* ─── Typography Scale ─── */}
        <Section title="Typography Scale" scheme={scheme} typography={typography} spacing={spacing}>
          {(
            [
              ["Display Large", typography.display.large],
              ["Display Medium", typography.display.medium],
              ["Display Small", typography.display.small],
              ["Headline Large", typography.headline.large],
              ["Headline Medium", typography.headline.medium],
              ["Headline Small", typography.headline.small],
              ["Title Large", typography.title.large],
              ["Title Medium", typography.title.medium],
              ["Title Small", typography.title.small],
              ["Body Large", typography.body.large],
              ["Body Medium", typography.body.medium],
              ["Body Small", typography.body.small],
              ["Label Large", typography.label.large],
              ["Label Medium", typography.label.medium],
              ["Label Small", typography.label.small],
            ] as const
          ).map(([name, style]) => (
            <Text key={name} style={[style, { color: scheme.onSurface, marginBottom: spacing.xs }]}>
              {name}
            </Text>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  scheme,
  typography,
  spacing,
  children,
}: {
  title: string;
  scheme: Record<string, string>;
  typography: Record<string, any>;
  spacing: Record<string, number>;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginVertical: spacing!.md }}>
      <Text style={[typography.title.large, { color: scheme!.primary, marginBottom: spacing!.sm }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
});
