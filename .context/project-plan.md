# Tovy project plan

Source: the "Life OS" design doc (backend, UI, competitors, build order tabs). Planned with the myframework structure, built with the powers workflow in `.powers/`. Status: draft for approval, nothing built yet.

Working model: the human directs and approves, Claude writes the code. Each slice is one spec in `.context/specs/`, approved before code, finished only when its proof passes.

## 1. Project brief

**Core problem: productivity and AI live in different places.** People now spend their day inside AI apps (Claude, ChatGPT and others), where they decide, plan and commit to things. Their tasks live somewhere else, so every commitment made in a chat is copied by hand into a task app, or forgotten. Tovy closes that gap: any AI app the user connects can read their day and add tasks, log progress and check in routines, and the user stays in control through an approval inbox.

Tovy is a local-first task and routine app built for that. It is not a chatbot and not a replacement for the AI apps. It is the place where what you committed to in AI chats actually gets done and tracked.

Second problem it solves: checklists treat a task as 0% or 100%, so partial work disappears and streaks break on days that were not wasted. Tovy tasks carry real partial progress with a log, streaks forgive a missed day (2 freezes a month), and the heatmap counts progress points, not ticked checkboxes. None of Any.do, TickTick, Todoist, Things 3 or Microsoft To Do model partial progress, and none are built around being driven by AI apps.

Why the two fit together: an append-only progress log is what an AI can safely write to ("API layer done, +20%"), and the approval inbox makes that trustworthy.

Users and scale: people who already work through AI apps (any app that can connect to an MCP server) and juggle more than a checklist holds. Early testers are students. The Supabase free tier (50,000 monthly active users) covers the early scale. Pro ($25 a month) is needed before real users depend on it.

v1 scope: quick tasks, deep tasks, routines, optional projects with an Inbox, Today screen with quick add, progress log, streak with freezes, heatmap, daily ring, reminders, the web app, and the MCP server with approval inbox, per-AI permissions and activity feed.

Not in v1: XP and levels, achievements, weekly recap, widgets, calendar overlay or sync, document library, multi-AI chat, native iOS, sharing with other people.

Done means: cold start under 1.5 s on a mid-range Android, tap response under 100 ms, a change on one device visible on another in under 2 s. One AI app adds a task through MCP, it shows as pending, you approve it on your phone, and it appears. The builder uses it daily without going back to another task app.

## 2. Tech stack (decisions)

**Decision: app framework**
- Options considered: Expo (React Native, TypeScript) with web export; Flutter; two native apps plus a web app.
- Recommendation: Expo with Expo Router.
- Reasoning: one codebase builds Android and web, solo-friendly, OTA updates through EAS, and the design doc's animation and gesture libraries all target it.
- Tradeoff: web feels less native than a dedicated web app, and the web layout needs its own components where hover, right-click and keyboard matter.

**Decision: local store and sync**
- Options considered: Legend-State persisted to SQLite and IndexedDB with a custom Supabase sync; PowerSync; WatermelonDB; Supabase realtime only (no local store).
- Recommendation: Legend-State, with the sync spike (slice 0) as the go or no-go.
- Reasoning: every tap must answer in under 100 ms, so reads and writes hit the local store. Append-only logs avoid most conflicts. Legend-State is free and supports both SQLite and IndexedDB.
- Tradeoff: the sync layer is ours to maintain. If slice 0 fails, PowerSync is the fallback, at the cost of another service and its pricing.

**Decision: AI connection**
- Options considered: remote MCP server over Streamable HTTP as a Supabase Edge Function; a custom per-AI integration (separate plugin for each app); a REST API only.
- Recommendation: one remote MCP server, with Supabase Auth as the OAuth 2.1 server and an approval inbox for writes.
- Reasoning: Claude, ChatGPT and other apps that support custom connectors all speak MCP, so one server reaches all of them. Every call runs as the user under row-level security.
- Tradeoff: connector support varies by app and plan, and the user must paste the MCP URL once. Move to a Supabase custom domain early because that URL is pasted into AI apps.

**Decision: backend**
- Options considered: managed Supabase (Mumbai); raw AWS (RDS, Cognito, Lambda, S3); a self-hosted VPS.
- Recommendation: Supabase managed, Mumbai region.
- Reasoning: auth, row-level security, realtime, storage, edge functions and pg_cron are included, so we only write business logic. It is plain Postgres, so we can move to AWS later.
- Tradeoff: vendor coupling for auth and realtime, and free projects pause after a week of inactivity (move prod to Pro before real users).

**Decision: conflict model**
- Options considered: CRDTs; last-write-wins everywhere; last-write-wins on rows plus append-only logs for counters.
- Recommendation: last-write-wins by server `updated_at` on rows, append-only `progress_logs` and `routine_logs`, and server-computed derived numbers.
- Reasoning: no CRDT complexity, and the cases that would conflict (progress, routine counts) are exactly the append-only ones.
- Tradeoff: two devices editing the same title offline lose one edit. Accepted for a single-user app.

**Decision: auth**
- Options considered: Supabase Auth with Google plus email OTP; Firebase Auth; passwords.
- Recommendation: Supabase Auth, Google sign-in and email OTP, also the OAuth 2.1 server for MCP.
- Reasoning: one system for app sign-in and AI connections, row-level security keys off `auth.uid()`.
- Tradeoff: native Google sign-in on Android needs a dev build, not Expo Go.

**Decision: UI and animation libraries**
- Recommendation: Reanimated 4 plus Gesture Handler, React Native Skia for rings and heatmap, FlashList, Gorhom Bottom Sheet, expo-haptics, Lottie or Rive for the ring-closed burst, Geist font bundled with expo-font.
- Reasoning: matches the UI tab's motion rules (transform and opacity only, on the UI thread, 60 fps on a mid-range Android).
- Tradeoff: Skia and Reanimated add app size and need a dev build. Shared-element transitions need a support check at spec time, with a fast zoom-fade as fallback.

**Decision: hosting and tooling**
- Recommendation: Cloudflare Pages for web and landing page, EAS Build and Update for Android, GitHub Actions for CI and migrations (Supabase CLI), Sentry (Student Pack) and PostHog for monitoring, `tovy.app` from the Student Pack with auto-renew off.
- Tradeoff: the Student Pack covers the domain and Sentry only. Costs that matter later are Supabase Pro ($25 a month), Play Console ($25 once) and iOS ($99 a year).

## 3. Folder structure

One Expo app, feature-based, with a UI-free `core/` shared by phone and web.

```
tovy/
├── app/                        # Expo Router screens (thin, compose features)
│   ├── (tabs)/                 # Today, Inbox, Projects, Profile
│   ├── task/[id].tsx           # Task detail
│   └── consent.tsx             # AI connection consent (web)
├── src/
│   ├── core/                   # No UI. Unit-tested once, used everywhere
│   │   ├── rules/              # progress, streak, day-boundary rules (mirrored in SQL)
│   │   ├── sync/               # Legend-State config, outbox, retry
│   │   ├── db/                 # Supabase client, table types
│   │   └── dates/              # natural date parsing ("tomorrow 5pm")
│   ├── features/
│   │   ├── tasks/              # task, subtasks, attachments, quick add
│   │   ├── progress/           # log, slider, ring
│   │   ├── routines/           # check-ins, counts
│   │   ├── streaks/            # streak, freezes, heatmap
│   │   ├── reminders/          # local notification scheduling
│   │   ├── projects/
│   │   ├── ai/                 # approval inbox, connected apps, activity feed
│   │   └── account/            # profile, export, delete
│   ├── ui/                     # shared components, *.web.tsx where behaviour differs
│   │   ├── tokens.ts           # ink opacity scale, Indigo accent, radius, spacing
│   │   └── components/
│   └── config/                 # env handling
├── supabase/
│   ├── migrations/             # all schema changes, row security, triggers
│   ├── functions/
│   │   ├── mcp/                # MCP server (9 tools)
│   │   ├── signed-upload/
│   │   ├── export-data/
│   │   └── delete-account/
│   ├── tests/                  # SQL tests: user A cannot read user B
│   └── seed.sql
├── tests/                      # mirrors src/
├── .context/                   # powers: project facts, decisions, specs/, this plan
├── .powers/                    # powers workflow (git submodule)
├── .github/workflows/          # CI, migrations to dev on merge, to prod on tag
├── .env.example
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

## 4. Milestones and tasks

Eleven slices, each one spec in `.context/specs/` (created with `.powers/scripts/new-spec.sh <slug>`), each finished only when its proof passes. The order follows dependencies, and the AI connection comes right after progress logging so the core idea is proven early, then grows as each feature lands.

**Phase 0: sync spike (go or no-go)**
- [ ] One table, Expo app on a phone plus a browser build, local database on each, Supabase dev project in the middle
- [ ] Edit offline on the phone, reconnect, browser shows it
- [ ] Record the result in `.context/decisions.md`. If it fails, switch stack before phase 1

**Phase 1: foundation**
- [ ] Repo, Expo and Router, lint, format, type-check, CI
- [ ] Dev Supabase project, Supabase CLI, core migrations with row-level security
- [ ] Google and email OTP login
- [ ] CI applies migrations to dev
- [ ] `tokens.ts` and a `/dev/components` gallery
- [ ] Proof: a user cannot read another user's rows (SQL test in CI)

**Phase 2: tasks and sync**
- [ ] Create, edit, soft delete with 5 s undo, subtasks, projects and Inbox
- [ ] Outbox with retry, last-write-wins by server `updated_at`
- [ ] Proof: edit in airplane mode, reconnect, two devices converge

**Phase 3: Today and quick add**
- [ ] Today screen (routines, due, in progress), quick-add bar with date parsing, bottom sheet
- [ ] Proof: tap under 100 ms on a mid-range Android, 500 tasks scroll smoothly

**Phase 4: progress**
- [ ] Progress log, auto and manual modes, equal subtask weights, server trigger
- [ ] Proof: logging on one device updates task and ring on the other

**Phase 5: AI connection (MCP and approval inbox), first version**
- [ ] Supabase Auth as OAuth 2.1 server, consent screen on web, token checks (signature, expiry, issuer, PKCE S256, client_id claim)
- [ ] MCP Edge Function with the tools that exist so far: get_today, search_tasks, get_task, add_task, update_task, log_progress, complete_task
- [ ] `ai_clients` and `ai_actions` tables, approval inbox with swipe actions, per-AI permissions, AI badge on items
- [ ] Proof: one AI app adds a task, it shows as pending, you approve, it appears on the phone
- [ ] Security review from `.powers/on-demand/security-review.md`

**Phase 6: routines, streaks, heatmap**
- [ ] Routine check-ins and counts, `daily_activity`, streak and freezes, pg_cron day close
- [ ] Add `check_in_routine` to the MCP tools
- [ ] Proof: a simulated missed day spends a freeze, heatmap points never go negative

**Phase 7: reminders**
- [ ] Local notifications from synced rows, repeat expansion from RRULE
- [ ] Add `add_reminder` to the MCP tools (now all 9)
- [ ] Proof: a reminder fires with the app closed, tested on several Android makers

**Phase 8: AI polish**
- [ ] Connected apps screen (revoke, auto-approve), activity feed of reads and writes, prompt kit with copyable phrases ("add this to Tovy")
- [ ] One push per batch when something lands in the inbox
- [ ] Test against several MCP clients (for example Claude, ChatGPT, MCP Inspector, one open-source client) and record which work, on which plans, mobile or not
- [ ] Proof: a revoked app's token stops working immediately

**Phase 9: polish and account**
- [ ] Apply tokens, haptics, celebration, onboarding, profile
- [ ] Export and delete account
- [ ] Proof: Reduce Motion respected, account deletion removes all data and files

**Phase 10: web app and release**
- [ ] Sidebar and detail layout, keyboard shortcuts, IndexedDB
- [ ] Landing page, privacy policy, APK build, Play Store closed test
- [ ] Proof: same account on web shows the same data and works offline; testers installed and using it

Design work (moodboard, tokens, Today and Task detail screens) runs beside phases 0 to 2 so it is ready for phase 3.

## 5. README scaffold

````markdown
# Tovy

> Tasks that count the effort, not just the checkbox.

## Overview
Tovy is a local-first task and routine app that connects to the AI apps you already use.
Tasks carry partial progress with a log, streaks forgive a missed day, and everything
works offline. Android and web first.

## Getting started
1. Clone with submodules: `git clone --recurse-submodules <repo-url>`
2. Install: `npm install`
3. Copy `.env.example` to `.env` and add the dev Supabase URL and anon key
4. Start local Supabase: `npx supabase start`
5. Run: `npx expo start` (Android needs a dev build: `npx expo run:android`)

## How-to guides
- Run tests: `npm test`, and `npx supabase test db` for row-security tests
- Add a feature: create a spec with `.powers/scripts/new-spec.sh <slug>`, get it approved, build in slices
- Add a migration: `npx supabase migration new <name>`, never edit the dashboard directly
- Deploy: merge to main applies migrations to dev, a release tag applies them to prod

## Reference
- Environment variables: see `.env.example`
- Data model: `supabase/migrations/`
- MCP tools and how to connect an AI app: `supabase/functions/mcp/`

## Architecture and decisions
The phone is the primary copy of the data and Supabase is the synced, secured copy.
Decisions are recorded in `.context/decisions.md`.

## License
TBD
````

## 6. Risks and tradeoffs

**Risk: AI apps do not use Tovy reliably, or MCP support differs by app and plan**
- Likelihood: Medium. Impact: High, because this is the core idea.
- Mitigation: tool descriptions and server instructions say when to use each tool, a prompt kit gives users a line for their AI's custom instructions, explicit asks ("add this to Tovy") are the main path, and phase 8 tests several MCP clients. We build to the open MCP and OAuth 2.1 standards, not to one app, so any compliant client can connect. The core app must still be good without AI.

**Risk: the AI connection is a large security surface**
- Likelihood: Medium. Impact: High.
- Mitigation: no delete tool, every write goes through the approval inbox by default, strict token checks, row-level security on every call, rate limits, and a security review in phase 5.

**Risk: the sync layer does not hold up**
- Likelihood: Medium. Impact: High.
- Mitigation: phase 0 is a go or no-go before anything else exists. Fallback is PowerSync. Append-only logs keep the conflict surface small, and they are also what AI writes land in.

**Risk: reminders stop firing after OS updates or battery saving**
- Likelihood: High. Impact: High. This is the most common failure across competitor apps.
- Mitigation: reminder reliability gets its own test plan in phase 7, tested on several Android makers, with in-app guidance for battery exemptions.

**Risk: scope creep from the ideas parking lot**
- Likelihood: High. Impact: Medium.
- Mitigation: the v1 and not-in-v1 lists are frozen above. New ideas go to the parking lot first and are reviewed at the end of each phase.

**Risk: derived numbers disagree between phone and server (progress, streak, day boundary)**
- Likelihood: Medium. Impact: Medium.
- Mitigation: one rules module in `src/core/rules/` with unit tests, mirrored in SQL with the same test cases. Server values win on pull. Time zones tested explicitly.

**Risk: nothing is hand-checked because the human does not write code**
- Likelihood: Medium. Impact: High.
- Mitigation: powers requires evidence for every acceptance criterion (command run and output printed), tests are never weakened to get green, and each slice ends with a demo the human can try on a real phone before approval.

## Decisions from the human

- AI apps: any app that can connect to an MCP server. No single target app, so the server follows the open standard.
- Platforms: web and Android first, App Store (iOS) later. Android needs a dev build rather than Expo Go.
