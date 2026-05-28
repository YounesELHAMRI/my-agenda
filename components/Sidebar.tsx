import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuickCapture } from "@/components/QuickCapture";
import { SidebarNav } from "@/components/SidebarNav";

export async function Sidebar() {
  const session = await auth();
  if (!session?.user) return null;

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: session.user.id } },
      archivedAt: null,
    },
    orderBy: [{ isInbox: "desc" }, { position: "asc" }],
    include: {
      _count: {
        select: { tasks: { where: { status: { not: "DONE" } } } },
      },
    },
  });

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-1 bg-gray-50 dark:bg-gray-950">
      <QuickCapture />
      <SidebarNav />

      <h2 className="text-xs uppercase tracking-wide text-gray-500 px-2 mb-2">
        Projets
      </h2>
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-800/60 text-sm"
        >
          <span className="flex items-center gap-2 truncate">
            {p.icon && <span>{p.icon}</span>}
            <span>{p.name}</span>
          </span>
          {p._count.tasks > 0 && (
            <span className="text-xs text-gray-500">{p._count.tasks}</span>
          )}
        </Link>
      ))}

      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-500 px-2 mb-2 truncate">
          {session.user.email}
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
