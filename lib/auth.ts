import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const DEFAULT_PROJECTS = [
  { name: "Inbox", icon: "📥", isInbox: true, position: 0 },
  { name: "Personnel", icon: "🏠", color: "#3B82F6", position: 1 },
  { name: "Travail", icon: "💼", color: "#10B981", position: 2 },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const userId = user.id;
      await prisma.$transaction(
        DEFAULT_PROJECTS.map((p) =>
          prisma.project.create({
            data: {
              ...p,
              members: { create: { userId, role: "OWNER" } },
            },
          })
        )
      );
    },
  },
});
