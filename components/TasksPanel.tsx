"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { TaskRow } from "./TaskRow";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { InlineSubtaskRow } from "./InlineSubtaskRow";

export function TasksPanel({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: TaskWithSubtasks[];
}) {
  const [title, setTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const utils = trpc.useUtils();
  const router = useRouter();

  const { data: tasks } = trpc.task.list.useQuery(
    { projectId },
    { initialData: initialTasks }
  );

  const create = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      utils.task.list.invalidate({ projectId });
      router.refresh();
    },
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = title.trim();
          if (!trimmed) return;
          create.mutate({ projectId, title: trimmed });
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ajouter une tâche..."
          enterKeyHint="send"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={!title.trim() || create.isPending}
          className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          Ajouter
        </button>
      </form>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {tasks.length === 0 ? (
          <li className="py-8 text-center text-sm text-gray-500">
            Aucune tâche. Commence par en ajouter une.
          </li>
        ) : (
          tasks.map((task) => (
            <Fragment key={task.id}>
              <TaskRow
                task={task}
                projectId={projectId}
                onSelect={() => setSelectedTaskId(task.id)}
                expanded={expanded.has(task.id)}
                onToggleExpand={() => toggleExpand(task.id)}
              />
              {expanded.has(task.id) &&
                task.subtasks.map((sub) => (
                  <InlineSubtaskRow
                    key={sub.id}
                    subtask={sub}
                    projectId={projectId}
                  />
                ))}
            </Fragment>
          ))
        )}
      </ul>

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
