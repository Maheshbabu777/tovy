// What a horizontal swipe on a task row means (spec mobile-screens, criterion 3). Pure, so it can be tested.
//   Right: finish (or reopen a finished task). Left: move to tomorrow.
//   It commits past 30% of the row width, or on a quick flick (over 0.6 px per ms) that has moved at least 48 px.
//   Anything less springs back.

export type SwipeAction = 'done' | 'tomorrow'

export const COMMIT_RATIO = 0.3
const FLICK_SPEED = 0.6
const FLICK_MIN = 48

export function swipeDecision(dx: number, vx: number, width: number): SwipeAction | null {
  const far = Math.abs(dx) >= width * COMMIT_RATIO
  const flick = Math.abs(vx) >= FLICK_SPEED && Math.abs(dx) >= FLICK_MIN && Math.sign(vx) === Math.sign(dx)
  if (!far && !flick) return null
  return dx > 0 ? 'done' : 'tomorrow'
}

// A swipe starts only when the finger moves sideways clearly more than up or down, so scrolling the list is never taken.
export const isHorizontal = (dx: number, dy: number) => Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5

// How far the row follows the finger: freely up to the commit point, then with resistance.
export function follow(dx: number, width: number): number {
  const limit = width * COMMIT_RATIO
  if (Math.abs(dx) <= limit) return dx
  const extra = Math.abs(dx) - limit
  return Math.sign(dx) * (limit + extra * 0.35)
}
