# Stop syncing the old approval inbox

Status: done

## Problem

AI apps now write directly (`mcp-server.md`), and the approval screen was removed earlier, but every device still synced the `proposals` table, held its rows, watched it in realtime and counted its pending saves. Dead weight and a second realtime channel per table for nothing. Stage 2 leftover in the backlog. No database change.

## Acceptance criteria

1. The tasks store no longer syncs, persists or watches `proposals`; `approveProposal`, `rejectProposal`, `pendingProposals` and the `Proposal` types are gone, with `src/core/inbox.ts` and its tests.
2. Sign out and the sync status no longer count proposals.
3. Nothing else changes: checks pass, the app loads.

## Out of scope

- Dropping the table itself. Row security already limits it to the person (migration 0009), so it is inert. A later migration drops it once every device runs this version.
- Clearing the old `proposals-<user>` cache left on devices (a few bytes; it goes with the next storage reset).

## Progress

- [x] Removed from `src/core/sync/tasks.ts`, `SyncProbe.tsx`, `ProfileScreen.tsx`; `inbox.ts` deleted
- [x] Checks: lint, format, typecheck, 90 unit tests, web export loads the AI screens without errors
