"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CalendarDays, Flag, FolderKanban, Loader2 } from "lucide-react";

const PRIORITIES = [
  { value: 1, label: "P1", color: "text-red-500 fill-red-500" },
  { value: 2, label: "P2", color: "text-orange-500 fill-orange-500" },
  { value: 3, label: "P3", color: "text-blue-500 fill-blue-500" },
  { value: 4, label: "Aucune", color: "text-gray-400" },
] as const;

function shiftDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export function TaskComposer({
  projectId,
  allowProjectSelection = false,
  placeholder = "Ajouter une tâche...",
  submitLabel = "Ajouter",
  autoFocus = false,
  onCreated,
  onCancel,
}: {
  projectId: string;
  allowProjectSelection?: boolean;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onCreated?: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [priority, setPriority] = useState<number>(4);
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const router = useRouter();

  useEffect(() => {
    setSelectedProjectId(projectId);
  }, [projectId]);

  const { data: projects = [] } = trpc.project.list.useQuery(undefined, {
    enabled: allowProjectSelection,
  });

  const create = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDueAt(null);
      setPriority(4);
      setError(null);
      utils.task.list.invalidate();
      router.refresh();
      onCreated?.();
    },
    onError: (err) => {
      setError(err.message || "Impossible de créer la tâche.");
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || create.isPending) return;
    setError(null);
    create.mutate({
      projectId: selectedProjectId,
      title: trimmed,
      dueAt: dueAt ?? undefined,
      priority: priority === 4 ? undefined : priority,
    });
  }

  const selectedProject = allowProjectSelection
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : null;

  return (
    <form onSubmit={submit} className="space-y-3">
      {allowProjectSelection && (
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-gray-500">
            Projet cible
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon ? `${p.icon} ` : ""}
                {p.name}
              </option>
            ))}
          </select>
          {selectedProject && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <FolderKanban size={12} />
              Création dans {selectedProject.icon ? `${selectedProject.icon} ` : ""}
              {selectedProject.name}
            </p>
          )}
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="send"
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            (e.target as HTMLInputElement).form?.requestSubmit();
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50"
      />

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
          <CalendarDays size={12} />
          Date
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDueAt(shiftDays(0))}
            className={`px-2.5 py-1.5 rounded-md text-xs border ${
              dueAt?.getTime() === shiftDays(0).getTime()
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 hover:border-gray-400"
            }`}
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setDueAt(shiftDays(1))}
            className={`px-2.5 py-1.5 rounded-md text-xs border ${
              dueAt?.getTime() === shiftDays(1).getTime()
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 hover:border-gray-400"
            }`}
          >
            Demain
          </button>
          <button
            type="button"
            onClick={() => setDueAt(shiftDays(7))}
            className={`px-2.5 py-1.5 rounded-md text-xs border ${
              dueAt?.getTime() === shiftDays(7).getTime()
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 hover:border-gray-400"
            }`}
          >
            +7 jours
          </button>
          <button
            type="button"
            onClick={() => setDueAt(null)}
            className={`px-2.5 py-1.5 rounded-md text-xs border ${
              dueAt === null
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 hover:border-gray-400"
            }`}
          >
            Sans date
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
          <Flag size={12} />
          Priorité
        </div>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                  active
                    ? "border-current bg-gray-50 dark:bg-gray-800"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400"
                } ${active ? p.color : ""}`}
              >
                <Flag size={12} className={active ? p.color : ""} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={!title.trim() || create.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700"
        >
          {create.isPending && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
