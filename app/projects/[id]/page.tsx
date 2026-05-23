import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TasksPanel } from "@/components/TasksPanel";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const project = await prisma.project.findFirst({
    where: {
      id,
      members: { some: { userId: session.user.id } },
    },
  });
  if (!project) notFound();

  const initialTasks = await prisma.task.findMany({
    where: { projectId: id, parentTaskId: null },
    orderBy: [
      { completedAt: { sort: "asc", nulls: "first" } },
      { priority: "asc" },
      { dueAt: { sort: "asc", nulls: "last" } },
      { position: "asc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-50">
        {project.icon && <span className="mr-2">{project.icon}</span>}
        {project.name}
      </h1>
      <TasksPanel projectId={id} initialTasks={initialTasks} />
    </div>
  );
}
