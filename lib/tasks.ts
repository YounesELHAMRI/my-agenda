import type { TaskWithSubtasks } from "@/lib/types";

/**
 * Compute the optimistic list state when a subtask is toggled:
 * - flip the subtask's status
 * - if all subtasks in its parent become DONE, mark the parent DONE too
 * - if any subtask is back to non-DONE, mark the parent TODO
 *
 * Mirrors the backend rule in task.toggle so the UI updates instantly.
 */
export function optimisticToggleSubtask(
  list: TaskWithSubtasks[],
  subtaskId: string
): TaskWithSubtasks[] {
  return list.map((parentTask) => {
    const hasSubtask = parentTask.subtasks.some((s) => s.id === subtaskId);
    if (!hasSubtask) return parentTask;

    const newSubtasks = parentTask.subtasks.map((s) =>
      s.id === subtaskId
        ? {
            ...s,
            status: (s.status === "DONE" ? "TODO" : "DONE") as typeof s.status,
          }
        : s
    );
    const allDone =
      newSubtasks.length > 0 &&
      newSubtasks.every((s) => s.status === "DONE");
    const newParentStatus = (allDone ? "DONE" : "TODO") as typeof parentTask.status;

    return {
      ...parentTask,
      subtasks: newSubtasks,
      status: newParentStatus,
      completedAt:
        newParentStatus === "DONE"
          ? parentTask.completedAt ?? new Date()
          : null,
    };
  });
}
