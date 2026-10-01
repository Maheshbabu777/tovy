# Auth

Status: draft

Size: risky (sign-in, sessions and personal data). Needs plan approval and the security review in `.powers/on-demand/security-review.md`.

## Problem

Today the app signs in with an email and password, which exists only for the sync spike. Tovy's plan is Google sign-in and an emailed code, so a person never has to make up a password. Every later feature (tasks, progress, and the AI connection in Phase 6) depends on knowing who is signed in, and on one person's data never showing up for another person on the same device.

This is Phase 1 of `.context/project-plan.md`, second part, after `foundation`.

## Acceptance criteria

1. Email code: a user enters their email, gets a 6 digit code, enters it, and lands signed in on the notes screen.
2. A wrong or expired code shows an error and does not sign the user in. Asking for a new code is possible, and a rate limit message is shown instead of failing silently.
3. Google on web: the "Continue with Google" button goes through Google and returns to the app signed in.
4. Google on a phone: the same button works in Expo Go through the browser flow and returns to the app signed in. If Expo Go cannot return to the app reliably, see the open questions.
5. The session survives closing and reopening the app (web reload, phone restart).
6. Sign out removes the session and the local copy of the previous user's data. Signing in as a different user on the same device shows none of the first user's notes.
7. The sign-in screen offers only Google and email code (no password field).
8. (proposed) With no session, requests for notes return nothing and cannot write. This extends the existing row security proof to the signed-out case.
9. Security review done with `.powers/on-demand/security-review.md`. Findings are recorded in the spec. No secret is in the client bundle (only the public anon key), redirect URLs are limited to an allow-list in Supabase, and sign-in uses PKCE.
10. The sync e2e suite and the unit tests still pass after the sign-in change.

## Out of scope

- Profile screen, export and delete account (Phase 10).
- Supabase Auth as the OAuth server for AI apps (Phase 6).
- Native Google sign-in (needs a dev build), Apple sign-in, phone numbers, passwords, two-factor.
- A custom domain and custom email sender (later, before real users).

## Open questions

- Remove the password sign-in completely? My recommendation is yes. The sync e2e tests then start each device from a saved session (made with a test user created by the admin API), and a separate auth test covers the email code flow. Answer: pending.
- What happens to unsynced changes at sign out? Clearing the local copy would lose edits made offline. My recommendation: block sign out while changes are waiting to sync, and say why. The alternative is to ask "sign out and lose them?". Answer: pending.
- Expo Go and Google (criterion 4): Expo Go returns to an `exp://` address that changes with the network, which Supabase's redirect allow-list handles badly. If it cannot work reliably, should Google on a phone move to the dev build spec, with web Google and the email code covering this spec? Answer: pending.
- For you to do, I can't: (a) create a Google Cloud OAuth client (type web) and enter its client ID and secret in Supabase, Authentication, Providers, Google. You enter the secret yourself and I never see it. (b) Set Supabase Auth URL configuration: site URL and the redirect allow-list. (c) Edit the Supabase "Magic Link" email template so it shows the code, `{{ .Token }}`. Answer: pending.
- Supabase's built in email sender has a very low hourly limit. For development that is fine, because the tests get the code from the admin API instead of an inbox. Real users need a custom email sender before launch. Agree to leave that for later? (proposed) Answer: pending.

## Plan

<!-- Filled in step 3, after the open questions are answered. -->

## Progress

- [ ] Questions answered, plan written, spec approved

## Notes

- The spike's sign out only calls `supabase.auth.signOut()` and leaves the notes in the browser's IndexedDB, so the next user on the device would see them. Criterion 6 fixes that (spec notes from the sync spike: "the real app must clear local data on sign out").
- The email code flow can be tested without an inbox: the admin API `generate_link` returns the one time code for an address.
- Google sign-in cannot be automated in tests (Google blocks scripted logins). Criteria 3 and 4 are proven by you trying it once, plus a check that the redirect goes to Google with PKCE and an allowed return address.
- Signing in with Google and with an email code for the same address should give one user. Check the user id once by hand.
