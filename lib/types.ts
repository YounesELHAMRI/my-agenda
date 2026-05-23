import type { Task, TaskStatus } from "@prisma/client";

export type SubtaskMeta = {
  id: string;
  status: TaskStatus;
  title: string;
};

export type TaskWithSubtasks = Task & {
  subtasks: SubtaskMeta[];
};
