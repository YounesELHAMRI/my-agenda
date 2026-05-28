"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { ChevronDown, ChevronRight, Flag, Trash2, X } from "lucide-react";
import { toDateInputValue, fromDateInputValue } from "@/lib/date";
import { SubtaskRow } from "./SubtaskRow";
import { RemindersSection } from "./RemindersSection";

const PRIORITIES = [
  { value: 1, label: "P1", color: "text-red-500 fill-red-500" },
  { value: 2, label: "P2", color: "text-orange-500 fill-orange-500" },
  { value: 3, label: "P3", color: "text-blue-500 fill-blue-500" },
  { value: 4, label: "Aucune", color: "text-gray-400" },
] as const;

export function TaskDetailDrawer({
  task,
  projectId,
  onClose,
}: {
  task: TaskWithSubtasks;
  projectId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.id, task.title, task.description]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { data: projects = [] } = trpc.project.list.useQuery();
  const { data: parentTasks = [] } = trpc.task.list.useQuery({ projectId });

  const update = trpc.task.update.useMutation({
    onSuccess: () => utils.task.list.invalidate({ projectId }),
  });

  const createSubtask = trpc.task.create.useMutation({
    onSuccess: () => {
      setNewSubtaskTitle("");
      utils.task.list.invalidate({ projectId });
    },
  });

  const move = trpc.task.move.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      router.refresh();
      onClose();
    },
  });

  const del = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId });
      router.refresh();
      onClose();
    },
  });

  function saveTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      update.mutate({ id: task.id, title: trimmed });
    }
  }

  function saveDescription() {
    const value = description.trim() === "" ? null : description;
    if (value !== (task.description ?? null)) {
      update.mutate({ id: task.id, description: value });
    }
  }

  function handleClose() {
    // Flush any pending text edits before unmount (mobile blur is unreliable
    // when the input is unmounted while focused)
    saveTitle();
    saveDescription();
    onClose();
  }

  function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    createSubtask.mutate({
      projectId,
      parentTaskId: task.id,
      title: trimmed,
    });
  }

  const activeSubtasks = task.subtasks.filter((sub) => sub.status !== "DONE");
  const completedSubtasks = task.subtasks.filter((sub) => sub.status === "DONE");
  const totalSubtasks = task.subtasks.length;
  const completedCount = completedSubtasks.length;
  const progress =
    totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={handleClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 w-full sm:w-96 max-w-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl z-50 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xs uppercase tracking-wide text-gray-500">
            Détail
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            enterKeyHint="done"
            className="w-full text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-50 placeholder-gray-400 px-0"
            placeholder="Titre de la tâche"
          />

          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              rows={4}
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50 resize-none"
              placeholder="Ajouter une description..."
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 block">
              Sous-tâches{" "}
              {totalSubtasks > 0 && (
                <span className="text-gray-400 normal-case tracking-normal ml-1">
                  ({completedCount}/{totalSubtasks})
                </span>
              )}
            </label>
            {totalSubtasks > 0 && (
              <div className="mb-3 space-y-2">
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{progress}% terminé</span>
                  <span>
                    {completedCount} faite{completedCount > 1 ? "s" : ""} sur{" "}
                    {totalSubtasks}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    À faire
                  </p>
                  {completedSubtasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowCompletedSubtasks((current) => !current)
                      }
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showCompletedSubtasks ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      {showCompletedSubtasks
                        ? "Masquer les terminées"
                        : `Afficher les terminées (${completedSubtasks.length})`}
                    </button>
                  )}
                </div>

                {activeSubtasks.length > 0 ? (
                  <ul className="space-y-1">
                    {activeSubtasks.map((sub) => (
                      <SubtaskRow
                        key={sub.id}
                        subtask={sub}
                        projectId={projectId}
                        currentParentId={task.id}
                        parentOptions={parentTasks.map((parent) => ({
                          id: parent.id,
                          title: parent.title,
                          icon: null,
                        }))}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/60 rounded-md px-3 py-2">
                    Toutes les sous-tâches sont terminées.
                  </p>
                )}
              </div>

              {showCompletedSubtasks && completedSubtasks.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                    Terminées
                  </p>
                  <ul className="space-y-1 opacity-80">
                    {completedSubtasks.map((sub) => (
                      <SubtaskRow
                        key={sub.id}
                        subtask={sub}
                        projectId={projectId}
                        currentParentId={task.id}
                        parentOptions={parentTasks.map((parent) => ({
                          id: parent.id,
                          title: parent.title,
                          icon: null,
                        }))}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <form onSubmit={addSubtask} className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Ajouter une étape..."
                enterKeyHint="send"
                className="flex-1 text-sm bg-transparent border border-dashed border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-solid text-gray-900 dark:text-gray-50"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700 flex-shrink-0"
                aria-label="Ajouter la sous-tâche"
              >
                Ajouter
              </button>
            </form>
          </div>

          <RemindersSection taskId={task.id} />

          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 block">
              Date d'échéance
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={toDateInputValue(task.dueAt)}
                onChange={(e) => {
                  const newDate = fromDateInputValue(e.target.value);
                  update.mutate({ id: task.id, dueAt: newDate });
                }}
                className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50"
              />
              {task.dueAt && (
                <button
                  type="button"
                  onClick={() => update.mutate({ id: task.id, dueAt: null })}
                  className="text-xs text-gray-500 hover:text-red-500"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 block">
              Priorité
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => {
                const active = task.priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      update.mutate({ id: task.id, priority: p.value })
                    }
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

          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 block">
              Projet
            </label>
            <select
              value={task.projectId}
              onChange={(e) => {
                const newProjectId = e.target.value;
                if (newProjectId !== task.projectId) {
                  move.mutate({ id: task.id, projectId: newProjectId });
                }
              }}
              disabled={move.isPending}
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50 disabled:opacity-50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon ? `${p.icon} ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              if (confirm("Supprimer cette tâche ?")) del.mutate({ id: task.id });
            }}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
            Supprimer
          </button>
        </footer>
      </aside>
    </>
  );
}
