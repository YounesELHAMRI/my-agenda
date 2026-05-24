import { router } from "../init";
import { taskRouter } from "./task";
import { projectRouter } from "./project";
import { reminderRouter } from "./reminder";
import { pushRouter } from "./push";

export const appRouter = router({
  task: taskRouter,
  project: projectRouter,
  reminder: reminderRouter,
  push: pushRouter,
});

export type AppRouter = typeof appRouter;
