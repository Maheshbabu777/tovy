# Auth

Status: approved

Size: risky (sign-in, sessions and personal data). Needs plan approval and the security review in `.powers/on-demand/security-review.md`.

## Problem

Today the app signs in with an email and password, which exists only for the sync spike. Tovy's plan is Google sign-in and an emailed code, so a person never has to make up a password. Every later feature (tasks, progress, and the AI connection in Phase 6) depends on knowing who is signed in, and on one person's data never showing up for another person on the same device.

This is Phase 1 of `.context/project-plan.md`, second part, after `foundation`.

## Acceptance criteria

1. Email code: a user enters their email, gets a 6 digit code, enters it, and lands signed in on the notes screen. This works on web and in Expo Go on a phone.
2. A wrong or expired code shows an error and does not sign the user in. Asking for a new code is possible, and a rate limit message is shown instead of failing silently.
3. Google on web: the "Continue with Google" button goes through Google and returns to the app signed in.
4. The session survives closing and reopening the app (web reload, phone restart).
5. Sign out removes the session and the local copy of the previous user's data. Signing in as a different user on the same device shows none of the first user's notes.
6. Sign out with edits that have not reached the database yet shows a note saying so ("N changes are not saved to the server yet. Signing out will discard them."), and lets the user confirm or cancel. With everything synced there is no note.
7. The sign-in screen offers only Google (web) and email code. There is no password field.
8. (proposed) With no session, requests for notes return nothing and cannot write. This extends the existing row security proof to the signed-out case.
9. Security review done with `.powers/on-demand/security-review.md`. Findings are recorded in the spec. No secret is in the client bundle (only the public anon key), redirect URLs are limited to an allow-list in Supabase, and sign-in uses PKCE.
10. The sync e2e suite and the unit tests still pass after the sign-in change.

## Out of scope

- Google sign-in on a phone (decided 2026-10-01: it moves to the dev build spec, because Expo Go's return address changes and Supabase's redirect allow-list handles that badly). On a phone, this spec ships the email code only.
- Profile screen, export and delete account (Phase 10).
- Supabase Auth as the OAuth server for AI apps (Phase 6).
- Native Google sign-in, Apple sign-in, phone numbers, passwords, two-factor.
- A custom domain (later, before testers who are not the owner). A custom email sender is in scope now, see the open questions.

## Open questions

- Remove the password sign-in completely? Answer: yes, remove it (2026-10-01). The sync e2e tests then start from a saved session and a separate test covers the email code flow.
- What happens to unsynced edits at sign out? Answer: show a note that something is not synced yet and let the user sign out anyway if they want (2026-10-01). That became criterion 6. The edits are then lost, because they never reached the database.
- Google on a phone if Expo Go cannot return reliably? Answer: move it to the dev build spec (2026-10-01).
- Leave Supabase's built in email sender for now? Answer: no. Since 2026-06-03 new free projects cannot edit auth email templates on the built in sender, so the emailed code needs a custom SMTP sender (decided 2026-10-01). Start with Resend using `onboarding@resend.dev`, which only delivers to the owner's own address until a domain is verified. Tests still get the code from the admin API, not an inbox.
- For you to do, I can't (needed for criteria 1, 2 and 3): (a) create a Google Cloud OAuth client (type web) and enter its client ID and secret in Supabase, Authentication, Providers, Google. You enter the secret yourself and I never see it. (b) Set Supabase Auth URL configuration: site URL and the redirect allow-list, which needs `http://localhost:8081` for tests and the local web build. (c) Connect custom SMTP (Resend) under Authentication, Emails, then edit the "Magic Link" email template so it shows the code, `{{ .Token }}` (locked until custom SMTP is on). Answer: pending.

## Plan

Branch per slice group, named `feat/auth-...`. Each slice ends green and gets ticked below.

Order (changed 2026-10-01 so work does not wait on email and Google setup): 1, then 6, then 5, which need none of it. Then 2, 3, 4, 7, 8 once the Resend, Supabase and Google setup is done. Slice numbers below stay as they are.

1. **Sync tests start from a saved session (criterion 10, prepares criterion 7).** In `tests/e2e/sync.e2e.ts`, replace the sign-in clicks with a session injected before the page loads: create the user with the admin API, get a token with the password grant over REST, and write it where supabase-js keeps its session. All 7 tests still pass with the password screen still present. Test: `npm run test:e2e`, 7 passed.
2. **Email code sign-in screen (criteria 1, 2, 7).** New `src/features/account/SignIn.tsx`: an email step calling `signInWithOtp`, then a code step calling `verifyOtp` with type `email`. Wrong or expired code shows the error text, resend has a short cooldown, and a rate limit error is shown as a message. Remove the password fields. Test: a new e2e test asks the admin API `generate_link` for the code, types it in, and sees the notes screen, plus a wrong code that stays signed out.
3. **Session and PKCE (criterion 4).** Set `flowType: 'pkce'` and `detectSessionInUrl: true` on web in `src/core/db/supabase.ts`. Test: e2e signs in, reloads, still signed in.
4. **Google on web (criterion 3).** A "Continue with Google" button calling `signInWithOAuth` with `redirectTo` set to the current origin. Test: Playwright clicks it and checks the request goes to Supabase's authorize address with `provider=google`, a `code_challenge` and an allowed `redirect_to`. You then try it for real once and tell me the result. The Google client and Supabase settings from the open questions must exist first.
5. **Sign out and local data (criteria 5, 6).** A sign out action that reads `syncState(notes$).numPendingSets` (verify it counts edits not yet saved on the server). If above zero, show the note with Cancel and Sign out anyway. On confirm: sign out, then `syncState(notes$).clearPersist()` and empty the in-memory store. Test: e2e with two users in one browser context, user A signs out, user B sees none of A's notes. A second test goes offline, adds a note, tries to sign out and sees the note text. A third test confirms no note appears when everything is synced.
6. **Signed-out access (criterion 8).** Extend the existing REST test in `tests/e2e/sync.e2e.ts`: with only the anon key and no user token, reading notes returns an empty list and writing is refused. Test: that test passes.
7. **Security review (criterion 9).** Walk the checklist in `.powers/on-demand/security-review.md`, record findings in this spec. Check the built web bundle for secrets: grep `dist/` for the secret API key value and for `service_role` and `sb_secret`. Check the redirect allow-list in Supabase with you. Test: grep prints nothing, findings written down with severity.
8. **Docs and context.** Update `README.md` (how to sign in), `.context/project.md`, and `decisions.md`.

Proof at the end: `.powers/scripts/verify.sh` evidence block, each criterion pass or fail with its command, and your manual results for Google on web and the email code on a phone.

Risks:
- Resend without a verified domain only delivers to the owner's own address. Other testers cannot receive codes until a domain exists. Tests are safe because they use `generate_link`.
- Google sign-in cannot be automated. Criterion 3 is partly your manual check.
- `numPendingSets` may not mean what I expect, or `clearPersist()` may not clear the IndexedDB data. If so, I write a small counter in our own code and delete the database by name. I find that out in slice 5, before building the screen on it.
- Turning on `detectSessionInUrl` for web can fight with Expo Router's routing on return from Google. If so, handle the code exchange explicitly on a callback route.
- The email template must show `{{ .Token }}`. If it is left as a link, the code step will have nothing to type. Editing the template needs custom SMTP first, both are on your setup list.
- Removing the password path means the sync tests no longer exercise the real sign-in UI. The new email code test in slice 2 covers that.

## Progress

- [x] Questions answered (except the setup tasks for you)
- [x] Plan written
- [x] Spec and plan approved (human, 2026-10-01, with the slice order above)
- [x] 1 Sync tests start from a saved session (first)
- [ ] 2 Email code sign-in screen
- [ ] 3 Session and PKCE
- [ ] 4 Google on web
- [ ] 5 Sign out and local data
- [x] 6 Signed-out access
- [ ] 7 Security review
- [ ] 8 Docs and context

## Evidence

Slice 1 (criterion 10, prepares criterion 7), branch `feat/auth-session-tests`:

- `tests/e2e/sync.e2e.ts` now starts each device from its own saved session (password grant over REST, written to localStorage before the app loads) and waits for the realtime subscription to be confirmed. The password screen is still in the app and is untouched.
- This exposed a real sync gap. Before the fix, test 3 passed 8 of 10 alone, and full runs failed in 2, 1 and 3 tests of 7. Server data was always complete, one device just never received the other's edit.
- Theories rejected by experiment: a cursor skip (`changesSince: 'all'` gave 8 of 14, no better) and a forced ordering (a regression test with A pushing before B passed even before any fix).
- Fix: `catchUpAfterRealtime()` re-syncs when a realtime channel reports `SUBSCRIBED`, and once more 1.5 s later. After it: test 3 alone 10 of 10, test 2 alone 5 of 5, four full runs of `npm run test:e2e` all 7 passed (31 to 34 s). Lint, format, typecheck and unit tests pass.
- Not proven: that the catch-up closes every gap. It makes the window much smaller, and the plugin itself is a beta. Phase 2 sync design should decide on a lasting answer.

Slice 6 (criterion 8), branch `feat/auth-signed-out-access`:

- New test `7b` in `tests/e2e/sync.e2e.ts`: with only the public anon key, reading notes returns `[]`, a known note id returns `[]`, an insert is refused (HTTP 401), and update and delete change nothing. The owner's note is still there and untouched afterwards.
- Control that the empty result is row security and not an empty table: the secret key (bypasses row security) counts 318 notes in dev, the anon key sees `[]`.
- `npm run test:e2e`: 8 passed, twice in a row. Test `7b` alone passed 3 of 3. I did not weaken the real dev policy to watch it fail, so the control above is the evidence that the test can tell a visible note from a hidden one.

## Notes

- The spike's sign out only calls `supabase.auth.signOut()` and leaves the notes in the browser's IndexedDB, so the next user on the device would see them. Criterion 5 fixes that (spec notes from the sync spike: "the real app must clear local data on sign out").
- The email code flow can be tested without an inbox: the admin API `generate_link` returns the one time code for an address.
- Google sign-in cannot be automated in tests (Google blocks scripted logins). Criterion 3 is proven by you trying it once, plus a check that the redirect goes to Google with PKCE and an allowed return address.
- Signing in with Google and with an email code for the same address should give one user. Check the user id once by hand.
- "Synced" means the database has confirmed the edit. Edits are saved on the device first, then sent to Supabase in the background.
