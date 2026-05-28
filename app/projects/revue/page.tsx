import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDueDate } from "@/lib/date";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCheck,
  Clock3,
  FolderKanban,
  ListTodo,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default async function WeeklyReviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: session.user.id } },
      archivedAt: null,
    },
    orderBy: [{ isInbox: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: { tasks: { where: { status: { in: ["TODO", "IN_PROGRESS"] } } } },
      },
    },
  });

  const tasks = await prisma.task.findMany({
    where: {
      parentTaskId: null,
      status: { in: ["TODO", "IN_PROGRESS"] },
      project: {
        archivedAt: null,
        members: { some: { userId: session.user.id } },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
          isInbox: true,
        },
      },
      subtasks: {
        select: { status: true },
      },
    },
    orderBy: [
      { dueAt: { sort: "asc", nulls: "last" } },
      { priority: "asc" },
      { position: "asc" },
      { createdAt: "desc" },
    ],
  });

  const overdue = tasks.filter(
    (task) => task.dueAt && startOfDay(task.dueAt) < today
  );
  const dueThisWeek = tasks.filter((task) => {
    if (!task.dueAt) return false;
    const due = startOfDay(task.dueAt);
    return due >= today && due < weekEnd;
  });
  const noDueDate = tasks.filter((task) => !task.dueAt);
  const highPriority = tasks.filter((task) => task.priority <= 2);

  const focusTasks = [...tasks]
    .sort((a, b) => {
      const aDue = a.dueAt ? startOfDay(a.dueAt).getTime() : null;
      const bDue = b.dueAt ? startOfDay(b.dueAt).getTime() : null;

      if (aDue !== null && bDue !== null && aDue !== bDue) {
        return aDue - bDue;
      }
      if (aDue !== null && bDue === null) return -1;
      if (aDue === null && bDue !== null) return 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 5);

  const projectsByLoad = [...projects]
    .filter((project) => project._count.tasks > 0)
    .sort((a, b) => b._count.tasks - a._count.tasks)
    .slice(0, 4);

  const totalOpenTasks = tasks.length;
  const completedToday = tasks.filter((task) => task.status === "DONE").length;

  const hasAnyTasks = totalOpenTasks > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 via-white to-sky-100 dark:from-blue-950/40 dark:via-gray-950 dark:to-gray-900 shadow-sm">
        <div className="p-6 sm:p-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/80 dark:bg-blue-950/40 dark:text-blue-300">
              <CalendarCheck2 size={14} />
              Revue hebdo
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                Fais le point, puis choisis tes 5 vraies priorités.
              </h1>
              <p className="max-w-2xl text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Cette vue rassemble les tâches en retard, celles qui arrivent
                cette semaine et les projets qui méritent un coup d'oeil. L'idée
                est simple: commencer par décider quoi terminer, avant de se
                remettre à exécuter.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/70 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Tâches ouvertes
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
                {totalOpenTasks}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                En retard
              </p>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {overdue.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Cette semaine
              </p>
              <p className="mt-2 text-3xl font-semibold text-blue-600">
                {dueThisWeek.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Priorité haute
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
                {highPriority.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-50">
            <TriangleAlert size={16} className="text-red-500" />
            À traiter d'abord
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tout ce qui est déjà en retard et mérite un arbitrage immédiat.
          </p>
          <p className="text-2xl font-semibold text-red-600">{overdue.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-50">
            <Clock3 size={16} className="text-blue-500" />
            À planifier cette semaine
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Les tâches à échéance proche, à répartir dans ton calendrier.
          </p>
          <p className="text-2xl font-semibold text-blue-600">{dueThisWeek.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-50">
            <ListTodo size={16} className="text-amber-500" />
            Sans date
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Les tâches ouvertes sans échéance explicite, souvent les plus faciles
            à oublier.
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            {noDueDate.length}
          </p>
        </div>
      </section>

      {hasAnyTasks ? (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Priorités suggérées
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Le point de départ pour choisir tes 3 à 5 priorités de la
                  semaine.
                </p>
              </div>
              <Sparkles size={18} className="text-blue-500 flex-shrink-0" />
            </div>

            <ul className="space-y-3">
              {focusTasks.map((task) => {
                const due = task.dueAt ? formatDueDate(task.dueAt) : null;
                const completedSubtasks = task.subtasks.filter(
                  (subtask) => subtask.status === "DONE"
                ).length;
                const totalSubtasks = task.subtasks.length;

                return (
                  <li
                    key={task.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-300 dark:hover:border-blue-900 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {task.project.icon ? (
                            <span>{task.project.icon}</span>
                          ) : (
                            <FolderKanban size={12} />
                          )}
                          <Link
                            href={`/projects/${task.project.id}`}
                            className="hover:text-blue-600 dark:hover:text-blue-300"
                          >
                            {task.project.isInbox
                              ? "Boîte de réception"
                              : task.project.name}
                          </Link>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-50 leading-snug">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {task.priority < 4 && (
                            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                              P{task.priority}
                            </span>
                          )}
                          {due && (
                            <span
                              className={`rounded-full px-2 py-0.5 ${
                                due.tone === "past"
                                  ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                                  : due.tone === "today"
                                    ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300"
                                    : due.tone === "soon"
                                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {due.label}
                            </span>
                          )}
                          {totalSubtasks > 0 && (
                            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                              {completedSubtasks}/{totalSubtasks} sous-tâches
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/projects/${task.project.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-300 hover:underline flex-shrink-0"
                      >
                        Ouvrir
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCheck size={18} className="text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Projets à surveiller
                </h2>
              </div>

              <ul className="space-y-3">
                {projectsByLoad.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-900 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: project.color ?? "#60A5FA",
                          }}
                        />
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                          {project.icon ? `${project.icon} ` : ""}
                          {project.name}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {project._count.tasks} ouvertes
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Ce que cette vue doit t'aider à décider
              </h2>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>1. Quelles tâches sont vraiment prioritaires cette semaine.</li>
                <li>2. Ce qu'on peut repousser sans stress.</li>
                <li>3. Les projets qui ont besoin d'un coup de relance.</li>
              </ul>
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
            <Sparkles size={20} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              Aucune tâche ouverte pour le moment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tu peux commencer par capturer une tâche rapide, puis revenir ici
              pour faire ta revue hebdo.
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Aller aux projets
            <ArrowRight size={14} />
          </Link>
        </section>
      )}
    </div>
  );
}
