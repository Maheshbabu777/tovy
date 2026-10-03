# AI apps connect over MCP

Status: in progress

Waiting on: the human. Built in the branch overnight at his request ("go all in"), without the usual plan approval; the server side needs his dashboard steps and a security sign-off before it is switched on.

Size: risky (sign in for third-party apps, personal data, a migration that rewrites row security on every table).

## Problem

Phase 6 of the project plan, stage 7 of `foundation-reset.md`: any AI app that speaks MCP (Claude, ChatGPT, others) should read and change the person's tasks. The human's decision: AI apps write directly, no approval inbox in Tovy. The backstops are what the app asks inside itself before destructive tools, an Activity feed where every AI change can be undone, and a Trash for 30 days.

## Acceptance criteria

1. An AI app connects with one address (`https://<ref>.supabase.co/functions/v1/mcp`). With no token it gets a 401 whose `WWW-Authenticate` points to the protected resource metadata (RFC 9728), which names Supabase Auth as the authorization server, so the app runs the OAuth 2.1 flow by itself (dynamic client registration, PKCE).
2. The person approves on Tovy's consent screen (`/oauth/consent`): the app's name, the address it returns to (the real identity, since anyone can register a name), the signed-in email, and a choice of "Read and change your tasks" or "Only read your tasks". Cancel refuses. An app already approved goes straight back. Signed out, the person signs in first and lands back on the consent screen (also after Google).
3. Tools: `get_today`, `search_tasks`, `get_task`, `list_projects` (read only), `add_task`, `update_task`, `complete_task`, `log_progress`, `add_project`, `delete_task` (destructive hint, goes to Trash). Tool annotations say which are read only and which destroy. Bad arguments are refused before anything runs; refusals come back as readable text.
4. The server checks every token: signature, expiry, audience, a `client_id` claim (the person's own session is refused), and a live session (a revoked grant stops at once). Every database call uses the app's own token, so row security applies; no service role key anywhere.
5. Row security, whatever door an app uses (the MCP server or the REST API directly):
   - an app limited to read only can read but not write; an app cut off (`none`) reads nothing, not even its activity;
   - an app cannot see or change the list of apps (`ai_clients`), the activity log, or proposals, and cannot change the profile;
   - `tasks.created_by` and the progress log's source are set by the database from the token and the approved name, so an app cannot claim another app's work.
6. Activity: every change an app makes to tasks and projects is written by database triggers (an app cannot skip, forge or name itself), with the fields before and after. The screen lists them by day with the app's name and time, opens the task on tap, and Undo puts the fields back through the tasks store (deletes are restored on the server). A task deleted with its subtasks is one line, and Undo brings all of them back.
7. Trash: tasks deleted in the last 30 days (by anyone), with Restore; a restored task brings its deleted subtasks back, and a subtask whose parent is gone for good comes back at the top level.
8. Connected apps: the address with Copy (Share on a phone), each approved app with when it was connected, a read and write or read only switch, and Disconnect (asks first; cuts access in the database and revokes the grant).
9. Rows an AI app added show a small AI mark, and the task itself says "Added by an AI app" with a link to Activity. Browse has Trash, Connected apps and Activity; the web sidebar has Activity and Profile has Connected apps and Trash.
10. Until the migration and the dashboard steps are done, the three screens say "Not switched on yet" instead of failing, and nothing else in the app changes (the app never writes the new column).

## Out of scope

- Emptying Trash for good after 30 days (rows stay flagged; a scheduled purge is a later spec with pg_cron).
- Elicitation (the server asking the person through the AI app): the stateless transport cannot; destructive hints and Trash cover it for now.
- `check_in_routine` and `add_reminder` (phases 7 and 8), the prompt kit and push per batch (phase 9).
- A distributed rate limit (the in-memory one is per instance; Supabase's own limits are the real control).

## Plan

1. `supabase/migrations/0009_ai_connection.sql`: `ai_clients`, `ai_actions` with column grants, `is_person()`, `client_access()` (security definer), `ai_client_name()`, triggers `record_ai_task_change` and `record_ai_project_change` (security definer, pinned search path), `tasks_set_created_by`, `progress_log_set_source`, and the policies of tasks, projects, progress_log, proposals and profiles rewritten with the app's access. Test: `supabase/tests/ai_rls.sql`.
2. `supabase/functions/mcp/` (Deno, mcp-lite, hono, zod): `index.ts` (auth, metadata, rate limit, CORS), `tools.ts`, `logic.ts` (copies of the app's progress rules), `repo.ts`, `server.test.ts` (15 tests over HTTP with an in-memory database). CI job `mcp-server` runs deno lint, check and test.
3. App: `src/core/ai.ts` (+ tests), `src/core/aiApi.ts`, `ConsentScreen`, `ConnectedAppsScreen`, `ActivityScreen`, `TrashScreen`, `aiUndo.ts`, `returnTo.ts`, `components/Confirm.tsx`, routes `app/oauth/consent.tsx` and `app/(tabs)/apps|activity|trash.tsx`, the AI mark on rows, navigation entries. `vercel.json` adds frame and referrer headers (the consent screen must never be framed).

## Steps only the human can do (in this order)

1. Review this spec and the security notes below.
2. Merge the branch to main. CI applies migration 0009 to dev. Before that, the app keeps working as now.
3. Supabase dashboard, dev project: Authentication > OAuth Server: enable it, set the authorization path to `/oauth/consent` (the Site URL must be the Vercel address), turn on dynamic client registration. Authentication > JWT Keys: switch to asymmetric keys (RS256 or ES256) if not already.
4. Deploy the function: `npx supabase functions deploy mcp --no-verify-jwt --project-ref <ref>`.
5. Before anyone else uses it, check finding S5 below with a real token.
6. Try it: in Claude (Settings > Connectors > Add custom connector) paste the address from Connected apps, approve, ask "what is on my plate today", add a task, check Activity and Undo.

## Security review (`.powers/on-demand/security-review.md`, done 2026-10-03 with an independent reviewer)

Fixed in this branch:
- S1 (Medium/High) The activity log was written by the server voluntarily, so an app calling the REST API directly skipped it. Now triggers write it; `insert` on `ai_actions` is revoked. Test: `ai_rls.sql` makes changes straight through SQL as an app and finds all six lines.
- S2 (Medium) A cut-off app could still read the activity and the list of apps. Both are now readable only by the person (`is_person()`); `client_access()` became security definer so it still works.
- S3 (Medium) An app could file proposals under another app's name. Proposals are now the person's only.
- S4 (Medium) A revoked grant left the token usable until it expired. The server now also asks Auth for the user (checks the session exists); Disconnect also sets the app to `none` in the database, which row security enforces at once.
- S6 (Low) The consent screen trusted the self-registered name. It now shows the address the app returns to, in mono, with "Only allow it if you started this from that app".
- S7 (Low) Undo trusted ids inside the recorded fields. It now acts only on the row the database named.
- S8 (Low) Notes go back to AI apps inside clear markers, labelled as not instructions.
- Clickjacking: `X-Frame-Options: DENY` and `frame-ancestors 'none'` on the whole site.

Open:
- S5 (High, confirmed 2026-10-03, fix in branch) An AI app's token is accepted by Supabase Auth for account changes: `supabase/tests/s5-check.mjs` changed user metadata with it, and Auth's source checks only the signature and the user, never `client_id`. So an approved app could set a password and sign in with it, change the email, or add a two-factor method. Supabase has no setting for this. Fix: migration `0010_lock_account_changes.sql` refuses, for everyone, setting or changing a password, changing the email or phone, and adding a two-factor method (Tovy uses none of them; sign-in codes and Google still work). Test: `supabase/tests/account_lock.sql`. Left as accepted: an app can edit user metadata (Tovy never trusts it), sign the person out everywhere, and see or revoke the person's other app grants. Dashboard must keep manual identity linking and passkeys off (both off by default). Re-run `s5-check.mjs` after 0010 reaches dev; it must say SAFE before any real app is connected.
- S9 (Low) The rate limit is per function instance. Supabase's own limits are the real control.
- Tokens issued by the OAuth server are assumed to carry `client_id` (the Supabase docs say so). If they do not, the server refuses every app (safe), and row security would treat apps as the person; check on the first real connection.

## Progress

- [x] Migration 0009 and `ai_rls.sql`: all four database tests pass (`bash supabase/tests/run.sh`)
- [x] MCP function: deno lint, check, 15 tests pass
- [x] App screens, undo, Trash, consent; checks: lint, format, typecheck, 94 unit tests, web export
- [x] Screenshots at 1440 and 390, light and dark, with a stubbed Supabase: Connected apps, Activity (Undo marks the line and moves the task), Trash (Restore), consent, Disconnect confirm
- [x] Security review, findings S1 to S4 and S6 to S8 fixed
- [ ] Human: dashboard steps, deploy, check S5, try it with a real app

## Notes

- Why triggers and not the server: the token an app holds works against the REST API too, so anything only the server does can be skipped. Row security and triggers cannot.
- Deploy order is safe: the app never writes `created_by`, the new screens handle a missing table, and the old policies stay until the migration replaces them.
- Supabase OAuth server is in beta (2026-10). Its API in supabase-js 2.117: `auth.oauth.getAuthorizationDetails`, `approveAuthorization`, `denyAuthorization`, `listGrants`, `revokeGrant`.
