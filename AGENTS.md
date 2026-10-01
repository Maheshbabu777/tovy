# Agent instructions

This project uses the powers workflow. Project context lives in `.context/`.

Before any task:

1. Read `.context/project.md` and `.context/preferences.md`. If they're missing, set them up first by following `.powers/core/context.md`.
2. For feature work and bug fixes, read `.powers/SKILL.md` and follow it.
3. If a spec in `.context/specs/` matches the task, continue it instead of starting a new one.

Rules:

- Write project notes, specs and decisions only in `.context/`. Nowhere else.
- `.context/preferences.md` is how the human wants work done here. It beats any general rule you follow.
- Never commit with `--no-verify`. If the commit hook rejects a message, fix the message.
- If `.context/` disagrees with the code, trust the code and fix `.context/`.
- End every task with a `Context updated:` line saying which files you changed and why, or `none, because <reason>`.
