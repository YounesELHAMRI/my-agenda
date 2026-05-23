"use client";

import { trpc } from "@/lib/trpc/client";
import type { Task } from "@prisma/client";
import { Flag, Trash2 } from "lucide-react";
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
}: {
  task: Task;
  projectId: string;
  onSelect: () => void;
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

  return (
    <li
      onClick={onSelect}
      className="flex items-center gap-3 py-2.5 group hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 rounded-md cursor-pointer"
    >
      <input
        type="checkbox"
        checked={done}
        onChange={() => toggle.mutate({ id: task.id })}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
      />
      {showFlag && (
        <Flag
          size={14}
          className={PRIORITY_COLORS[task.priority] ?? "text-gray-400"}
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
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
        aria-label="Supprimer"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
