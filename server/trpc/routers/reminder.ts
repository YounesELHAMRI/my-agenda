import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { requireProjectAccess } from "@/lib/permissions";

export const reminderRouter = router({
  listForTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.session.user.id);
      return ctx.prisma.reminder.findMany({
        where: { taskId: input.taskId, userId: ctx.session.user.id },
        orderBy: { remindAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        remindAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.session.user.id);
      return ctx.prisma.reminder.create({
        data: {
          taskId: input.taskId,
          userId: ctx.session.user.id,
          remindAt: input.remindAt,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reminder = await ctx.prisma.reminder.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });
      if (!reminder) throw new TRPCError({ code: "NOT_FOUND" });
      if (reminder.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.prisma.reminder.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
