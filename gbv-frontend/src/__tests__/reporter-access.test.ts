import { describe, expect, it } from "vitest";
import { mayFetchReporterCases, mayOpenReporterCaseMessages } from "../utils/reporterAccess";

describe("reporter access selection", () => {
  it("never enables the officer-only cases feed for anonymous reporters", () => {
    expect(mayFetchReporterCases(true)).toBe(false);
    expect(mayFetchReporterCases(false)).toBe(true);
  });

  it("only enables case messaging when an identified reporter has a case", () => {
    expect(mayOpenReporterCaseMessages(true, "case-1")).toBe(false);
    expect(mayOpenReporterCaseMessages(false, null)).toBe(false);
    expect(mayOpenReporterCaseMessages(false, "case-1")).toBe(true);
  });
});
