import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  getMediaUploadError,
  getMediaValidationMessage,
  isSupportedMedia,
  MAX_MEDIA_SIZE_BYTES,
  type SelectedMedia,
} from "../utils/mediaValidation";

const media = (overrides: Partial<SelectedMedia> = {}): SelectedMedia => ({
  uri: "file:///evidence/photo.jpg",
  name: "photo.jpg",
  type: "image/jpeg",
  size: 1024,
  ...overrides,
});

describe("media validation", () => {
  it("accepts backend-supported MIME types and extensions", () => {
    expect(isSupportedMedia(media())).toBe(true);
    expect(isSupportedMedia(media({ name: "report.PDF", type: "" }))).toBe(true);
    expect(isSupportedMedia(media({ name: "voice.mp3", type: "audio/mpeg" }))).toBe(true);
  });

  it("rejects unknown media formats with an actionable message", () => {
    const file = media({ name: "archive.zip", type: "application/zip" });
    expect(isSupportedMedia(file)).toBe(false);
    expect(getMediaValidationMessage(file)).toContain("archive.zip is not supported");
  });

  it("rejects files over the backend limit", () => {
    const file = media({ size: MAX_MEDIA_SIZE_BYTES + 1 });
    expect(getMediaValidationMessage(file)).toContain("larger than 25 MB");
  });

  it("turns a 415 response into a professional upload message", () => {
    const error = new AxiosError("Unsupported Media Type", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 415,
      statusText: "Unsupported Media Type",
      headers: {},
      config: {} as never,
      data: { error: "Unsupported media type" },
    });
    const result = getMediaUploadError(error);
    expect(result.title).toBe("This file format is not supported");
    expect(result.message).toContain("Remove the unsupported file");
  });
});
