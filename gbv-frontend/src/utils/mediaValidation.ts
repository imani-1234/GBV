import { isAxiosError } from "axios";

export const MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export const ALLOWED_MEDIA_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "mp4",
  "mpeg",
  "mov",
  "mp3",
  "wav",
  "ogg",
  "doc",
  "docx",
  "txt",
]);

export interface SelectedMedia {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export interface MediaErrorMessage {
  title: string;
  message: string;
}

export function getFileExtension(name?: string | null): string {
  const cleanName = (name || "").split(/[?#]/)[0];
  const extension = cleanName.split(".").pop() || "";
  return extension.toLowerCase();
}

export function getAssetName(
  uri: string,
  name: string | null | undefined,
  type: string | null | undefined,
): string {
  const fromPicker = name?.trim();
  if (fromPicker) return fromPicker;

  const fromUri = uri.split(/[?#]/)[0].split("/").pop()?.trim();
  if (fromUri && getFileExtension(fromUri)) return fromUri;

  const fallbackExtension = type === "video" ? "mp4" : type === "audio" ? "mp3" : "jpg";
  return `evidence-${Date.now()}.${fallbackExtension}`;
}

export function isSupportedMedia(file: SelectedMedia): boolean {
  const normalizedType = (file.type || "").toLowerCase();
  const extension = getFileExtension(file.name);
  const hasKnownExtension = extension.length > 0;
  const extensionAllowed = !hasKnownExtension || ALLOWED_MEDIA_EXTENSIONS.has(extension);
  const mimeAllowed = ALLOWED_MEDIA_MIME_TYPES.has(normalizedType);

  return extensionAllowed && (mimeAllowed || ALLOWED_MEDIA_EXTENSIONS.has(extension));
}

export function getMediaValidationMessage(file: SelectedMedia): string | null {
  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    return `${file.name} is larger than 25 MB. Please choose a smaller file.`;
  }

  if (!isSupportedMedia(file)) {
    return `${file.name} is not supported. Use JPG, PNG, GIF, WEBP, PDF, MP4, MOV, MP3, WAV, OGG, DOC, DOCX, or TXT.`;
  }

  return null;
}

export function getMediaUploadError(error: unknown): MediaErrorMessage {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data as { error?: unknown; detail?: unknown } | undefined;
    const serverMessage = typeof responseData?.error === "string"
      ? responseData.error
      : typeof responseData?.detail === "string" ? responseData.detail : "";

    if (status === 415) {
      return {
        title: "This file format is not supported",
        message: "Remove the unsupported file and choose JPG, PNG, PDF, MP4, MOV, MP3, WAV, OGG, DOC, DOCX, or TXT instead.",
      };
    }

    if (status === 400 && serverMessage.toLowerCase().includes("large")) {
      return {
        title: "The file is too large",
        message: "Each evidence file must be 25 MB or smaller.",
      };
    }

    if (status === 400 && serverMessage) {
      return { title: "Evidence could not be uploaded", message: serverMessage };
    }
  }

  return {
    title: "Evidence upload interrupted",
    message: "Your report draft was created, but the evidence could not be uploaded. Check your connection and tap Retry Upload, or remove the file and continue without it.",
  };
}
