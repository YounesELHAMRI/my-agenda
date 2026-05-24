import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureDefaultProjects } from "@/lib/seed";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  // Back-fill any default projects added after this user signed up.
  await ensureDefaultProjects(session.user.id);

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <MobileSidebar>
        <Sidebar />
      </MobileSidebar>
      <main className="flex-1 p-4 pt-16 md:p-6 md:pt-6 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
