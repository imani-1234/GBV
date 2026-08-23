import { describe, expect, it } from "vitest";
import { navigationForRole } from "../client/src/lib/rbac";

describe("console role navigation", () => {
  it("keeps officer navigation focused on operational casework", () => {
    expect(navigationForRole("officer").map((item) => item.key)).toEqual([
      "dashboard",
      "cases",
      "reports",
    ]);
  });

  it("keeps administrator governance controls available only to administrators", () => {
    const administratorKeys = navigationForRole("administrator").map((item) => item.key);

    expect(administratorKeys).toEqual([
      "dashboard",
      "reports",
      "analytics",
      "team",
      "audit",
      "settings",
    ]);
    expect(administratorKeys).not.toContain("cases");
  });
});
