import { describe, expect, it } from "vitest";
import { gbvHealth } from "./gbvApi";

describe("configured Django API", () => {
  it("responds from the configured health endpoint", async () => {
    await expect(gbvHealth()).resolves.toMatchObject({ status: "ok" });
  }, 10_000);
});
