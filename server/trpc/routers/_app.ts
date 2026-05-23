import { router } from "../init";
import { taskRouter } from "./task";
import { projectRouter } from "./project";

export const appRouter = router({
  task: taskRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
