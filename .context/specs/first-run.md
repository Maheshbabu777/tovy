# Sign in and first run on a phone

Status: in progress

Waiting on: the human trying it (built overnight).

## Problem

The sign in, code and profile setup screens were one centred block on every screen size, so on a phone the fields and buttons sat in the middle, away from the thumb, and the keyboard covered them. The first screen also said nothing about what Tovy is. Part of the human's "mobile should follow the UI laws" request (2026-10-03), done overnight under his standing instruction.

## Acceptance criteria

1. Phone: a brand line (mark and wordmark) at the top, the words in the middle, and fields and buttons pinned to the bottom; the keyboard pushes them up (KeyboardAvoidingView on iOS, the window resize on Android and the web).
2. Web: one centred column, unchanged in behaviour, now with the wordmark.
3. The first screen says what Tovy is ("Your day, in order." and one line under it). The code screen explains that the code works once, expires and may land in spam.
4. Every test id the sign in tests use (`email`, `send-code`, `code`, `change-email`, `resend-code`, `auth-error`, `google-sign-in`, `first-name`, `last-name`, `username`, `save-profile`) is kept.
5. Lint, format, typecheck, unit tests and web export pass; screenshots at 390 light and dark and 1440.

## Out of scope

- A Google mark on the button (brand rules for the mark need the official asset; left for the human).
- Onboarding slides after sign in.

## Progress

- [x] `AuthLayout` with an `actions` slot (bottom on a phone), the sign in, code, setup and offline screens moved onto it
- [x] Checks and screenshots (sign in at 390 light and dark, 1440; the email error state at 390)
- [ ] Human checks on a phone, with the keyboard up
