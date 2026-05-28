"use client";

import { Fragment, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { TaskRow } from "./TaskRow";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { InlineSubtaskRow } from "./InlineSubtaskRow";
import { TaskComposer } from "./TaskComposer";

export function TasksPanel({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: TaskWithSubtasks[];
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: tasks } = trpc.task.list.useQuery(
    { projectId },
    { initialData: initialTasks }
  );

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
      <TaskComposer
        projectId={projectId}
        placeholder="Ajouter une tâche..."
        submitLabel="Ajouter"
        autoFocus
      />

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
