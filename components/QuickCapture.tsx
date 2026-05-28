"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TaskComposer } from "@/components/TaskComposer";

export function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: inbox } = trpc.project.inbox.useQuery();

  // Mark mounted so we can use document.body for the portal (only available
  // on the client). MobileSidebar applies a `transform`, which would make
  // the modal's `fixed left-1/2` resolve relative to the sidebar (~256px)
  // instead of the viewport. Portaling to body escapes that containing block.
  useEffect(() => setMounted(true), []);

  // Ctrl+K / Cmd+K → open. Esc → close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const modal = (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => setIsOpen(false)}
        aria-hidden
      />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[480px] max-w-[92vw] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            📥 Capture rapide → Inbox
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
        {inbox ? (
          <TaskComposer
            projectId={inbox.id}
            allowProjectSelection
            placeholder="Que veux-tu noter ?"
            submitLabel="Capturer"
            autoFocus
            onCreated={() => setIsOpen(false)}
            onCancel={() => setIsOpen(false)}
          />
        ) : (
          <p className="text-sm text-red-500">
            Inbox introuvable, recharge la page pour réessayer.
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 mb-2"
        aria-label="Capture rapide vers l'Inbox"
      >
        <Plus size={16} />
        Capturer
        <span className="ml-auto text-xs text-gray-400 hidden sm:inline">
          Ctrl+K
        </span>
      </button>

      {isOpen && mounted && createPortal(modal, document.body)}
    </>
  );
}
