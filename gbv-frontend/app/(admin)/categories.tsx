import { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Modal } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Card, Chip, Skeleton, Button, Snackbar } from "../../src/components/ui";
import { categoriesApi } from "../../src/api/categories";
import { haptics } from "../../src/utils/haptics";
import type { IncidentCategory } from "../../src/types";

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#FEE2E2", text: "#991B1B" },
  high: { bg: "#FEF3C7", text: "#92400E" },
  medium: { bg: "#DBEAFE", text: "#1E40AF" },
  low: { bg: "#D1FAE5", text: "#065F46" },
};

function CategoryFormModal({
  visible,
  onClose,
  editItem,
}: {
  visible: boolean;
  onClose: () => void;
  editItem?: IncidentCategory | null;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const queryClient = useQueryClient();
  const isEdit = !!editItem;
  const [name, setName] = useState(editItem?.name || "");
  const [description, setDescription] = useState(editItem?.description || "");
  const [defaultPriority, setDefaultPriority] = useState(editItem?.default_priority || "medium");

  const createMutation = useMutation({
    mutationFn: () => categoriesApi.create({ name: name.trim(), description: description.trim(), default_priority: defaultPriority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      resetAndClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => categoriesApi.update(editItem!.id, { name: name.trim(), description: description.trim(), default_priority: defaultPriority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setName("");
    setDescription("");
    setDefaultPriority("medium");
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "transparent", justifyContent: "center", padding: 24 }} onPress={onClose}>
        <Pressable style={{ backgroundColor: scheme.surface, borderRadius: br.xl, padding: spacing.lg }} onPress={() => {}}>
          <Text style={[typography.title.medium, { color: scheme.onSurface, marginBottom: spacing.md }]}>
            {isEdit ? "Edit Category" : "New Category"}
          </Text>

          <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sexual Harassment"
            placeholderTextColor={scheme.onSurfaceVariant}
            style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, marginTop: 4, marginBottom: spacing.sm }]}
          />

          <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of this category"
            placeholderTextColor={scheme.onSurfaceVariant}
            multiline
            style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, marginTop: 4, marginBottom: spacing.sm, minHeight: 60, textAlignVertical: "top" }]}
          />

          <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Default Priority</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.md }}>
            {["low", "medium", "high", "critical"].map((p) => (
              <Pressable
                key={p}
                onPress={() => setDefaultPriority(p)}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: br.md,
                  backgroundColor: defaultPriority === p ? (PRIORITY_COLORS[p]?.bg || scheme.primaryContainer) : scheme.surfaceVariant,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: defaultPriority === p ? (PRIORITY_COLORS[p]?.text || scheme.onPrimaryContainer) : scheme.onSurfaceVariant, textTransform: "capitalize" }}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm }}>
            <Button title="Cancel" variant="text" onPress={resetAndClose} />
            <Button title={isEdit ? "Save" : "Create"} variant="filled" onPress={() => (isEdit ? updateMutation.mutate() : createMutation.mutate())} loading={isPending} disabled={!name.trim()} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CategoryRow({
  item,
  onEdit,
  onDelete,
}: {
  item: IncidentCategory;
  onEdit: (c: IncidentCategory) => void;
  onDelete: (c: IncidentCategory) => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const pc = PRIORITY_COLORS[item.default_priority] || PRIORITY_COLORS.medium;

  return (
    <Card variant="elevated" padding="sm" style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Text style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600", flex: 1 }]}>{item.name}</Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: pc.bg }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: pc.text, textTransform: "capitalize" }}>{item.default_priority}</Text>
            </View>
          </View>
          {item.description && (
            <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <Pressable onPress={() => onEdit(item)} style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name="pencil" size={18} color={scheme.primary} />
        </Pressable>
        <Pressable onPress={() => onDelete(item)} style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name="trash-outline" size={18} color={scheme.error} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function CategoriesScreen() {
  const { scheme, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<IncidentCategory | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data: categories, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => categoriesApi.list(),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setSnackbar({ message: "Category deleted", type: "success" });
    },
    onError: () => {
      setSnackbar({ message: "Failed to delete category", type: "error" });
    },
  });

  const handleEdit = useCallback((c: IncidentCategory) => {
    setEditItem(c);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (c: IncidentCategory) => {
      Alert.alert("Delete Category", `Remove "${c.name}"? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            haptics.destructive();
            deleteMutation.mutate(c.id);
          },
        },
      ]);
    },
    [deleteMutation],
  );

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditItem(null);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: scheme.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline.small, { color: scheme.onBackground }]}>Categories</Text>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>Manage incident categories</Text>
          </View>
          <Pressable
            onPress={() => { setEditItem(null); setFormOpen(true); }}
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
            <Text style={{ color: scheme.onPrimary, fontWeight: "600", fontSize: 14 }}>New Category</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={72} borderRadius={16} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <FlashList
          data={categories || []}
          renderItem={({ item }: any) => <CategoryRow item={item} onEdit={handleEdit} onDelete={handleDelete} />}
          keyExtractor={(item: IncidentCategory) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 100 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons name="pricetags-outline" size={48} color={scheme.outlineVariant} />
              <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: 16 }]}>No categories defined</Text>
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: 4 }]}>Create one to get started</Text>
            </View>
          }
        />
      )}

      <CategoryFormModal visible={formOpen} onClose={handleFormClose} editItem={editItem} />

      <Snackbar visible={!!snackbar} message={snackbar?.message || ""} type={snackbar?.type || "info"} onDismiss={() => setSnackbar(null)} duration={3000} />
    </View>
  );
}

const styles = StyleSheet.create({});
