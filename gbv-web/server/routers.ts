import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { djangoLogin, djangoLogout, djangoSession, gbvAuthedFetch, gbvHealth, GbvApiError } from "./gbvApi";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

function toTrpcError(error: unknown): never {
  if (error instanceof GbvApiError) {
    if (error.status === 401) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your Django session has expired." });
    if (error.status === 403) throw new TRPCError({ code: "FORBIDDEN", message: error.message });
    if (error.status >= 500) throw new TRPCError({ code: "BAD_GATEWAY", message: "The safeguarding API is temporarily unavailable." });
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  gbvAuth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      try {
        return await djangoSession(ctx.req, ctx.res);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1), totpCode: z.string().optional() })).mutation(async ({ ctx, input }) => {
      try {
        return await djangoLogin(ctx.req, ctx.res, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => djangoLogout(ctx.req, ctx.res)),
  }),
  gbv: router({
    health: publicProcedure.query(async () => gbvHealth()),
    cases: router({
      list: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, "cases/")),
      detail: publicProcedure.input(z.object({ id: z.string().uuid() })).query(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `cases/${input.id}/`)),
      transition: publicProcedure.input(z.object({ id: z.string().uuid(), newStatus: z.string().min(1), note: z.string().max(4000).optional() })).mutation(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `cases/${input.id}/transition/`, { method: "POST", body: JSON.stringify({ new_status: input.newStatus, note: input.note ?? "" }) })),
      notes: publicProcedure.input(z.object({ id: z.string().uuid() })).query(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, `cases/${input.id}/notes/`)),
      addNote: publicProcedure.input(z.object({ id: z.string().uuid(), noteText: z.string().min(1).max(4000), isInternal: z.boolean().default(true) })).mutation(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `cases/${input.id}/notes/`, { method: "POST", body: JSON.stringify({ note_text: input.noteText, is_internal: input.isInternal }) })),
      requestInformation: publicProcedure.input(z.object({ id: z.string().uuid(), message: z.string().min(1).max(4000) })).mutation(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `cases/${input.id}/request-information/`, { method: "POST", body: JSON.stringify({ message: input.message }) })),
      messages: publicProcedure.input(z.object({ id: z.string().uuid() })).query(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>[] | { results: Record<string, unknown>[] }>(ctx.req, ctx.res, `cases/${input.id}/messages/`)),
      sendMessage: publicProcedure.input(z.object({ id: z.string().uuid(), body: z.string().min(1).max(5000) })).mutation(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `cases/${input.id}/messages/`, { method: "POST", body: JSON.stringify({ body: input.body }) })),
      sendMessageAttachment: publicProcedure.input(z.object({ id: z.string().uuid(), body: z.string().max(5000).optional(), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), base64: z.string().min(1).max(35_000_000) })).mutation(({ ctx, input }) => {
        const bytes = Buffer.from(input.base64, "base64");
        if (bytes.byteLength > 25 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Files must be 25MB or smaller." });
        const form = new FormData();
        if (input.body?.trim()) form.append("body", input.body.trim());
        form.append("attachments", new Blob([bytes], { type: input.mimeType }), input.fileName);
        return gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `cases/${input.id}/messages/`, { method: "POST", body: form });
      }),
    }),
    reports: router({
      list: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, "reports/")),
      detail: publicProcedure.input(z.object({ id: z.string().uuid() })).query(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `reports/${input.id}/`)),
      submit: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `reports/${input.id}/submit/`, { method: "POST", body: JSON.stringify({}) })),
      uploadEvidence: publicProcedure.input(z.object({ id: z.string().uuid(), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), base64: z.string().min(1).max(35_000_000) })).mutation(({ ctx, input }) => {
        const bytes = Buffer.from(input.base64, "base64");
        if (bytes.byteLength > 25 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Evidence files must be 25MB or smaller." });
        const form = new FormData();
        form.append("file", new Blob([bytes], { type: input.mimeType }), input.fileName);
        return gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `reports/${input.id}/evidence/`, { method: "POST", body: form });
      }),
      categories: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, "categories/")),
    }),
    analytics: router({
      summary: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, "analytics/summary/")),
      byMonth: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, "analytics/by-month/")),
      byDepartment: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, "analytics/by-department/")),
      auditLogs: publicProcedure.input(z.object({ page: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => gbvAuthedFetch<Record<string, unknown>>(ctx.req, ctx.res, `analytics/audit-logs/${input?.page ? `?page=${input.page}` : ""}`)),
    }),
    admin: router({
      officers: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, "admin/officers/")),
      categories: publicProcedure.query(({ ctx }) => gbvAuthedFetch<Record<string, unknown>[]>(ctx.req, ctx.res, "admin/categories/")),
    }),
  }),
});

export type AppRouter = typeof appRouter;
