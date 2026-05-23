"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close when route changes (e.g. user picks a project)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm text-gray-700 dark:text-gray-200"
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar container: fixed slide-in on mobile, static flex item on md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform md:relative md:z-auto md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}
