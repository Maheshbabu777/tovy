// Moving through a list with the keyboard on the web (spec keyboard-lists): J or Down to the next task, K or Up to the
// one before, X to finish or reopen the focused one, Enter to open it (the row's own button does that). It works on
// whatever list is showing, by reading the rows in the page in order, so no screen has to take part.

const visible = (el: HTMLElement) => el.offsetParent !== null

function rows(): HTMLElement[] {
  if (typeof document === 'undefined') return []
  return Array.from(document.querySelectorAll<HTMLElement>('[data-testid="task"]')).filter(visible)
}

function currentRow(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const active = document.activeElement as HTMLElement | null
  return active?.closest<HTMLElement>('[data-testid="task"]') ?? null
}

// Focus the next (+1) or previous (-1) row. With nothing focused, Down starts at the first row and Up at the last.
export function moveFocus(step: 1 | -1): boolean {
  const list = rows()
  if (list.length === 0) return false
  const at = currentRow()
  const index = at ? list.indexOf(at) : -1
  const next = index < 0 ? (step > 0 ? 0 : list.length - 1) : Math.min(list.length - 1, Math.max(0, index + step))
  const target = list[next].querySelector<HTMLElement>('[data-testid^="open-"]')
  if (!target) return false
  target.focus()
  target.scrollIntoView?.({ block: 'nearest' })
  return true
}

// Press one of the focused row's own actions (its hover buttons show while it has focus): S schedules, M moves it.
export function pressOnFocused(testIdPrefix: string): boolean {
  const button = currentRow()?.querySelector<HTMLElement>(`[data-testid^="${testIdPrefix}"]`)
  if (!button) return false
  button.click()
  return true
}

// Set while a keyboard shortcut finishes a task, so the row skips the finishing moment: keys are used all day and
// should never wait on an animation (Paper "06 Motion"). The row reads and clears it.
export const keyboardFinish = { now: false }

// Finish or reopen the focused row. The row may move to another section; focus stays where it was in the list.
export function toggleFocused(): boolean {
  const at = currentRow()
  const done = at?.querySelector<HTMLElement>('[data-testid^="done-"]')
  if (!at || !done) return false
  const index = rows().indexOf(at)
  keyboardFinish.now = true
  done.click()
  keyboardFinish.now = false
  setTimeout(() => {
    const list = rows()
    list[Math.min(index, list.length - 1)]?.querySelector<HTMLElement>('[data-testid^="open-"]')?.focus()
  }, 50)
  return true
}

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'K'], label: 'Search and commands' },
  { keys: ['N'], label: 'Add a task' },
  { keys: ['Q'], label: 'Add a task in the sheet' },
  { keys: ['I'], label: 'Go to Inbox' },
  { keys: ['T'], label: 'Go to Today' },
  { keys: ['U'], label: 'Go to Upcoming' },
  { keys: ['J', '↓'], label: 'Next task' },
  { keys: ['K', '↑'], label: 'Previous task' },
  { keys: ['X'], label: 'Finish or reopen the task' },
  { keys: ['S'], label: 'Schedule the task' },
  { keys: ['M'], label: 'Move the task to a project' },
  { keys: ['Enter'], label: 'Open the task' },
  { keys: ['Esc'], label: 'Close the task or a sheet' },
  { keys: ['?'], label: 'These shortcuts' },
]
