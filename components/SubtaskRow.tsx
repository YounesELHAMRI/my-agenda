"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { SubtaskMeta } from "@/lib/types";
import { X } from "lucide-react";

export function SubtaskRow({
  subtask,
  projectId,
}: {
  subtask: SubtaskMeta;
  projectId: string;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(subtask.title);

  useEffect(() => {
    setTitle(subtask.title);
  }, [subtask.title]);

  const toggle = trpc.task.toggle.useMutation({
    onSettled: () => utils.task.list.invalidate({ projectId }),
  });

  const update = trpc.task.update.useMutation({
    onSettled: () => utils.task.list.invalidate({ projectId }),
  });

  const del = trpc.task.delete.useMutation({
    onSettled: () => utils.task.list.invalidate({ projectId }),
  });

  const done = subtask.status === "DONE";

  return (
    <li className="flex items-center gap-2 group">
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
        className={`flex-1 text-sm bg-transparent border-none px-1 py-0.5 rounded focus:bg-gray-100 dark:focus:bg-gray-800 focus:outline-none ${
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
    </li>
  );
}
