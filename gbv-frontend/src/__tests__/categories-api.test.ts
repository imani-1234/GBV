import { describe, expect, it, vi } from "vitest";

vi.mock("../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from "../api/client";
import { categoriesApi, normalizeCategoryList } from "../api/categories";

const category = {
  id: "category-1",
  name: "Physical Assault",
  description: "Physical assault incident",
  default_priority: "high",
};

describe("category response normalization", () => {
  it("keeps a plain array unchanged", () => {
    expect(normalizeCategoryList([category])).toEqual([category]);
  });

  it("unwraps a paginated results envelope", () => {
    expect(normalizeCategoryList({ count: 1, results: [category] })).toEqual([category]);
  });

  it("returns an empty array for malformed or empty payloads", () => {
    expect(normalizeCategoryList(undefined)).toEqual([]);
    expect(normalizeCategoryList({ detail: "temporarily unavailable" })).toEqual([]);
    expect(normalizeCategoryList(null)).toEqual([]);
  });

  it("normalizes the API list response before returning it", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { count: 1, results: [category] },
    } as never);

    await expect(categoriesApi.list()).resolves.toEqual([category]);
  });
});
