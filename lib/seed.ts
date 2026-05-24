import { prisma } from "@/lib/prisma";

/**
 * Default projects that were added after some users already signed up.
 * `events.createUser` in lib/auth.ts handles fresh sign-ups; this list is
 * the back-fill applied on every /projects render so existing users get
 * the new project the next time they visit.
 *
 * Match is by exact name. If a user renamed the project we won't recreate
 * a duplicate — that's the intended trade-off.
 */
const BACKFILL_DEFAULTS = [
  { name: "Souhaits", icon: "⭐", color: "#A855F7", position: 3 },
];

export async function ensureDefaultProjects(userId: string): Promise<void> {
  for (const p of BACKFILL_DEFAULTS) {
    const exists = await prisma.project.findFirst({
      where: {
        name: p.name,
        members: { some: { userId } },
      },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.project.create({
      data: {
        ...p,
        members: { create: { userId, role: "OWNER" } },
      },
    });
  }
}
