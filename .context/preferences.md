# Preferences for this project

How the human wants work done in this repo. This beats any general rule in the powers playbook.

These start as the human's personal defaults. Change them per project as needed.

Agents: add a line only when the human states a standing preference for this project in their own words ("from now on...", "always...", "in this repo..."). Write it close to how they said it, with the date. Never add a preference you inferred. Edit or remove lines only when the human asks.

## Enforced by scripts

<!-- Read by scripts/check-commit.sh. Delete a line to fall back to the default shown. -->
- commit-types: feat fix chore docs refactor test style perf ci build revert
- commit-max-subject: 72
- commit-max-body-lines: 3

## Commits and PRs

- Subject is `type: description`, lowercase after the prefix, no period at the end.
- A body only when the why isn't obvious, and then a line or two, never a paragraph.
- PR titles use the same format. PR bodies explain why, not just what.

## Branches

- Don't create random branch names like `claude/...something`. Everything needs to be meaningful: name a branch after the work, e.g. `feat/sync-spike`. (2026-10-01)
- Keep the repo clean and structured. Create PRs and merge things. (2026-10-01)

## Code

- Practical working code over theoretical perfection. Don't over-engineer.

## Writing

- No em dashes or en dashes in anything a human reads. Use periods, commas or hyphens.
- No sycophantic openers.

## Product

- Design for the user and show only what is useful to them. No technical details like "synced" on screen; judge every screen from the user's point of view. Go all in and complete the whole design. (2026-10-02)

## Working style

- The human checks screens on the preview himself. Don't drive Chrome or take browser screenshots for manual checks; they burn credits that are better spent on building. (2026-10-03)
- 
