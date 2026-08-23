import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(1, "Password is required"),
  phone_number: z.string().optional(),
});

export const anonymousLoginSchema = z.object({
  reporter_code: z.string().min(1, "Reporter code is required"),
  password: z.string().min(1, "Password is required"),
});

export const submitReportSchema = z.object({
  category_id: z.string().min(1, "Select an incident category"),
  incident_date: z.string().min(1, "Select the date of incident"),
  campus_option: z.string().min(1, "Select a campus"),
  department_option: z.string().min(1, "Select a department"),
  location_text: z.string().optional(),
  description: z.string().min(20, "Please provide at least 20 characters of description"),
  victim_gender: z.enum(["female", "male", "non_binary", "self_describe", "prefer_not_to_say"]),
  suspect_type: z.enum(["student", "lecturer", "staff", "visitor", "other"]).optional(),
  suspect_campus: z.string().optional(),
  suspect_department: z.string().optional(),
  suspect_details: z.object({
    name: z.string().optional(),
    identifier: z.string().optional(),
    relationship: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

export const createOfficerSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(1, "Password is required"),
  department: z.string().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().min(1, "Description is required"),
  default_priority: z.enum(["low", "medium", "high", "critical"]),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type SubmitReportFormData = z.infer<typeof submitReportSchema>;
export type CreateOfficerFormData = z.infer<typeof createOfficerSchema>;
export type CreateCategoryFormData = z.infer<typeof createCategorySchema>;
