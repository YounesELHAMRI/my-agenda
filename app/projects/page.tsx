import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsRootPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const project = await prisma.project.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    orderBy: [{ isInbox: "desc" }, { position: "asc" }],
    select: { id: true },
  });

  if (!project) redirect("/");
  redirect(`/projects/${project.id}`);
}
