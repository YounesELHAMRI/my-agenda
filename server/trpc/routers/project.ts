import { z } from "zod";
import { router, protectedProcedure } from "../init";

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      where: {
        members: { some: { userId: ctx.session.user.id } },
        archivedAt: null,
      },
      orderBy: [
        { isInbox: "desc" },
        { position: "asc" },
        { createdAt: "asc" },
      ],
      include: {
        _count: {
          select: { tasks: { where: { status: { not: "DONE" } } } },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const last = await ctx.prisma.project.findFirst({
        where: { members: { some: { userId } } },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      return ctx.prisma.project.create({
        data: {
          ...input,
          position: (last?.position ?? 0) + 1,
          members: { create: { userId, role: "OWNER" } },
        },
      });
    }),
});
