import "./globals.css";
import type { Metadata, Viewport } from "next";
import { TRPCProvider } from "@/lib/trpc/Provider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "My Agenda",
  description: "Gestionnaire de tâches personnel et professionnel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "My Agenda",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
