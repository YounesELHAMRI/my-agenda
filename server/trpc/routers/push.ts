import { z } from "zod";
import { router, protectedProcedure } from "../init";

export const pushRouter = router({
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
          userId: ctx.session.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        },
        update: {
          userId: ctx.session.user.id,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
          lastUsedAt: new Date(),
        },
      });
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.deleteMany({
        where: { userId: ctx.session.user.id, endpoint: input.endpoint },
      });
      return { ok: true };
    }),
});
