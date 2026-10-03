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

## Progress

- [x] Slice 1 built; frame-by-frame check with Playwright: page switch goes straight from one page to the next; reload shows the frame from the first painted frame; hover actions verified; 16 MCP tests, 91 unit tests
- [ ] Human: after merge, reconnect Claude with https://<tovy site>/mcp so it shows the Tovy icon
- [ ] Slices 2 to 5
