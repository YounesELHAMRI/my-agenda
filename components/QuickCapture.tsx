"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc/client";
import { Plus, X } from "lucide-react";

export function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Mark mounted so we can use document.body for the portal (only available
  // on the client). MobileSidebar applies a `transform`, which would make
  // the modal's `fixed left-1/2` resolve relative to the sidebar (~256px)
  // instead of the viewport. Portaling to body escapes that containing block.
  useEffect(() => setMounted(true), []);

  const { data: inbox } = trpc.project.inbox.useQuery();

  const create = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setIsOpen(false);
      utils.task.list.invalidate();
    },
  });

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

  useEffect(() => {
    if (isOpen) {
      // Focus after the modal mounts
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!inbox || !trimmed) return;
    create.mutate({ projectId: inbox.id, title: trimmed });
  }

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
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Que veux-tu noter ?"
            enterKeyHint="send"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !inbox || create.isPending}
              className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700"
            >
              Capturer
            </button>
          </div>
        </form>
        {!inbox && (
          <p className="text-xs text-red-500 mt-2">
            Inbox introuvable — recharge la page pour que le seed se fasse.
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
