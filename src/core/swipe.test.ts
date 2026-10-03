import { follow, isHorizontal, swipeDecision } from './swipe'

describe('swipe on a task row', () => {
  it('commits past 30% of the width, right finishes and left moves to tomorrow', () => {
    expect(swipeDecision(120, 0, 390)).toBe('done')
    expect(swipeDecision(-120, 0, 390)).toBe('tomorrow')
    expect(swipeDecision(100, 0, 390)).toBeNull()
  })
  it('a quick flick commits early, but not a tiny one or one against the direction', () => {
    expect(swipeDecision(60, 1.2, 390)).toBe('done')
    expect(swipeDecision(30, 1.2, 390)).toBeNull()
    expect(swipeDecision(60, -1.2, 390)).toBeNull()
  })
  it('leaves vertical scrolling alone', () => {
    expect(isHorizontal(14, 2)).toBe(true)
    expect(isHorizontal(14, 12)).toBe(false)
    expect(isHorizontal(8, 0)).toBe(false)
  })
  it('follows the finger, then resists past the commit point', () => {
    expect(follow(50, 400)).toBe(50)
    expect(follow(220, 400)).toBeCloseTo(120 + 100 * 0.35)
    expect(follow(-220, 400)).toBeCloseTo(-(120 + 100 * 0.35))
  })
})
