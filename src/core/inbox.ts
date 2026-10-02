import type { Proposal, ProposalKind, Task } from './sync/tasks'
import { dueLabel } from './today'

const KIND_LABEL: Record<ProposalKind, string> = {
  add_task: 'Add task',
  update_progress: 'Update progress',
  reschedule: 'Reschedule',
}
export const kindLabel = (kind: ProposalKind) => KIND_LABEL[kind] ?? 'Change'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "just now", "2 min ago", "3 h ago", "yesterday", otherwise "Mon 5 Oct".
export function timeAgo(iso: string | null | undefined, now: Date): string {
  if (!iso) return ''
  const then = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'yesterday'
  return `${WEEKDAYS[then.getDay()]} ${then.getDate()} ${MONTHS[then.getMonth()]}`
}

// The two sides of the "What this changes" sheet.
export function changeSummary(p: Proposal, task: Task | undefined, now: Date): { before: string; after: string } {
  const before = p.before ?? {}
  const after = p.after ?? {}
  const due = (o: Record<string, unknown>) =>
    dueLabel(
      {
        due_date: typeof o.due_date === 'string' ? o.due_date : null,
        due_time: typeof o.due_time === 'string' ? o.due_time : null,
      },
      now,
    )
  if (p.kind === 'add_task') {
    const title = typeof after.title === 'string' && after.title.trim() ? after.title : p.title
    const when = typeof after.due_date === 'string' ? `\n${due(after)}` : ''
    return { before: 'Not in your tasks yet', after: `${title}${when}` }
  }
  if (p.kind === 'reschedule') {
    const from = Object.keys(before).length ? before : { due_date: task?.due_date, due_time: task?.due_time }
    return { before: due(from), after: due(after) }
  }
  const from = typeof before.progress === 'number' ? before.progress : (task?.progress ?? 0)
  return { before: `${from}%`, after: `${Number(after.progress) || 0}%` }
}

// Waiting proposals, newest first, grouped by the app that made them. Groups follow their newest proposal.
export function groupByApp(proposals: Proposal[]): { app: string; items: Proposal[] }[] {
  const newest = [...proposals].sort(
    (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || a.id.localeCompare(b.id),
  )
  const groups: { app: string; items: Proposal[] }[] = []
  for (const p of newest) {
    const group = groups.find((g) => g.app === p.app_name)
    if (group) group.items.push(p)
    else groups.push({ app: p.app_name, items: [p] })
  }
  return groups
}

export const waitingLabel = (count: number) =>
  count === 0 ? 'You are all caught up' : `${count} waiting for your approval`
