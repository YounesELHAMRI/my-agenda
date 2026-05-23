"use client";

import { trpc } from "@/lib/trpc/client";
import type { SubtaskMeta } from "@/lib/types";
import { Trash2 } from "lucide-react";

export function InlineSubtaskRow({
  subtask,
  projectId,
}: {
  subtask: SubtaskMeta;
  projectId: string;
}) {
  const utils = trpc.useUtils();

  const toggle = trpc.task.toggle.useMutation({
    async onMutate() {
      await utils.task.list.cancel({ projectId });
      const prev = utils.task.list.getData({ projectId });
      utils.task.list.setData({ projectId }, (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === subtask.id
              ? { ...s, status: s.status === "DONE" ? "TODO" : "DONE" }
              : s
          ),
        }))
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
    onSettled: () => utils.task.list.invalidate({ projectId }),
  });

  const done = subtask.status === "DONE";

  return (
    <li className="flex items-center gap-3 py-1.5 pl-10 pr-2 -mx-2 group hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-md text-sm">
      <input
        type="checkbox"
        checked={done}
        onChange={() => toggle.mutate({ id: subtask.id })}
        className="h-3.5 w-3.5 rounded border-gray-300 cursor-pointer flex-shrink-0"
      />
      <span
        className={`flex-1 truncate ${
          done
            ? "line-through text-gray-400 dark:text-gray-600"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {subtask.title}
      </span>
      <button
        type="button"
        onClick={() => {
          if (confirm("Supprimer cette sous-tâche ?"))
            del.mutate({ id: subtask.id });
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
        aria-label="Supprimer"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
