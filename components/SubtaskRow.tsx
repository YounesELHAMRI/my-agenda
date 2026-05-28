"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import type { SubtaskMeta } from "@/lib/types";
import { optimisticToggleSubtask } from "@/lib/tasks";
import { X } from "lucide-react";

export function SubtaskRow({
  subtask,
  projectId,
  currentParentId,
  parentOptions,
}: {
  subtask: SubtaskMeta;
  projectId: string;
  currentParentId: string;
  parentOptions: { id: string; title: string; icon: string | null }[];
}) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const [title, setTitle] = useState(subtask.title);

  useEffect(() => {
    setTitle(subtask.title);
  }, [subtask.title]);

  const toggle = trpc.task.toggle.useMutation({
    async onMutate() {
      await utils.task.list.cancel({ projectId });
      const prev = utils.task.list.getData({ projectId });
      utils.task.list.setData({ projectId }, (old) =>
        old ? optimisticToggleSubtask(old, subtask.id) : old
      );
      return { prev };
    },
    onError(_e, _v, ctx) {
      if (ctx?.prev) utils.task.list.setData({ projectId }, ctx.prev);
    },
    onSettled: () => {
      utils.task.list.invalidate({ projectId });
      router.refresh();
    },
  });

  const update = trpc.task.update.useMutation({
    onSettled: () => utils.task.list.invalidate({ projectId }),
  });

  const reparent = trpc.task.reparent.useMutation({
    onSettled: () => {
      utils.task.list.invalidate({ projectId });
      router.refresh();
    },
  });

  const del = trpc.task.delete.useMutation({
    onSettled: () => {
      utils.task.list.invalidate({ projectId });
      router.refresh();
    },
  });

  const done = subtask.status === "DONE";

  return (
    <li className="group space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={done}
          onChange={() => toggle.mutate({ id: subtask.id })}
          className="h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const trimmed = title.trim();
            if (trimmed && trimmed !== subtask.title) {
              update.mutate({ id: subtask.id, title: trimmed });
            } else if (!trimmed) {
              setTitle(subtask.title);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setTitle(subtask.title);
              (e.target as HTMLInputElement).blur();
            }
          }}
          enterKeyHint="done"
          className={`flex-1 min-w-0 text-sm bg-transparent border-none px-1 py-0.5 rounded focus:bg-gray-100 dark:focus:bg-gray-800 focus:outline-none ${
            done
              ? "line-through text-gray-400 dark:text-gray-600"
              : "text-gray-900 dark:text-gray-100"
          }`}
        />
        <button
          type="button"
          onClick={() => del.mutate({ id: subtask.id })}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
          aria-label="Supprimer la sous-tâche"
        >
          <X size={14} />
        </button>
      </div>

      <div className="pl-6 grid gap-1 sm:grid-cols-[auto_1fr] sm:items-center">
        <span className="text-[10px] uppercase tracking-wide text-gray-400">
          Parent
        </span>
        <select
          value={currentParentId}
          onChange={(e) => {
            const nextParentId = e.target.value || null;
            if (nextParentId !== currentParentId) {
              reparent.mutate({ id: subtask.id, parentTaskId: nextParentId });
            }
          }}
          disabled={reparent.isPending}
          className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50 disabled:opacity-50"
        >
          <option value="">Sans parent</option>
          {parentOptions.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.icon ? `${parent.icon} ` : ""}
              {parent.title}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
