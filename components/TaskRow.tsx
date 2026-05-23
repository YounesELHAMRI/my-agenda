"use client";

import { trpc } from "@/lib/trpc/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { Flag, Trash2, ListChecks, Plus, Minus } from "lucide-react";
import { formatDueDate, type DueTone } from "@/lib/date";

const PRIORITY_COLORS: Record<number, string> = {
  1: "text-red-500 fill-red-500",
  2: "text-orange-500 fill-orange-500",
  3: "text-blue-500 fill-blue-500",
};

const TONE_CLASSES: Record<DueTone, string> = {
  past: "text-red-500",
  today: "text-orange-500",
  soon: "text-blue-500",
  future: "text-gray-500",
};

export function TaskRow({
  task,
  projectId,
  onSelect,
  expanded,
  onToggleExpand,
}: {
  task: TaskWithSubtasks;
  projectId: string;
  onSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const utils = trpc.useUtils();

  const toggle = trpc.task.toggle.useMutation({
    async onMutate() {
      await utils.task.list.cancel({ projectId });
      const prev = utils.task.list.getData({ projectId });
      utils.task.list.setData({ projectId }, (old) =>
        old?.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: t.status === "DONE" ? "TODO" : "DONE",
                completedAt: t.status === "DONE" ? null : new Date(),
              }
            : t
        )
      );
      return { prev };
    },
    onError(_e, _v, ctx) {
      if (ctx?.prev) utils.task.list.setData({ projectId }, ctx.prev);
    },
    onSettled() {
      utils.task.list.invalidate({ projectId });
    },
  });

  const del = trpc.task.delete.useMutation({
    onSuccess: () => utils.task.list.invalidate({ projectId }),
  });

  const done = task.status === "DONE";
  const due = task.dueAt ? formatDueDate(task.dueAt) : null;
  const showFlag = task.priority < 4;
  const hasSubtasks = task.subtasks.length > 0;
  const subtaskTotal = task.subtasks.length;
  const subtaskDone = task.subtasks.filter((s) => s.status === "DONE").length;

  return (
    <li
      onClick={onSelect}
      className="flex items-center gap-3 py-2.5 group hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 rounded-md cursor-pointer"
    >
      {hasSubtasks ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="flex items-center justify-center w-5 h-5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 flex-shrink-0"
          aria-label={
            expanded ? "Réduire les sous-tâches" : "Afficher les sous-tâches"
          }
        >
          {expanded ? <Minus size={14} /> : <Plus size={14} />}
        </button>
      ) : (
        <span className="w-5 h-5 flex-shrink-0" aria-hidden />
      )}
      <input
        type="checkbox"
        checked={done}
        onChange={() => toggle.mutate({ id: task.id })}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
      />
      {showFlag && (
        <Flag
          size={14}
          className={`flex-shrink-0 ${PRIORITY_COLORS[task.priority] ?? "text-gray-400"}`}
          aria-label={`Priorité P${task.priority}`}
        />
      )}
      <span
        className={`flex-1 truncate ${
          done
            ? "line-through text-gray-400 dark:text-gray-600"
            : "text-gray-900 dark:text-gray-50"
        }`}
      >
        {task.title}
      </span>
      {subtaskTotal > 0 && (
        <span
          className={`flex items-center gap-1 text-xs whitespace-nowrap ${
            subtaskDone === subtaskTotal ? "text-green-600" : "text-gray-500"
          } ${done ? "opacity-50" : ""}`}
          aria-label={`${subtaskDone} sur ${subtaskTotal} sous-tâches terminées`}
        >
          <ListChecks size={12} />
          {subtaskDone}/{subtaskTotal}
        </span>
      )}
      {due && (
        <span
          className={`text-xs whitespace-nowrap ${TONE_CLASSES[due.tone]} ${
            done ? "opacity-50" : ""
          }`}
        >
          {due.label}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Supprimer cette tâche ?")) del.mutate({ id: task.id });
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
        aria-label="Supprimer"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
