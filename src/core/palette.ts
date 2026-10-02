import type { Project, Task } from './sync/tasks'

// What the command palette lists for a query (web Ctrl or Cmd K, and the search button). Pure, so it can be tested.

export type PaletteItem =
  | {
      kind: 'go'
      id: string
      label: string
      key?: string
      href: '/inbox' | '/' | '/upcoming' | '/projects' | '/profile'
    }
  | { kind: 'project'; id: string; label: string }
  | { kind: 'task'; id: string; label: string; done: boolean }
  | { kind: 'theme'; id: string; label: string; key?: string }
  | { kind: 'add'; id: string; label: string; title: string }

const COMMANDS: PaletteItem[] = [
  { kind: 'go', id: 'go-inbox', label: 'Go to Inbox', key: 'I', href: '/inbox' },
  { kind: 'go', id: 'go-today', label: 'Go to Today', key: 'T', href: '/' },
  { kind: 'go', id: 'go-upcoming', label: 'Go to Upcoming', key: 'U', href: '/upcoming' },
  { kind: 'go', id: 'go-projects', label: 'Go to Projects', href: '/projects' },
  { kind: 'go', id: 'go-profile', label: 'Open Profile and settings', href: '/profile' },
  { kind: 'theme', id: 'theme', label: 'Switch light or dark' },
]

// Every word of the query appears somewhere in the text, ignoring case.
export const matches = (text: string, query: string) => {
  const hay = text.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

export function paletteResults(query: string, data: { projects: Project[]; tasks: Task[] }, limit = 8): PaletteItem[] {
  const q = query.trim()
  if (!q) return COMMANDS
  const commands = COMMANDS.filter((c) => matches(c.label, q))
  const projects: PaletteItem[] = data.projects
    .filter((p) => p && !p.deleted && matches(p.name, q))
    .map((p) => ({ kind: 'project', id: `project-${p.id}`, label: p.name }))
  const tasks: PaletteItem[] = data.tasks
    .filter((t) => t && !t.deleted && matches(t.title, q))
    .sort((a, b) => Number(!!a.done_at) - Number(!!b.done_at))
    .map((t) => ({ kind: 'task', id: `task-${t.id}`, label: t.title, done: !!t.done_at }))
  return [...commands, ...projects, ...tasks]
    .slice(0, limit)
    .concat({ kind: 'add', id: 'add', label: `Add task "${q}"`, title: q })
}
