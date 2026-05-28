"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";

export function SidebarNav() {
  const pathname = usePathname();
  const active = pathname === "/projects/revue";

  return (
    <nav>
      <h2 className="text-xs uppercase tracking-wide text-gray-500 px-2 mb-2">
        Principal
      </h2>
      <Link
        href="/projects/revue"
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${
          active
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            : "hover:bg-gray-200/60 dark:hover:bg-gray-800/60 text-gray-800 dark:text-gray-200"
        }`}
      >
        <CalendarCheck2 size={16} className="flex-shrink-0" />
        <span className="truncate">Revue hebdo</span>
      </Link>
    </nav>
  );
}
