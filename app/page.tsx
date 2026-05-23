import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/projects");

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Task App
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Organise tes tâches perso et pro.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/projects" });
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
