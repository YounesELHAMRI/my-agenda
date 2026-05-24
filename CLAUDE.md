# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Next.js dev server (Turbopack, hot-reload)
npm run build         # production build
npm run typecheck     # tsc --noEmit (fast, no bundling)
npm run lint          # next lint

# Prisma
npm run db:migrate    # prisma migrate dev (creates + applies migration, regenerates client)
npm run db:push       # apply schema changes without a migration file (dev only)
npm run db:studio     # GUI at http://localhost:5555
npm run db:generate   # regenerate Prisma client only
```

`postinstall` runs `prisma generate` automatically.

## Stack

- **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 6**
- **Prisma 6** on **PostgreSQL (Supabase)** — pinned to v6 because v7 hits `ERR_REQUIRE_ESM` on Node 20.18. Move to v7 once on Node 22+.
- **Auth.js v5 beta** (`next-auth@beta`) with **PrismaAdapter + Google OAuth + database sessions**. `next-auth@latest` resolves to v4 — the `beta` tag is required for v5.
- **tRPC v11** + **TanStack Query** + **superjson** transformer
- **Tailwind v4** via `@tailwindcss/postcss`. `globals.css` uses `@import "tailwindcss"` (not the v3 `@tailwind` directives). `tailwind.config.ts` is mostly inert under v4 — content paths are auto-detected.
- **web-push** for VAPID-signed push notifications
- **PWA**: hand-written `public/sw.js` (no `@serwist/next`), `public/manifest.json`, `public/icon.svg`

## Domain model (prisma/schema.prisma)

The schema is built for **sharing from day one**, not bolted on. Read `prisma/schema.prisma` before changing anything in `server/trpc/routers/`.

- `Project` does **not** carry an owner column. Membership is in `ProjectMember (project_id, user_id, role)` with `OWNER | EDITOR | VIEWER`. Always go through `requireProjectAccess` in `lib/permissions.ts` for any project-scoped mutation.
- `Project.isInbox = true` is a special per-user project, seeded by Auth.js `events.createUser` in `lib/auth.ts` alongside `Personnel`, `Travail` and `Souhaits`. Not shareable, not deletable (app-level invariant).
- **Default projects added after launch** are back-filled by `lib/seed.ts → ensureDefaultProjects(userId)`, called from `app/projects/layout.tsx` on every render. Match is by exact name; renames are respected (no duplicates). When you add a new default, put it in both `DEFAULT_PROJECTS` (for new sign-ups) and `BACKFILL_DEFAULTS` (for existing users).
- `Task.parentTaskId` self-references for **arbitrary-depth subtasks**, but the UI only exposes **one level** of nesting.
- `Task.priority`: `1 = urgent → 4 = none` (Todoist convention).
- `Task.recurrenceRule`: RFC 5545 RRULE string — schema is ready, no UI yet.
- `Task.creatorId`, `Task.assigneeId`, `TaskComment.authorId`, `TaskAttachment.uploaderId` are **nullable with `onDelete: SetNull`**. Critical for shared projects: deleting a user must not vaporize content others can still see. Other user FKs (tags, reminders, push subs, project memberships) cascade because they're purely personal.
- `Reminder` is **per-user**, not per-task. Each member of a shared project manages their own reminders independently.
- `PushSubscription.endpoint` is unique — `push.subscribe` does an `upsert` keyed on endpoint.
- `TaskAttachment` is modeled but not wired to any storage backend.

## tRPC layout (server/trpc/)

- `init.ts` — `protectedProcedure` middleware throws `UNAUTHORIZED` if `ctx.session.user.id` is missing.
- `context.ts` — `createContext()` returns `{ session, prisma }`. The server-side `appRouter.createCaller(ctx)` is used inside page server components for SSR initial data.
- `routers/_app.ts` — root router: `task`, `project`, `reminder`, `push`.
- Permission rule: every mutation that touches project-scoped data goes through `requireProjectAccess(projectId, userId, minRole)`. `task.update` / `task.delete` / `task.toggle` resolve `projectId` from the task before checking.
- **Subtask completion ripple**: `task.toggle` reads the toggled task's `parentTaskId`. If it's a subtask, it recomputes the parent's status: all siblings DONE → parent DONE, any not DONE → parent TODO. Single-level only (no recursion to grandparent).

## Optimistic UI ↔ backend mirror

`lib/tasks.ts` exports `optimisticToggleSubtask(list, subtaskId)`. **This function and the `task.toggle` backend must stay in sync** — they both implement the "parent = AND of subtasks" rule. Used in both `InlineSubtaskRow` (task list) and `SubtaskRow` (drawer) so the parent checkbox flips instantly without waiting for the server.

`TaskRow.toggle` does its own optimistic flip on the parent (the simple case, no subtask cascade).

## UI patterns

- **Server component fetches initial data + passes to client component with `initialData`**. Pattern in `app/projects/[id]/page.tsx` → `TasksPanel` → `trpc.task.list.useQuery({ projectId }, { initialData: initialTasks })`. No loading flash on navigation.
- **Sidebar split into two components**: `components/Sidebar.tsx` is a **server** component that fetches projects via Prisma directly. `components/MobileSidebar.tsx` is a **client** wrapper that adds hamburger toggle + slide-in transform on `< md` and is a passthrough on `≥ md`. Server-component-as-child-of-client is the standard Next.js App Router pattern; rely on it.
- **Save on blur for inline edits**, with `handleClose` in `TaskDetailDrawer` flushing pending title/description edits before unmount. Mobile blur is unreliable when the focused input is unmounted (backdrop tap races onClose).
- **`enterKeyHint`** is set on every editable input that should submit/dismiss (`"done"` for inline edits, `"send"` for quick-add forms). Mobile keyboards show the right label.
- **Date display**: `lib/date.ts → formatDueDate(date)` returns `{label, tone}` with tones `past | today | soon | future`. `TONE_CLASSES` lookup in `TaskRow` colors the badge.

## PWA / push

- `lib/push.ts → ensurePushSubscription()` reuses the device's existing subscription, otherwise prompts for permission and subscribes with `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Called the first time a user adds a reminder.
- `lib/webpush.ts` wraps the server-side `web-push` setup. The `setVapidDetails` call is guarded so missing env vars don't break the build.
- `app/api/cron/send-reminders/route.ts` — Bearer `CRON_SECRET` required. Scans `Reminder WHERE sentAt IS NULL AND remindAt <= now()`, sends to each subscription of the reminder's owner, marks `sentAt`, deletes endpoints that return `404/410`. Idempotent — safe to call repeatedly.
- `public/sw.js` cache strategies: HTML = network-first with offline shell fallback, static assets = cache-first, `/api/*` and `/_next/data/*` bypass entirely. `push` event displays a notification; `notificationclick` focuses an existing tab or opens a new one.
- **Vercel Hobby caps crons at 1/day** — `vercel.json` uses `0 8 * * *` so the deploy isn't rejected. For minute-resolution reminders, an external scheduler (e.g., cron-job.org) must hit `/api/cron/send-reminders` with the `Authorization: Bearer $CRON_SECRET` header.

## Environment

`.env.example` documents every variable. Key gotchas:

- `DATABASE_URL` for **prod on Vercel** must use the **Supabase pooler** (port 6543, `?pgbouncer=true`) — serverless functions exhaust direct connections quickly. Local dev can use the direct connection.
- `DIRECT_URL` is the non-pooled URL — `prisma migrate` needs it for prepared statements.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is intentionally public (sent to the browser for subscription).
- `AUTH_URL` is local-dev only. **Do not set on Vercel** — Auth.js v5 auto-detects from forwarded host and setting it breaks preview deployments.

## Corporate-network gotchas (developer machine)

The original dev environment has SSL inspection (`proxy-fr-croissy:8080`) that breaks raw HTTPS from Node tooling.

- For npm install (Prisma engine download fails on cert chain): `$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"` for that command.
- For git push (proxy host not resolvable off-VPN): `git -c http.proxy= -c https.proxy= push origin main` — bypasses the configured proxy for one command only without touching the global config.
- These workarounds are not needed on Vercel / clean networks.

## Deployment

- Hosted on Vercel at `https://my-agenda-three.vercel.app`.
- Auto-deploy on push to `main`. **Deployments fail silently if `vercel.json` has a cron schedule too frequent for the Hobby tier** — keep it daily here and rely on the external scheduler for frequent reminders.
- Google OAuth `Authorized redirect URI` must include both `http://localhost:3000/api/auth/callback/google` and `https://my-agenda-three.vercel.app/api/auth/callback/google`.
