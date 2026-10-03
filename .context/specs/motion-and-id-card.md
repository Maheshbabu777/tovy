# Motion and the ID card

Status: in progress

Waiting on: the human checks the preview (card feel on a real phone and in the browser).

## Problem

The human (2026-10-03): the app works but is not designed for delight; it should feel modern, with transitions and animation, and the profile should be the lanyard ID card from the backlog, not boring. References were researched and added to Paper (page "Motion & ID card": 06 Motion · References, 07 Web · Profile · ID card, 08 ID card · Back · Dark · States).

## Acceptance criteria

1. Profile shows the person's card on a Tovy lanyard: web on its own dotted stage left of the settings, phone under the title. It drops in and settles; it can be grabbed, dragged and thrown, swings with the band and damps back; it leans and tilts with its speed, a soft light slides over it; a click, tap, Enter or Space turns it over. Light theme black card, dark theme white card.
2. The card shows real data: name, @username, the month the account was made, tasks finished, connected AI apps, a card number and code from the account id.
3. Reduce Motion: the card hangs still and turns over without the spin. The simulation stops when the card rests.
4. Finishing a task: the circle presses, fills with a pop, a line draws through the title, the row stays a beat, folds away, then the task is marked done (Undo as before). Keyboard and swipe paths are not slowed down.
5. Controls press in (scale 0.97, icon buttons 0.92, the check 0.88). Menus grow out of the point clicked. The month grid grows out of its button. Toasts settle in from 0.95 and leave faster than they came. Sheets slide up on the drawer curve on a phone and settle from 0.96 on the web, with the dimmed backdrop fading.
6. Upcoming: the picked day's fill glides between days on a spring. Empty Today and Inbox show the three stones gently balancing.
7. One strong ease out curve (0.23, 1, 0.32, 1) for the whole app, the drawer curve for sheets. Pages still swap instantly.

## Out of scope

- A true 3D lanyard with React Three Fiber and Rapier (heavy on phones; the 2.5D Verlet card covers the feel on every platform).
- Haptics (stage 5, needs expo-haptics on a device).

## Plan

- `src/ui/lanyard.ts` (Verlet rope plus a stiff card, pure, tested), `src/ui/IdCard.tsx` (stage, band with text, card faces, sheen, gestures), Profile layout.
- Motion pieces in `motion.ts`, `tokens.ts`, `web.ts` (`pressScale`), TaskRow, Sheet, Toast, ContextMenu, Calendar, Upcoming week strip, Feedback (`Stones`).

## Progress

- [x] Research and Paper page with references, motion tokens, the finish moment, the card front, back, dark theme and behaviour
- [x] Card built and checked in Chromium at 1440 light and dark and at 390: arrival, drag, throw, flip
- [x] Motion pieces built; finish moment checked frame by frame (fill 60 ms, strike 250 ms, fold 520 ms, gone 760 ms)
- [ ] Human: try the card and the finish moment on the preview and on a phone

## Notes

- References: Vercel's interactive event badge (rope joints and a spherical joint, card faces the viewer), Emil Kowalski's animation rules (under 300 ms, ease out, press 0.97, never from scale 0, exits faster), Things 3 finishing, Linear and Raycast navigation.
