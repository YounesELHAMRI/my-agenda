import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { requireProjectAccess } from "@/lib/permissions";

export const taskRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.session.user.id);
      return ctx.prisma.task.findMany({
        where: { projectId: input.projectId, parentTaskId: null },
        orderBy: [
          { completedAt: { sort: "asc", nulls: "first" } },
          { position: "asc" },
          { createdAt: "desc" },
        ],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        dueAt: z.date().optional(),
        priority: z.number().int().min(1).max(4).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.session.user.id, "EDITOR");
      const last = await ctx.prisma.task.findFirst({
        where: { projectId: input.projectId, parentTaskId: null },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      return ctx.prisma.task.create({
        data: {
          ...input,
          creatorId: ctx.session.user.id,
          position: (last?.position ?? 0) + 1,
        },
      });
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { projectId: true, status: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.session.user.id, "EDITOR");
      const done = task.status === "DONE";
      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          status: done ? "TODO" : "DONE",
          completedAt: done ? null : new Date(),
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().nullable().optional(),
        dueAt: z.date().nullable().optional(),
        priority: z.number().int().min(1).max(4).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const task = await ctx.prisma.task.findUnique({
        where: { id },
        select: { projectId: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.session.user.id, "EDITOR");
      return ctx.prisma.task.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.session.user.id, "EDITOR");
      await ctx.prisma.task.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
