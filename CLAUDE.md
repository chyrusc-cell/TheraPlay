# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

TheraPlay is a therapy-activity web app. It is two projects in one repo: a React 19 + Vite + Tailwind CSS v4 frontend at the repo root (`src/`) and a Laravel + Sanctum JSON API in `backend/` (MySQL in dev). The root `README.md` is the unmodified Vite template and `backend/CLAUDE.md` / `backend/AGENTS.md` are generic Laravel Boost setup guidelines; neither describes this app.

## Commands

Frontend (repo root):
- `npm run dev` — Vite dev server. `npm run build` — production build. `npx eslint src` — lint (this is what to run after edits; there is no frontend test framework).

Backend (`cd backend`):
- `composer run dev` (same as `php artisan dev`) — starts the API server and the root Vite frontend together (`frontend` + `server` processes, registered in `AppServiceProvider`; the default `queue` and the backend's own `vite` are excluded). Needs `npm install` in `backend/` once (for `concurrently`); stop any servers already using ports 8000/5173 first.
- `php artisan serve --host=127.0.0.1 --port=8000` — API only; the frontend hardcodes `http://127.0.0.1:8000/api`.
- `php artisan test` — full suite (sqlite in-memory, config in `phpunit.xml`, which sets a throwaway `APP_KEY`). One file/test: `php artisan test --filter=ProfilePhotoTest` or `--filter=test_name`.
- `php artisan migrate` — apply pending migrations. New features regularly add migrations; the dev DB (`theraplay_db`) is not migrated automatically, and an "Unknown column"/missing-table error usually means one is pending (`php artisan migrate:status`).

Windows notes: PHP comes from Herd and is not on the Git Bash PATH — run `php`/`artisan` from PowerShell. The dev server is `php -S` and reads Herd's `php.ini` (`C:\Users\<user>\.config\herd\bin\php85\php.ini`), so upload limits (`upload_max_filesize`, `post_max_size`, `upload_tmp_dir`) are set there and only apply after the server is restarted. App-level limits: contact photo and profile picture 2 MB, activity picture 5 MB, attached materials 10 MB each.

## Frontend architecture

- **Routing/layout** (`TheraPlay.jsx`, `Layout.jsx`): auth pages (login/register/forgot/reset) have no layout; everything else renders inside `Layout`, which wraps `AuthProvider`, a fixed `Sidebar`, a fixed floating `GlobalSearch` pill, a fixed top-right profile shortcut, and an empty `h-topbar` (56px) spacer row. Admin routes sit under `<RequireRole role="admin">`; that is UX only — the backend `role` middleware is the real protection.
- **Auth**: Sanctum personal access token stored as `theraplay_token` in localStorage or sessionStorage. `api.js` has `apiRequest()` (returns `{ok,status,data}`, adds the Bearer token, handles `FormData`), `clearSession`, `mapValidationErrors`. `AuthProvider` verifies the user once via `GET /api/user`; `useAuth()` gives `{status, user, retry, updateUser}`. Role-dependent UI (sidebar, search results) must come from this server-verified user, never from storage. Several older pages still call `fetch` with their own copy of `API_URL`/`getToken`.
- **Children**: a parent has several children. `ChildProvider` (in `Layout`, below `AuthProvider`) is the one source of truth for the selected child (`useChildren()`); the top-bar `ChildSelector` changes it, the choice is remembered per account in localStorage as a preference only and is cleared by `clearSession`. Child-dependent pages (Activities, Dashboard, Progress, completing an activity) use `useChildGate()` and send `child_id`; the backend resolves it with `ResolvesChild` among the caller's own children only (another parent's id is a 404). Activities for a child are matched server-side by OR over the child's active conditions (`activity_condition` pivot, `is_for_all_conditions`); unassigned activities are excluded.
- **Styling**: Tailwind v4 CSS-first (`src/css/tailwind.css`, `@theme`, `@custom-variant`). Preflight is deliberately not imported. Breakpoints are named variants (inclusive max-width): `laptop` ≤1100, `tablet` ≤900 (sidebar collapses to a 72px rail), `tablet-sm` ≤800, `phone-lg` ≤720, `phone` ≤560 — use these, not `max-[…]`. Design tokens live once in `:root` of `src/css/ui.css` (the Warm Neutral palette: `--ui-page`, `--ui-edge`, `--ui-accent`, …) and are exposed as Tailwind colors (`bg-page`, `border-edge`, `text-muted`, `bg-accent`, …) — use those, not hex values, for neutrals; semantic green/red/amber and the brand logos stay hardcoded. `ui.css` also holds keyframes, the global `prefers-reduced-motion` rule, and a few intentionally unlayered rules (unlayered CSS beats Tailwind's layered utilities). Class strings are shared through `uiClasses.js` (page container/heading: `pageMain`, `pageTitle`, …), `adminClasses.js` (admin forms/tables), `authClasses.js`; write class strings out in full so Tailwind can see them.
- **Loading pattern**: data pages load in a `useEffect` with an `AbortController`, show a skeleton from `Skeleton.jsx`, and call `holdSkeleton(startedAt, signal)` (`minLoading.js`) in `finally` so skeletons stay ≥500 ms without delaying the request; check `signal.aborted` before setting state.
- **Private images**: uploaded images live on the private disk, so `<img>` can't fetch them with a token. Public ones use public URLs; the user's own picture (`ProfileAvatar.jsx`) and an admin's view of a draft activity's picture are fetched with the token and shown via blob URLs (revoked on cleanup).
- **Motion**: `Collapsible.jsx` (grid-rows 0fr→1fr) for expand/collapse; entrance animations use the `ui-*` keyframes in `ui.css`.

## Backend architecture

- All routes are in `backend/routes/api.php`. Admin routes are one group: `auth:sanctum` + `role:admin` (alias for `EnsureUserHasRole`) under `/api/admin`. Parent-only routes use `role:parent` (completion, feedback, child creation). Login/register are throttled.
- **Roles**: `parent` and `admin`; `role` is not mass-assignable (set with `forceFill`). There is intentionally no activity delete (it would cascade-delete progress) — unpublish instead. `UserManagementController` refuses to delete/demote the last admin, yourself, or accounts with a child profile.
- **Uploads/images** (activity materials, `activity-images/`, `contact-photos/`, `profile-photos/`): stored on the private disk named by `config('filesystems.activity_materials.disk')`. Paths are generated server-side only (the `image_path`/`photo_path` columns are never fillable or accepted from requests); API responses expose a `*_url` accessor, never the path. Validation uses the `ValidatesImageUploads` trait (real MIME sniff + `getimagesize`, not the client's type). Replacing/removing/deleting the owner deletes the old file, restricted to the expected folder. Public image routes serve only published activities / listed contacts; a profile picture is readable only by its owner.
- **Developer Team card**: one settings row (id 1, `developer_team`); `DeveloperTeam::current()` returns built-in sample details with `is_sample: true` until an admin saves it, and tolerates the table not existing yet.
- Tests are in `backend/tests/Feature` (RefreshDatabase). Users created without a role have `role` null in memory until `->fresh()`.

## Working with graphify and claude-mem (do this on every prompt)

Two installed skills carry context between prompts and sessions. Use both at the start of each user prompt, before reading or grepping source files:

1. **claude-mem (memory of past work).** Check it for earlier sessions that touched the same topic — use the `mem-search` skill (or its MCP tools: `search`, then `timeline`, then `get_observations` for the few relevant ids), or `npx claude-mem search "<query>"` from a shell. Treat results as background that may be stale: verify any file, function or flag a memory names before relying on it. If the user is resuming earlier work or switching context ("continue the…", "back to the…"), search memory first and summarise what it found before acting. Wrap anything sensitive in `<private>…</private>` so it is not stored; never paste `.env` contents or tokens into prompts or files.
2. **graphify (map of the code).** `graphify-out/` holds a knowledge graph of the codebase (`GRAPH_REPORT.md`, `graph.json`). For any question about how something works, what depends on what, or where to make a change, run `/graphify query "<question>"` (or `path` / `explain`) first and use the graph to pick which files to open; fall back to reading files only for the details the graph doesn't give. The graph is code-only (docs and images were not semantically extracted).

After editing code, refresh the graph so the next prompt sees the change: `graphify update .` (no LLM, local; the CLI is at `%APPDATA%\Python\Python313\Scripts\graphify.exe` if it isn't on PATH) or `/graphify . --update`. The worker for claude-mem runs at http://127.0.0.1:37777; if memory search fails, run `npx claude-mem status` then `npx claude-mem start`.

graphify is also wired in through project hooks in `.claude/settings.json` (a PreToolUse check on search/read tools; the commands use the absolute path to `graphify.exe`), and claude-mem records tool activity through its own hooks. Both only take effect after a Claude Code restart. `graphify-out/` is not gitignored. The `## graphify` section below was written by `graphify claude install --project`; keep it.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
