import { router } from "../init";
import { taskRouter } from "./task";

export const appRouter = router({
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
