# Decisions

One line per decision someone might later ask "why did we do it this way?" about. Newest at the bottom.

Format: `YYYY-MM-DD | decision | why | specs/<slug>.md`
2026-10-01 | GO on Expo, Legend-State v3 syncedSupabase and Supabase for the sync layer. PowerSync stays the fallback | All 9 criteria hold against the real Supabase project: offline edits sync back in 0.9 to 1.3 s, different-note and same-row conflicts converge with nothing lost, soft delete reaches offline devices, the outbox survives a restart, local writes render in 12 to 15 ms, and another user cannot read or change rows | specs/sync-spike.md
2026-10-01 | Conditions on the GO: Legend-State sync is v3 beta (3.0.0-beta.48), so pin the version and re-run the e2e suite on every upgrade. Phone persistence (SQLite in Expo Go) is untested, so check it before phase 1. Offline was simulated by blocking the network, not a real signal loss | Those are the open risks. If the beta breaks or SQLite fails in Expo Go, switch to PowerSync | specs/sync-spike.md
2026-10-01 | Real schema should keep a boolean `deleted` column for soft delete, not `deleted_at` | The Legend-State Supabase plugin expects a boolean `deleted`. Revisit if the plugin changes | specs/sync-spike.md
2026-10-01 | Dev migrations are applied by CI with the Supabase CLI on merge to `main`, never by hand. Prod is not created yet | Humans and agents cannot run SQL on the project directly, and hand-applied SQL drifted from the repo once. The one-time baseline run marked `0001` as already applied | specs/foundation.md
