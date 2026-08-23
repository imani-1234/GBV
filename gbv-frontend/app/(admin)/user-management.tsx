import { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Modal } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Card, Chip, Skeleton, Button, Snackbar } from "../../src/components/ui";
import { usersApi } from "../../src/api/users";
import { haptics } from "../../src/utils/haptics";
import type { User } from "../../src/types";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  REPORTER: { bg: "#DBEAFE", text: "#1E40AF" },
  OFFICER: { bg: "#D1FAE5", text: "#065F46" },
  ADMIN: { bg: "#FEF3C7", text: "#92400E" },
};

function CreateOfficerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");

  const mutation = useMutation({
    mutationFn: () => usersApi.createOfficer({ email: email.trim(), full_name: fullName.trim(), password, department: department.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEmail("");
      setFullName("");
      setPassword("");
      setDepartment("");
      onClose();
    },
  });

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "transparent", justifyContent: "center", padding: 24 }} onPress={onClose}>
        <Pressable style={{ backgroundColor: scheme.surface, borderRadius: br.xl, padding: spacing.lg }} onPress={() => {}}>
          <Text style={[typography.title.medium, { color: scheme.onSurface, marginBottom: spacing.md }]}>Create Officer</Text>

          <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="officer@university.edu"
            placeholderTextColor={scheme.onSurfaceVariant}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, marginTop: 4, marginBottom: spacing.sm }]}
          />

          <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Doe"
            placeholderTextColor={scheme.onSurfaceVariant}
            style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, marginTop: 4, marginBottom: spacing.sm }]}
          />

          <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Temporary password"
            placeholderTextColor={scheme.onSurfaceVariant}
            secureTextEntry
            style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, marginTop: 4, marginBottom: spacing.sm }]}
          />

          <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Department (optional)</Text>
          <TextInput
            value={department}
            onChangeText={setDepartment}
            placeholder="Campus Safety"
            placeholderTextColor={scheme.onSurfaceVariant}
            style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, marginTop: 4, marginBottom: spacing.md }]}
          />

          {mutation.isError && (
            <Text style={{ color: scheme.error, marginBottom: spacing.sm }}>Failed to create officer. Check the form.</Text>
          )}

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm }}>
            <Button title="Cancel" variant="text" onPress={onClose} />
            <Button title="Create" variant="filled" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!email.trim() || !fullName.trim() || !password} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function UserRow({
  user,
  onDeactivate,
  onReactivate,
}: {
  user: User;
  onDeactivate: (u: User) => void;
  onReactivate: (u: User) => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.REPORTER;

  return (
    <Card variant="elevated" padding="sm" style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: roleColor.bg, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: roleColor.text }}>
            {user.full_name?.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Text style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600", flex: 1 }]} numberOfLines={1}>
              {user.full_name}
            </Text>
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: roleColor.bg }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: roleColor.text }}>{user.role}</Text>
            </View>
          </View>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>{user.email}</Text>
          {user.created_at && (
            <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>
              Joined {new Date(user.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        {user.role !== "ADMIN" && (
          <Pressable
            onPress={() => (user.is_active ? onDeactivate(user) : onReactivate(user))}
            style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons
              name={user.is_active ? "pause-circle" : "checkmark-circle"}
              size={22}
              color={user.is_active ? scheme.warning : scheme.success}
            />
          </Pressable>
        )}
      </View>
      {!user.is_active && (
        <View style={{ marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 2, backgroundColor: "#FEE2E2", borderRadius: 4, alignSelf: "flex-start" }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: "#991B1B" }}>Inactive</Text>
        </View>
      )}
    </Card>
  );
}

export default function UserManagementScreen() {
  const { scheme, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (search.trim()) p.search = search.trim();
    if (roleFilter) p.role = roleFilter;
    return p;
  }, [search, roleFilter]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-users", queryParams],
    queryFn: () => usersApi.list(queryParams),
    staleTime: 30_000,
  });

  const users = useMemo(() => data?.results || [], [data?.results]);

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSnackbar({ message: "User deactivated", type: "success" });
    },
    onError: () => {
      setSnackbar({ message: "Failed to deactivate user", type: "error" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSnackbar({ message: "User reactivated", type: "success" });
    },
    onError: () => {
      setSnackbar({ message: "Failed to reactivate user", type: "error" });
    },
  });

  const handleDeactivate = useCallback(
    (user: User) => {
      Alert.alert(
        "Deactivate User",
        `This will deactivate ${user.full_name}. They will be unable to log in.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Deactivate",
            style: "destructive",
            onPress: () => {
              haptics.destructive();
              deactivateMutation.mutate(user.id);
            },
          },
        ],
      );
    },
    [deactivateMutation],
  );

  const handleReactivate = useCallback(
    (user: User) => {
      Alert.alert("Reactivate User", `Reactivate ${user.full_name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reactivate",
          onPress: () => {
            haptics.medium();
            reactivateMutation.mutate(user.id);
          },
        },
      ]);
    },
    [reactivateMutation],
  );

  return (
    <View style={{ flex: 1, backgroundColor: scheme.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline.small, { color: scheme.onBackground }]}>User Management</Text>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>Manage officers and users</Text>
          </View>
          <Pressable
            onPress={() => setCreateModalOpen(true)}
            style={({ pressed }) => ({
              backgroundColor: scheme.primary,
              borderRadius: 12,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              opacity: pressed ? 0.85 : 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            })}
          >
            <Ionicons name="add" size={18} color={scheme.onPrimary} />
            <Text style={{ color: scheme.onPrimary, fontWeight: "600", fontSize: 14 }}>New Officer</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: scheme.surfaceVariant, borderRadius: 12, paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color={scheme.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or email..."
              placeholderTextColor={scheme.onSurfaceVariant}
              style={[typography.body.medium, { color: scheme.onSurface, flex: 1, paddingVertical: 10, marginLeft: 8 }]}
            />
            {search.length > 0 && <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={scheme.onSurfaceVariant} /></Pressable>}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" }}>
          {[{ key: "", label: "All" }, { key: "REPORTER", label: "Reporters" }, { key: "OFFICER", label: "Officers" }, { key: "ADMIN", label: "Admins" }].map((r) => (
            <Chip key={r.key} label={r.label} variant="filter" selected={roleFilter === r.key} onPress={() => setRoleFilter(r.key)} />
          ))}
        </View>

        <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: spacing.sm }]}>
          {data?.count != null ? `${data.count} user${data.count !== 1 ? "s" : ""}` : ""}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={72} borderRadius={16} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <FlashList
          data={users}
          renderItem={({ item }: any) => <UserRow user={item} onDeactivate={handleDeactivate} onReactivate={handleReactivate} />}
          keyExtractor={(item: User) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 100 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons name="people-outline" size={48} color={scheme.outlineVariant} />
              <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: 16 }]}>No users found</Text>
            </View>
          }
        />
      )}

      <CreateOfficerModal visible={createModalOpen} onClose={() => setCreateModalOpen(false)} />

      <Snackbar visible={!!snackbar} message={snackbar?.message || ""} type={snackbar?.type || "info"} onDismiss={() => setSnackbar(null)} duration={3000} />
    </View>
  );
}

const styles = StyleSheet.create({});
