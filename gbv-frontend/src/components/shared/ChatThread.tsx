import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated as RNAnimated,
  ListRenderItemInfo,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from "expo-router";
import { messagesApi } from "../../api/messages";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuthStore } from "../../stores/authStore";
import { haptics } from "../../utils/haptics";
import type { Message, MessageAttachment } from "../../types";

interface ChatThreadProps {
  caseId: string;
  currentUserRole: "REPORTER" | "OFFICER" | "ADMIN";
  headerRight?: React.ReactNode;
}

interface DisplayMessage extends Message {
  isPending?: boolean;
  hasFailed?: boolean;
  tempId?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 2000;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isWithinMinutes(a: string, b: string, minutes = 5): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < minutes * 60 * 1000;
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function shouldGroupWithPrevious(msg: DisplayMessage, prev: DisplayMessage | null): boolean {
  if (!prev) return false;
  if (msg.sender_actor_type !== prev.sender_actor_type) return false;
  return isWithinMinutes(msg.sent_at, prev.sent_at);
}

function AttachmentPreview({ attachment }: { attachment: MessageAttachment }) {
  const { scheme, borderRadius } = useTheme();
  const isImage = attachment.file_type?.startsWith("image");

  if (isImage) {
    return (
      <Pressable
        onPress={() => Alert.alert("Attachment", attachment.file)}
        accessibilityLabel="View attachment image"
        style={[styles.attachmentImage, { borderRadius: borderRadius.sm }]}
      >
        <Image
          source={{ uri: attachment.file }}
          style={styles.attachmentImageContent}
          contentFit="cover"
        />
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.attachmentFile,
        { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.sm },
      ]}
    >
      <Ionicons name="document-outline" size={18} color={scheme.onSurfaceVariant} />
      <Text
        style={[styles.attachmentFileName, { color: scheme.onSurfaceVariant }]}
        numberOfLines={1}
      >
        {attachment.file.split("/").pop()}
      </Text>
    </View>
  );
}

function MessageBubble({
  message,
  isMe,
  showAvatar,
  senderName,
  onRetry,
}: {
  message: DisplayMessage;
  isMe: boolean;
  showAvatar: boolean;
  senderName?: string;
  onRetry?: (msg: DisplayMessage) => void;
}) {
  const { scheme, borderRadius, typography } = useTheme();

  const bubbleBg = isMe ? scheme.primary : scheme.surfaceVariant;
  const textColor = isMe ? scheme.onPrimary : scheme.onSurface;
  const timeColor = isMe ? `${scheme.onPrimary}AA` : scheme.onSurfaceVariant;
  const timeFontSize = 10;

  const bubbleStyle = isMe
    ? {
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }
    : {
        borderBottomRightRadius: 16,
        borderBottomLeftRadius: 4,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      };

  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: isMe ? "flex-end" : "flex-start" },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Message from ${isMe ? "you" : senderName || "them"}: ${message.body || (message.attachments?.length ? "Attachment" : "")}`}
    >
      {!isMe && showAvatar && (
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: scheme.primaryContainer,
              width: 32,
              height: 32,
              borderRadius: 16,
            },
          ]}
        >
          <Text
            style={[
              typography.label.small,
              { color: scheme.onPrimaryContainer, fontSize: 12 },
            ]}
          >
            {senderName ? getInitials(senderName) : "?"}
          </Text>
        </View>
      )}
      {!isMe && !showAvatar && <View style={{ width: 40 }} />}

      <View style={[{ maxWidth: "80%" }]}>
        {showAvatar && senderName && (
          <Text
            style={[
              typography.label.small,
              { color: scheme.onSurfaceVariant, marginBottom: 2, marginLeft: 4 },
            ]}
          >
            {senderName}
          </Text>
        )}
        <View style={[styles.bubble, { backgroundColor: bubbleBg }, bubbleStyle]}>
          {message.body && (
            <Text style={[typography.body.medium, { color: textColor }]}>
              {message.body}
            </Text>
          )}
          {message.attachments?.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} />
          ))}
          <View
            style={[
              styles.bubbleFooter,
              { marginTop: message.body || (message.attachments?.length ?? 0) > 0 ? 4 : 0 },
            ]}
          >
            <Text
              style={[
                typography.label.small,
                { color: timeColor, fontSize: timeFontSize },
              ]}
            >
              {message.sent_at ? formatTime(message.sent_at) : ""}
            </Text>
            {isMe && (
              <View style={{ marginLeft: 4 }}>
                {message.isPending ? (
                  <ActivityIndicator size={8} color={timeColor} />
                ) : message.hasFailed ? (
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color={scheme.error}
                  />
                ) : message.read_at ? (
                  <Ionicons
                    name="checkmark-done"
                    size={14}
                    color={scheme.onPrimary}
                  />
                ) : (
                  <Ionicons name="checkmark" size={14} color={timeColor} />
                )}
              </View>
            )}
          </View>
        </View>
        {message.hasFailed && onRetry && (
          <Pressable
            onPress={() => onRetry(message)}
            accessibilityLabel="Retry sending message"
            accessibilityRole="button"
            style={styles.retryButton}
          >
            <Ionicons
              name="refresh"
              size={14}
              color={scheme.error}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[typography.label.small, { color: scheme.error }]}
            >
              Retry
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function ChatThread({ caseId, currentUserRole, headerRight }: ChatThreadProps) {
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const listRef = useRef<FlashList<DisplayMessage>>(null);
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const [renderTick, setRenderTick] = useState(0);
  const animatedValues = useRef<Map<string, RNAnimated.Value>>(new Map());
  const prevMessageIds = useRef<Set<string>>(new Set());
  const markedReadIds = useRef<Set<string>>(new Set());
  const messagesRef = useRef<DisplayMessage[]>([]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["messages", caseId],
    queryFn: () => messagesApi.list(caseId),
    refetchInterval: isFocused ? 5000 : false,
  });

  const messages: DisplayMessage[] = useMemo(
    () => data?.results || [],
    [data?.results]
  );
  messagesRef.current = messages;

  const sendMutation = useMutation({
    mutationFn: (body: string) => messagesApi.send(caseId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["messages", caseId] });
      const prev = queryClient.getQueryData(["messages", caseId]);
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tempMsg: DisplayMessage = {
        id: tempId,
        conversation: caseId,
        sender_user: user,
        sender_actor_type: currentUserRole,
        body,
        attachments: [],
        sent_at: new Date().toISOString(),
        read_at: null,
        isPending: true,
      };
      queryClient.setQueryData(["messages", caseId], (old: any) => ({
        ...old,
        results: [...(old?.results || []), tempMsg],
      }));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      return { prev, tempId };
    },
    onError: (_err, _vars, context) => {
      if (context?.tempId) {
        queryClient.setQueryData(["messages", caseId], (old: any) => ({
          ...old,
          results: (old?.results || []).map((m: DisplayMessage) =>
            m.id === context.tempId
              ? { ...m, isPending: false, hasFailed: true }
              : m
          ),
        }));
      }
    },
    onSettled: (_data, error) => {
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["messages", caseId] });
      }
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    haptics.light();
    setText("");
    sendMutation.mutate(trimmed);
    Keyboard.dismiss();
  }, [text, sendMutation]);

  const handleRetry = useCallback(
    (failedMsg: DisplayMessage) => {
      queryClient.setQueryData(["messages", caseId], (old: any) => ({
        ...old,
        results: (old?.results || []).filter(
          (m: DisplayMessage) => m.id !== failedMsg.id
        ),
      }));
      if (failedMsg.body) {
        sendMutation.mutate(failedMsg.body);
      }
    },
    [caseId, queryClient, sendMutation]
  );

  const validateFileSize = async (uri: string): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && info.size && info.size > MAX_FILE_SIZE) {
        Alert.alert(
          "File too large",
          "Please select a file smaller than 20 MB."
        );
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;
    for (const asset of result.assets) {
      const valid = await validateFileSize(asset.uri);
      if (!valid) continue;
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName || "photo.jpg",
        type: asset.type || "image/jpeg",
      } as any);
      try {
        await messagesApi.sendWithAttachments(caseId, formData);
        queryClient.invalidateQueries({ queryKey: ["messages", caseId] });
      } catch {
        Alert.alert("Upload failed", "Could not upload the selected file.");
      }
    }
  }, [caseId, queryClient]);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (result.canceled) return;
    for (const asset of result.assets) {
      const valid = await validateFileSize(asset.uri);
      if (!valid) continue;
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
      } as any);
      try {
        await messagesApi.sendWithAttachments(caseId, formData);
        queryClient.invalidateQueries({ queryKey: ["messages", caseId] });
      } catch {
        Alert.alert("Upload failed", "Could not upload the selected file.");
      }
    }
  }, [caseId, queryClient]);

  const showAttachmentPicker = useCallback(() => {
    Alert.alert("Add Attachment", "Choose a file type", [
      { text: "Photo / Video", onPress: () => pickImage() },
      { text: "Document", onPress: () => pickDocument() },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickImage, pickDocument]);

  useEffect(() => {
    if (!messages.length) return;
    const currentIds = new Set(messages.map((m) => m.id));
    let hasNewMsgs = false;

    for (const msg of messages) {
      if (!prevMessageIds.current.has(msg.id) && !animatedValues.current.has(msg.id)) {
        const anim = new RNAnimated.Value(0);
        animatedValues.current.set(msg.id, anim);
        RNAnimated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        hasNewMsgs = true;
      }
    }
    for (const id of prevMessageIds.current) {
      if (!currentIds.has(id)) {
        animatedValues.current.delete(id);
      }
    }
    prevMessageIds.current = currentIds;
    if (hasNewMsgs) {
      setRenderTick((t) => t + 1);
    }
  }, [messages]);

  useEffect(() => {
    if (!messages.length) return;
    for (const msg of messages) {
      if (
        !msg.read_at &&
        msg.sender_actor_type !== currentUserRole &&
        !markedReadIds.current.has(msg.id)
      ) {
        markedReadIds.current.add(msg.id);
        messagesApi.markRead(caseId, msg.id).catch(() => {});
      }
    }
  }, [messages, caseId, currentUserRole]);

  const renderMessage = useCallback(
    ({ item, index }: ListRenderItemInfo<DisplayMessage>) => {
      const msg = item;
      const allMessages = messagesRef.current;
      const prevMsg = index > 0 ? allMessages[index - 1] : null;
      const isMe = msg.sender_actor_type === currentUserRole || msg.isPending;
      const isFirstInGroup = !shouldGroupWithPrevious(msg, prevMsg);
      const showDateSep = !prevMsg || !isSameDay(msg.sent_at, prevMsg.sent_at);
      const senderName = msg.sender_user?.full_name;
      const animValue = animatedValues.current.get(msg.id);

      const bubble = (
        <MessageBubble
          message={msg}
          isMe={isMe}
          showAvatar={!isMe && isFirstInGroup}
          senderName={senderName}
          onRetry={handleRetry}
        />
      );

      const wrapped = animValue ? (
        <RNAnimated.View style={{ opacity: animValue }}>{bubble}</RNAnimated.View>
      ) : (
        bubble
      );

      return (
        <View>
          {showDateSep && (
            <View style={styles.dateSep}>
              <View
                style={[styles.dateLine, { backgroundColor: scheme.outlineVariant }]}
              />
              <Text
                style={[
                  typography.label.small,
                  { color: scheme.onSurfaceVariant, marginHorizontal: 12 },
                ]}
              >
                {formatDate(msg.sent_at)}
              </Text>
              <View
                style={[styles.dateLine, { backgroundColor: scheme.outlineVariant }]}
              />
            </View>
          )}
          {!showDateSep && isFirstInGroup && (
            <Text
              style={[
                typography.label.small,
                {
                  color: scheme.onSurfaceVariant,
                  textAlign: "center",
                  marginVertical: 6,
                },
              ]}
            >
              {formatTime(msg.sent_at)}
            </Text>
          )}
          {wrapped}
        </View>
      );
    },
    [currentUserRole, scheme, typography, handleRetry]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: scheme.primaryContainer },
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={36} color={scheme.primary} />
      </View>
      <Text
        style={[
          typography.title.medium,
          {
            color: scheme.onBackground,
            marginTop: spacing.md,
            textAlign: "center",
          },
        ]}
      >
        No messages yet
      </Text>
      <Text
        style={[
          typography.body.medium,
          {
            color: scheme.onSurfaceVariant,
            marginTop: spacing.xs,
            textAlign: "center",
            maxWidth: 280,
          },
        ]}
      >
        {currentUserRole === "REPORTER"
          ? "Once your report is assigned, you can communicate securely with the officer handling your case. Send a message to start the conversation."
          : "Send a message to the reporter to start the conversation about this case."}
      </Text>
    </View>
  );

  const listKey = `messages-${caseId}-${renderTick}`;

  return (
    <View style={[styles.container, { backgroundColor: scheme.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlashList
          ref={listRef}
          data={messages}
          extraData={renderTick}
          renderItem={renderMessage}
          estimatedItemSize={80}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={isLoading ? null : renderEmpty}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          refreshing={isLoading}
          onRefresh={refetch}
          keyboardShouldPersistTaps="handled"
        />

        <View
          style={[
            styles.composer,
            {
              backgroundColor: scheme.surface,
              borderTopColor: scheme.outlineVariant,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <Pressable
            onPress={showAttachmentPicker}
            style={[
              styles.attachBtn,
              {
                backgroundColor: scheme.surfaceVariant,
                borderRadius: borderRadius.full,
              },
            ]}
            accessibilityLabel="Add attachment"
            accessibilityRole="button"
          >
            <Ionicons name="attach" size={20} color={scheme.primary} />
          </Pressable>

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.full },
            ]}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor={scheme.onSurfaceVariant}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              style={[
                typography.body.medium,
                {
                  color: scheme.onSurface,
                  flex: 1,
                  maxHeight: 100,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                },
              ]}
              accessibilityLabel="Message input"
            />
          </View>

          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? scheme.primary : scheme.surfaceVariant,
                borderRadius: borderRadius.full,
              },
            ]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color={scheme.onPrimary} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={text.trim() ? scheme.onPrimary : scheme.onSurfaceVariant}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  attachmentImage: {
    marginTop: 6,
    overflow: "hidden",
  },
  attachmentImageContent: {
    width: 200,
    height: 120,
  },
  attachmentFile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginTop: 6,
  },
  attachmentFileName: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
    justifyContent: "center",
  },
  sendBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  avatarCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginLeft: 4,
    alignSelf: "flex-start",
  },
});
