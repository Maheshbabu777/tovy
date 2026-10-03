// The physics of the profile ID card on its lanyard (spec motion-and-id-card). A small Verlet simulation in 2D:
// a rope of points hangs from an anchor, and the card is a stiff stick of two points (its clip and its bottom edge)
// joined to the end of the rope. Gravity pulls, the constraints keep lengths, and positions carry their own speed
// (Verlet), so letting go while moving throws the card. Plain numbers and no React, so it can be tested.

export type Point = { x: number; y: number; px: number; py: number }

export type LanyardOptions = {
  anchor: { x: number; y: number }
  ropeLength: number // from the anchor to the clip at rest
  cardHeight: number
  segments?: number
  gravity?: number // px per second squared
  damping?: number // kept speed per step, 0 to 1
}

const STEP = 1 / 120 // fixed physics step, s

export class Lanyard {
  rope: Point[]
  clip: Point
  foot: Point // the middle of the card's bottom edge
  anchor: { x: number; y: number }
  readonly segment: number
  readonly cardHeight: number
  readonly gravity: number
  readonly damping: number
  // While held: where the pointer is, and which point of the card it holds (0 at the clip, 1 at the foot).
  held: { x: number; y: number; along: number } | null = null
  private carry = 0

  constructor(o: LanyardOptions) {
    const n = o.segments ?? 10
    this.anchor = { ...o.anchor }
    this.segment = o.ropeLength / n
    this.cardHeight = o.cardHeight
    this.gravity = o.gravity ?? 2600
    this.damping = o.damping ?? 0.986
    const at = (x: number, y: number): Point => ({ x, y, px: x, py: y })
    this.rope = Array.from({ length: n }, (_, i) => at(o.anchor.x, o.anchor.y + i * this.segment))
    this.clip = at(o.anchor.x, o.anchor.y + o.ropeLength)
    this.foot = at(o.anchor.x, o.anchor.y + o.ropeLength + o.cardHeight)
  }

  // Lift the whole lanyard by `dy` (and push it sideways by `dx`) without speed, so it falls into place: the arrival.
  drop(dx: number, dy: number) {
    for (const p of this.points()) {
      p.x += dx
      p.y -= dy
      p.px = p.x
      p.py = p.y
    }
  }

  points(): Point[] {
    return [...this.rope, this.clip, this.foot]
  }

  // Advance by `dt` seconds (real time between frames), in fixed steps so it behaves the same at any frame rate.
  advance(dt: number) {
    this.carry = Math.min(this.carry + dt, 0.05)
    while (this.carry >= STEP) {
      this.step()
      this.carry -= STEP
    }
  }

  private step() {
    const g = this.gravity * STEP * STEP
    for (const p of this.points().slice(1)) {
      const vx = (p.x - p.px) * this.damping
      const vy = (p.y - p.py) * this.damping
      p.px = p.x
      p.py = p.y
      p.x += vx
      p.y += vy + g
    }
    for (let i = 0; i < 14; i++) this.solve()
  }

  private solve() {
    const [first] = this.rope
    first.x = this.anchor.x
    first.y = this.anchor.y
    const chain = [...this.rope, this.clip]
    for (let i = 0; i < chain.length - 1; i++) stick(chain[i], chain[i + 1], this.segment, i === 0 ? 0 : 0.5)
    stick(this.clip, this.foot, this.cardHeight, 0.5)
    if (this.held) {
      // The held point of the card goes where the pointer is; the card keeps its length around it.
      const { x, y, along } = this.held
      const hx = this.clip.x + (this.foot.x - this.clip.x) * along
      const hy = this.clip.y + (this.foot.y - this.clip.y) * along
      const dx = x - hx
      const dy = y - hy
      this.clip.x += dx
      this.clip.y += dy
      this.foot.x += dx
      this.foot.y += dy
    }
  }

  // The card's tilt from hanging straight, in degrees (clockwise positive).
  angle(): number {
    return (Math.atan2(this.foot.x - this.clip.x, this.foot.y - this.clip.y) * -180) / Math.PI
  }

  // How fast the card's middle moves, px per second.
  velocity(): { x: number; y: number } {
    const mx = (this.clip.x + this.foot.x) / 2 - (this.clip.px + this.foot.px) / 2
    const my = (this.clip.y + this.foot.y) / 2 - (this.clip.py + this.foot.py) / 2
    return { x: mx / STEP, y: my / STEP }
  }

  // Calm enough to stop drawing frames: nothing held and the card barely moving.
  resting(): boolean {
    if (this.held) return false
    // Still up in the air after a drop counts as moving, even before it has picked up speed.
    const hang = Math.hypot(this.clip.x - this.anchor.x, this.clip.y - this.anchor.y)
    if (Math.abs(hang - this.segment * this.rope.length) > 3) return false
    const v = this.velocity()
    return Math.hypot(v.x, v.y) < 4 && Math.abs(this.angle()) < 0.6
  }
}

// Keep two points `length` apart. `share` is how much of the fix the first point takes (0: only the second moves).
function stick(a: Point, b: Point, length: number, share: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy) || 0.0001
  const diff = (d - length) / d
  a.x += dx * diff * share
  a.y += dy * diff * share
  b.x -= dx * diff * (1 - share)
  b.y -= dy * diff * (1 - share)
}

// A smooth path through the rope points, for drawing the band (quadratic curves through the midpoints).
export function bandPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2
    const my = (points[i].y + points[i + 1].y) / 2
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
  }
  const last = points[points.length - 1]
  return `${d} L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
}

// A card number people can read back, made from the account id: "TVY-7F3A-91C2".
export function cardNumber(userId: string): string {
  const hex = userId
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase()
    .padEnd(8, '0')
  return `TVY-${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

// Bar widths (1 to 3) for the little code on the card, from the account id, so every card's code is its own.
export function barcode(userId: string, bars = 18): number[] {
  const hex = userId.replace(/[^0-9a-f]/gi, '') || '0'
  return Array.from({ length: bars }, (_, i) => (parseInt(hex[i % hex.length], 16) % 3) + 1)
}
