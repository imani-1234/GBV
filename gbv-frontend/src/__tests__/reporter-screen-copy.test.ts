import { describe, expect, it } from "vitest";
import {
  reporterDetailFallbackTitle,
  reporterHeroTitle,
  reporterMessagesEmptyTitle,
  reporterNotificationsEmptyTitle,
  reporterWizardTitle,
} from "../utils/reporterScreenCopy";

describe("reporter screen heading copy", () => {
  it("uses newline characters rather than visible JSX-like markers", () => {
    const titles = [
      reporterHeroTitle(false),
      reporterHeroTitle(true),
      reporterDetailFallbackTitle,
      reporterWizardTitle,
      reporterMessagesEmptyTitle(false),
      reporterMessagesEmptyTitle(true),
      reporterNotificationsEmptyTitle(false),
      reporterNotificationsEmptyTitle(true),
    ];

    for (const title of titles) {
      expect(title).toContain("\n");
      expect(title).not.toContain("{`");
      expect(title).not.toContain("`}");
    }
  });
});
