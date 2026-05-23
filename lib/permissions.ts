import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import type { ProjectRole } from "@prisma/client";

const ROLE_RANK: Record<ProjectRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export async function requireProjectAccess(
  projectId: string,
  userId: string,
  minRole: ProjectRole = "VIEWER"
): Promise<void> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Vous n'êtes pas membre de ce projet",
    });
  }
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission insuffisante (requis: ${minRole})`,
    });
  }
}
