# Auth email code and registration

Status: in progress

Size: risky (sign-in, a new table with row security, a migration).

## Problem

Tovy's plan is Google plus an emailed 6 digit code, so nobody has to make up a password. Google on web works (spec `auth`). The email code was split out on 2026-10-02 because it needs email setup the human had not done yet. Two gaps showed up since:

- There is no register path. Today the sign-in screen has Google (web) and the spike's email and password form, which can only sign in, never create an account. With a code, sign in and register are the same step: an email that is new gets an account.
- We store nothing about a person except what Supabase Auth keeps (email, and name and photo from Google). A new user should give their first name, last name and a username when they register.

The code also unblocks testing on a real phone: Google sign in needs a dev build, but an emailed code works in Expo Go.

## Acceptance criteria

1. A user enters their email, gets a 6 digit code, enters it, and lands signed in. A new email creates an account. This works on web and in Expo Go.
2. A wrong or expired code shows an error and does not sign the user in. Asking for a new code is possible, and a rate limit message is shown instead of failing silently.
3. The sign-in screen offers only Google (web) and email code, with no password field.
4. A session created by the code flow survives a reload (the earlier test used a session placed by the test harness).
5. After the first sign in (code or Google), a user with no profile sees one setup step before the task list: first name, last name and a username, all required. First and last name are prefilled from Google when Google provides them. Nothing else is asked.
6. A username is 3 to 20 characters of lowercase letters, digits and underscore, and unique regardless of case. A taken or badly formed username shows a message on the field and the user stays on the step. Names are 1 to 50 characters after trimming.
7. A returning user with a profile goes straight to the task list. Offline, a user who has signed in before still reaches the task list (the profile is kept on the device). A brand new user who is offline sees that they need a connection to finish setting up.
8. Row security on profiles: a user can read, create and change only their own profile, nobody can delete one, and no user can read another user's profile. Whether a username is free is answered by a function that returns only yes or no, never any other data (SQL test in CI plus an e2e check).
9. The new table comes from a numbered migration that CI applies to dev on merge. Signing out clears the profile kept on the device, so the next user on the device never sees it.
10. The e2e suite still passes. Tests that signed in through the password form use the code flow instead, and the users the tests create get a profile so they skip the setup step. Lint, format check, typecheck, unit tests and the CI row security test pass.

## Out of scope

- Profile photo, time zone, day start, week start, editing the profile later (the Profile screen is Phase 10), account deletion.
- Google on a phone (dev build spec), a custom domain, password sign in, magic links.
- Sharing, or looking up other people by username (usernames only have to be unique for now).

## Open questions

- Which details at registration? Answer: first name, last name and a username, all required (2026-10-02).
- How is the email sent while there is no domain? Answer: Gmail SMTP (2026-10-02). It works now and sends to any address, unlike Resend, which only delivers to the owner's own address until a domain is verified.
- Do the setup below (the human does it, I can't): see Setup. Answer: done (2026-10-02, "done from my side"). Not yet proven: that mail really arrives and shows a code. Reading a code through the admin API proves nothing about delivery, so the real check is the human asking for a code for their own address once the sign in screen exists (slice 2).
- Assumption to confirm: the username is shown nowhere yet and cannot be changed in this spec. Fine to keep it that simple? Answer: pending, treated as yes unless the human says otherwise.

## Setup (human)

1. Google account used for sending: turn on 2-step verification, then create an App Password (myaccount.google.com/apppasswords, name it Tovy). Copy the 16 characters. Treat it like a password: paste it only into Supabase, never into chat, the repo or `.env`.
2. Supabase, Authentication, Emails, SMTP Settings: enable custom SMTP. Host `smtp.gmail.com`, port `465`, username the Gmail address, password the App Password, sender email the same Gmail address, sender name `Tovy`.
3. Supabase, Authentication, Emails, Templates: there are two that matter. A new email gets the Confirm signup template and a known email gets the Magic Link template. Change the body of both to show the code, for example `Your Tovy code is {{ .Token }}` and nothing that needs a link. (These templates are locked until custom SMTP is on.)
4. Supabase, Authentication, Providers, Email: leave email sign in on. Under Sign In / Providers, check the email code length is 6 and the expiry is 1 hour or less.
5. Tell me when it is done. The real delivery check is yours: once the sign in screen exists (slice 2), ask for a code for your own address and see that an email with 6 digits arrives. A code read through the admin API (used by the tests) does not prove the email was sent.

## Plan

Branch per slice, `feat/auth-...`. Each slice ends green and is ticked below.

1. **Profiles table and row security.** Migration `0005_profiles.sql`: `profiles` (id = the user's id, first_name, last_name, username, created_at, updated_at) with the same server-set timestamps, checks for the name and username rules, a unique index on `lower(username)`, owner-only select, insert and update, no delete policy, and `username_available(text)` returning a boolean. Extend `supabase/tests/` (another user cannot read, change or forge a profile, bad usernames and a taken username are refused, the function leaks nothing). Mutation checks as in the tasks slice 1. Test: the SQL test passes and fails when a policy is weakened.
2. **Email code sign in.** Sign-in screen: email, then code (`signInWithOtp`, `verifyOtp`), errors, resend with the rate limit message, no password form. Test helpers sign in through the screen by reading the code with the admin API `generate_link`. Needs the Setup above for the one real check.
3. **Profile step.** After sign in, load the profile. If none, show the setup step (prefilled from Google), save it, keep a copy on the device (cleared at sign out), and use the copy when offline. Test users get a profile in `createUser` so the other tests are unchanged. New e2e tests: new user sees the step and cannot continue with a bad or taken username, returning user does not see it, offline start with a saved profile works, the next user after sign out sees none of the previous profile.
4. **Phone check.** The human opens the app in Expo Go, signs in with an emailed code, registers, adds a task. I record what happened. (Per user native storage was never tested, so this is where it gets its first real check.)

Risks:
- Gmail may block or throttle the sender (it is not built for app mail). If codes do not arrive, the fallback is Resend to the owner's address only, then the verified `.me` domain.
- The Supabase default for new users is the Confirm signup template, not Magic Link. If only one template is edited, new users get a link and no code. Both are in the Setup, and the check in step 5 covers a new and a known address.
- Supabase rate limits email codes (a per address wait of about a minute, and an hourly cap on custom SMTP). The screen must show this, and the tests must not ask for codes in a loop.
- A profile gate on every sign in adds one network call before the task list. The device copy keeps a returning user offline-safe, but the first load after a long time offline with no copy is blocked on purpose (criterion 7).
- The seeded sessions in the e2e tests skip sign in. If a test user has no profile the setup step blocks every test, so `createUser` must create the profile (slice 3).

## Progress

- [x] Questions answered (the username assumption above is open)
- [x] Setup done by the human (2026-10-02), delivery still to be checked in slice 2
- [x] Plan approved (treated as approved when the human said "done from my side", 2026-10-02, after sending the setup and the spec; say so if not)
- [x] 1 Profiles table and row security
- [x] 2 Email code sign in (real email delivery still to be checked by the human, see Evidence)
- [ ] 3 Profile step
- [ ] 4 Phone check

## Evidence

Slice 1 (criteria 8 and the table part of 9), branch `feat/auth-profiles-table`:

- `supabase/migrations/0005_profiles.sql` adds `profiles` (id is the user id with a default of `auth.uid()`, first and last name 1 to 50 characters, username 3 to 20 of lowercase letters, digits and underscore, server-set timestamps, names trimmed), a unique index on `lower(username)`, owner-only select, insert and update, no delete policy, and `username_available(text)` (security definer, returns only true or false, false for a badly formed name, executable by signed in users only). It has its own timestamp trigger because `handle_times()` sets `user_id`, which this table has no column for. `supabase/tests/local-stubs.sql` gained an `anon` role so the signed out checks can run, and `profiles_rls.sql` is run by `run.sh`.
- `bash supabase/tests/run.sh`: `PASS: profiles are private and their rules hold` (and the tasks test still passes). The test covers: trimmed names and server timestamps, one profile per user, the id cannot be changed, ten bad inputs refused (empty, blank, too long, short, uppercase, space, hyphen, taken), `username_available` for taken, taken in another case, free and malformed names, user B cannot see, change, forge a profile for a third user, take A's username by editing or hard delete, and a signed out visitor cannot call the function or read rows.
- Mutation checks (each applied alone to the migration, then restored): select policy opened gave `FAIL: user B saw 2 profiles`; unique index removed gave `FAIL: this profile was accepted: Bob|Smith|ada_l`; function left open to anon gave `FAIL: a signed out visitor can ask about usernames`; format check removed gave `FAIL: this profile was accepted: Bob|Smith|ab`; insert policy opened gave `FAIL: user B created a profile for another user` (the first version of this check was vacuous, because A already had a profile, and was fixed by forging one for a third user). Opening only the update policy changes nothing, because Postgres also applies the select policy to the row being updated, so the select policy covers it.
- After the merge (PR 24) CI applied `0005` to the dev project (the table answered 200 within 10 s). Checked through the API with two temporary users (deleted afterwards, 1 real user left): A creates a profile (201) and reads it back with the name trimmed, B reads 0 rows, B changing or deleting A's profile affects 0 rows, B forging a profile for A gets 403, a taken username 409, a badly formed one 400, `username_available` answers false for a taken name, true for a free one and false for a malformed one, a signed out call to it gets 401 and a signed out read of profiles returns nothing.

Slice 2 (criteria 1 to 4 and part of 10), branch `feat/auth-email-code`:

- `src/ui/SignInScreen.tsx` replaces the sign in form in `app/index.tsx`: email, then a 6 digit code (`signInWithOtp` with `shouldCreateUser`, then `verifyOtp` type `email`), a new code can be asked for after a 60 s wait (shown as a countdown, or the wait the server names), "use a different email", Google on web, no password field. `src/core/auth/errors.ts` turns Supabase errors into plain messages (wrong or expired code, rate limit with the wait, bad address, no connection) and has 4 unit tests.
- e2e: the sign-out tests now sign in with the code. The code is read through the admin API `generate_link` and the screen's request to send mail is mocked in the test, so no real email is ever sent to the test addresses (they are made-up Gmail addresses, and bounces would hurt the sender). New tests: `c1` sign in with a code and stay signed in after a reload (criteria 1 and 4, no password field, Google button present), `c2` an email with no account gets one (register), `c3` a wrong code shows an error and does not sign in, and a code that is not 6 digits is refused on the screen, `c4` a rate limit answer shows "Too many codes" and the send button waits. `npm run test:e2e`: 22 passed (one earlier full run had test 7 stall for 2 minutes, a network stall, it passed alone in 6 s and in the next full run). Lint, format check, typecheck and 13 unit tests pass.
- Not proven: that a real email arrives and shows 6 digits (Gmail SMTP and both templates). The tests never send mail, by design. The human checks this by opening the deployed app or a preview, asking for a code for their own address and reading the email. Also not proven: Expo Go (slice 4), and that a new address really gets the Confirm signup email with a code instead of a link (only the real email shows this).

## Notes

- Tests do not need an inbox: the admin API `generate_link` returns the code.
- The sync e2e tests start from saved sessions, and the sign-out tests use the password screen to sign in again. They need a different way to sign in when the password form goes (slice 2).
- The screen follows the look of the tasks screen (`src/ui/tokens.ts`). The Figma prototype shows no registration screens, so this one is designed from the same pieces.
