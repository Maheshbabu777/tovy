# Auth email code

Status: draft

Size: risky (sign-in).

## Problem

Tovy's plan is Google plus an emailed 6 digit code, so nobody has to make up a password. Google on web works (spec `auth`). The email code was split out on 2026-10-02 because it needs email setup the human has not done yet, and the human chose to do it later. Until it ships, the sign-in screen still shows the spike's password form.

## Acceptance criteria

1. A user enters their email, gets a 6 digit code, enters it, and lands signed in on the notes screen. This works on web and in Expo Go.
2. A wrong or expired code shows an error and does not sign the user in. Asking for a new code is possible, and a rate limit message is shown instead of failing silently.
3. The sign-in screen offers only Google (web) and email code, with no password field.
4. A session created by the code flow survives a reload (the earlier test used a session placed by the test harness).

## Out of scope

- Google on a phone (dev build spec), a custom domain, profile screen.

## Open questions

- For you to do, I can't: sign up at Resend with the address you test with, create an API key, enter it in Supabase (Authentication, Emails, SMTP: host `smtp.resend.com`, port `465`, username `resend`, sender `onboarding@resend.dev`), then set the Magic Link template to show `{{ .Token }}` (locked until custom SMTP is on). Answer: pending.
- Until a domain exists, Resend only delivers to the owner's own address. Agree? Answer: pending.

## Plan

<!-- Written when the setup above is done. Roughly: sign in screen with email then code step (signInWithOtp, verifyOtp), remove the password form and the tests that use it, e2e test that reads the code through the admin API generate_link, wrong code test. -->

## Progress

- [ ] Setup done by the human
- [ ] Plan written and approved

## Notes

- Tests do not need an inbox: the admin API `generate_link` returns the code.
- The sync e2e tests start from saved sessions, and the sign-out tests use the password screen to sign in again. They need a different way to sign in when the password form goes.
