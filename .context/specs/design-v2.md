# Design v2: feel, shell, calendar, icons, spacing

Status: in progress

## Problem

The human (2026-10-03): the web app does not match the Paper file, spacing and alignment are off, moving between pages and reloading flicker, task options hide behind right-click, Upcoming stops at one week, the icons are a generic kit, there is no real app icon, and Claude's connector shows Supabase's icon. He added inspiration to Paper (page Inspiration): the Devin and Cursor sites and app windows.

What the inspiration does (read from the Paper page Inspiration):
- Sidebar: a quiet primary action (a soft grey row, not a black pill), nav rows about 38 px with an 18 px icon, section headers ("Sessions", "Chats") with their own +, filter and more actions, the account at the bottom with name, handle, help and settings.
- Menus grouped under small section labels, real brand icons per model or app, a check on the chosen item, one soft shadow. Toasts dark, bottom right, icon plus one action.
- Pages swap instantly; only new things animate in. Calm, little decoration, precise spacing.

## Slices (each its own PR with a preview)

1. Feel and navigation: no flash on reload or page switch, task actions visible on hover, real app icon and favicon, the MCP address on Tovy's own site.
2. Shell like Devin and Cursor: sidebar structure above, account at the bottom with settings, grouped menus with app icons, the Google icon on sign in.
3. Calendar: Upcoming scrolls through any week and month, with a month picker; no seven day limit.
4. Custom icons: a Tovy icon set drawn to match the stones mark, replacing Phosphor.
5. Spacing pass: every screen screenshotted at Paper's sizes and corrected until it matches (Paper `05 Web · Today`, `03/04 Phone · Today`, `02 Components`).

## Slice 1 acceptance criteria

1. Reload: the boot page (public/index.html) shows the saved theme's background and, for a signed-in person on a wide screen, the empty sidebar before any JavaScript runs; the app's loading states draw the same frame (BootShell). No white flash, no theme flip, no sidebar that opens then collapses.
2. Switching tabs or pages inside a tab is instant: no fade, no rise, rows already there do not replay an entrance. Only rows that arrive later rise in.
3. Web task rows: pointing at a row swaps the project name for Schedule, Move to project and More; each opens the same sheet or menu as right-click.
4. App icon, Android adaptive icon, splash, favicon (ico and png), apple touch icon and web manifest come from the Tovy mark.
5. `https://<tovy site>/mcp` forwards to the MCP server (Vercel edge function `api/mcp.ts`); the server names that address in its sign-in hints (header `x-mcp-public-url`, validated). Connected apps shows this address on the web. Apps' own icons (`logo_uri`) show in Connected apps and on the consent screen, with a letter when there is none.

## Slice 3 acceptance criteria

1. Upcoming lists every day from today on, as far as the person scrolls (it grows near the end, up to a year), then later days that have tasks.
2. Above the list: the month (press for a month grid, Monday first, dots on busy days, arrows by month; a popover on wide screens, a panel on phones; Escape closes it), previous and next week, and Today.
3. The week strip shows Monday to Sunday of the week in view; past days are faded and cannot be picked; it follows the scroll.
4. Picking any future day (strip, grid or week arrows) scrolls to it, adding days first when needed. On the web the calendar stays at the top while the list scrolls.

## Progress

- [x] Slice 1 built; frame-by-frame check with Playwright: page switch goes straight from one page to the next; reload shows the frame from the first painted frame; hover actions verified; 16 MCP tests, 91 unit tests
- [ ] Human: after merge, reconnect Claude with https://<tovy site>/mcp so it shows the Tovy icon
- [x] Slice 2 (in the same PR): sidebar header is the mark, wordmark and collapse only; Projects head shows + New project on hover; the account sits at the bottom (avatar, name, @username, shortcuts and settings); menus can group items under labels, show a check or a key, and set Delete apart after a hairline; Google's own G on "Continue with Google" (from Google's sign-in assets); checked in Chromium at 1440, light and dark
- [x] Slice 3: calendar as above; views tests for weeks, month grid and day counts; checked in Chromium at 1440 light and 390 dark (jump two months ahead, next week, scroll into January)
- [x] Slice 4: Tovy's own icon set (src/ui/iconSet.ts): 54 icons on a 24 grid, round ends and joins, one 1.65 line, solid dots as the stones motif, a soft fill for the active nav item; drawn with react-native-svg, Phosphor no longer imported (the package can be removed later); checked on a preview sheet at 40/20/16 px and in the app at 1440 light and 390 dark
- [x] Slice 5 (first pass, against Paper `05 Web · Today` and `03 Phone · Today`): Today has the title, "Saturday 3 October · 5 tasks" and a View menu (Done today on or off, Upcoming, Search) instead of the greeting and composer, with an Add task row at the end (N focuses it); rows 14 above and below, 34 for the check, 4 between title and meta, 12 between meta parts; section heads 28 above, 10 below; hairlines as wide as the column; page 56 from the top, 64 at the sides; sidebar Add task 36 tall; the phone tab bar has no sliding bar. Measured at 1440: within 1 to 2 px of Paper
- [x] Slice 5, second pass (Paper `02 Components`): menus are words with their keys (Open Enter, Schedule S, Move M; S and M work on a focused row), settings rows have no icons and the theme is chosen in its row with a white-pill switch, quick add is Paper's card (understood words underlined in the sentence, a description, a date chip, the project at the left of the footer), a project page has a plain title on the web, and no screen talks about syncing (the sync row only appears when changes are not saved yet)
- [ ] Human: check the preview against Paper; other screens follow the same row and section rules, say which still look off
