"use client";

import { trpc } from "@/lib/trpc/client";
import type { Task } from "@prisma/client";
import { Trash2 } from "lucide-react";

export function TaskRow({
  task,
  projectId,
}: {
  task: Task;
  projectId: string;
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

  return (
    <li className="flex items-center gap-3 py-2.5 group">
      <input
        type="checkbox"
        checked={done}
        onChange={() => toggle.mutate({ id: task.id })}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
      />
      <span
        className={
          done
            ? "line-through text-gray-400 dark:text-gray-600"
            : "text-gray-900 dark:text-gray-50"
        }
      >
        {task.title}
      </span>
      <div className="ml-auto flex items-center gap-3">
        {task.dueAt && (
          <span className="text-xs text-gray-500">
            {new Date(task.dueAt).toLocaleDateString("fr-FR")}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("Supprimer cette tâche ?")) del.mutate({ id: task.id });
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
          aria-label="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}
