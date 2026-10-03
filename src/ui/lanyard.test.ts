import { bandPath, barcode, cardNumber, Lanyard } from './lanyard'

const make = () => new Lanyard({ anchor: { x: 200, y: 0 }, ropeLength: 200, cardHeight: 300 })

describe('lanyard', () => {
  it('hangs straight and rests where it starts', () => {
    const l = make()
    for (let i = 0; i < 120; i++) l.advance(1 / 60)
    expect(l.clip.x).toBeCloseTo(200, 0)
    expect(l.foot.y - l.clip.y).toBeCloseTo(300, 0)
    expect(l.resting()).toBe(true)
  })

  it('falls into place after a drop and settles', () => {
    const l = make()
    l.drop(60, 400)
    l.advance(1 / 60)
    expect(l.resting()).toBe(false)
    for (let i = 0; i < 60 * 12; i++) l.advance(1 / 60)
    expect(Math.abs(l.angle())).toBeLessThan(2)
    expect(l.clip.y).toBeGreaterThan(150)
  })

  it('follows the pointer while held, and keeps swinging when thrown', () => {
    const l = make()
    l.held = { x: 320, y: 260, along: 0.5 }
    for (let i = 0; i < 30; i++) l.advance(1 / 60)
    const mid = { x: (l.clip.x + l.foot.x) / 2, y: (l.clip.y + l.foot.y) / 2 }
    expect(mid.x).toBeCloseTo(320, 0)
    expect(mid.y).toBeCloseTo(260, 0)
    l.held = { x: 420, y: 260, along: 0.5 }
    l.advance(1 / 60)
    l.held = null
    l.advance(1 / 60)
    expect(l.velocity().x).toBeGreaterThan(100)
  })

  it('draws the band, numbers the card and makes its code', () => {
    expect(
      bandPath([
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 0, y: 20 },
      ]),
    ).toBe('M 0.0 0.0 Q 0.0 10.0 0.0 15.0 L 0.0 20.0')
    expect(cardNumber('7f3a91c2-0000-4000-8000-000000000000')).toBe('TVY-7F3A-91C2')
    expect(barcode('abc', 4)).toEqual([2, 3, 1, 2])
  })
})
