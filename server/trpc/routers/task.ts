import { router, protectedProcedure } from "../init";

export const taskRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.task.findMany({
      where: {
        project: {
          members: { some: { userId: ctx.session.user.id } },
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  }),
});
