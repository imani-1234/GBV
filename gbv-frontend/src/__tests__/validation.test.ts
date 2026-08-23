import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  submitReportSchema,
  createOfficerSchema,
  createCategorySchema,
  anonymousLoginSchema,
} from "../validation";

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "jane@test.edu",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "jane@test.edu",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      email: "jane@test.edu",
      full_name: "Jane Doe",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short full_name", () => {
    const result = registerSchema.safeParse({
      email: "jane@test.edu",
      full_name: "J",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = registerSchema.safeParse({
      email: "jane@test.edu",
      full_name: "Jane Doe",
      password: "password123",
      phone_number: "+1234567890",
    });
    expect(result.success).toBe(true);
  });
});

describe("submitReportSchema", () => {
  it("accepts valid report data", () => {
    const result = submitReportSchema.safeParse({
      category_id: "cat-1",
      incident_date: "2025-01-15",
      campus_option: "campus-1",
      department_option: "department-1",
      location_text: "Building A, Room 203",
      description: "This is a detailed description of the incident that meets the minimum length requirement.",
      victim_gender: "female",
      suspect_type: "staff",
      suspect_campus: "campus-1",
      suspect_department: "department-1",
      suspect_details: { name: "Known staff member", identifier: "STF-44" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = submitReportSchema.safeParse({
      category_id: "",
      incident_date: "",
      campus_option: "",
      department_option: "",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short description", () => {
    const result = submitReportSchema.safeParse({
      category_id: "cat-1",
      incident_date: "2025-01-15",
      campus_option: "campus-1",
      department_option: "department-1",
      description: "Too short",
      victim_gender: "male",
    });
    expect(result.success).toBe(false);
  });
});

describe("createOfficerSchema", () => {
  it("accepts valid officer data", () => {
    const result = createOfficerSchema.safeParse({
      email: "officer@test.edu",
      full_name: "Officer Smith",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createOfficerSchema.safeParse({
      email: "invalid",
      full_name: "Officer Smith",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCategorySchema", () => {
  it("accepts valid category", () => {
    const result = createCategorySchema.safeParse({
      name: "Harassment",
      description: "Reports of harassment",
      default_priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid priority", () => {
    const result = createCategorySchema.safeParse({
      name: "Harassment",
      description: "Reports of harassment",
      default_priority: "urgent",
    });
    expect(result.success).toBe(false);
  });
});

describe("anonymousLoginSchema", () => {
  it("accepts valid reporter code", () => {
    const result = anonymousLoginSchema.safeParse({
      reporter_code: "RPT-ABC123",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty code", () => {
    const result = anonymousLoginSchema.safeParse({
      reporter_code: "",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });
});
