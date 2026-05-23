import "./globals.css";
import type { Metadata } from "next";
import { TRPCProvider } from "@/lib/trpc/Provider";

export const metadata: Metadata = {
  title: "Task App",
  description: "Personal task manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
