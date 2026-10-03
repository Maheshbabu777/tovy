import { useEffect, useRef, useState } from 'react'
import { Animated, PanResponder, Platform } from 'react-native'
import { follow, isHorizontal, swipeDecision, type SwipeAction } from '../../core/swipe'
import { EASE, prefersReducedMotion } from '../motion'
import { haptic } from '../haptics'

// A sideways swipe on a row (spec mobile-screens, criterion 3), with React Native's PanResponder so it needs no native
// library. The row follows the finger; let go past the commit point and it slides off, the action runs, and the row
// returns to place (by then it has usually moved to another section). Short of it, it springs back.
// `left: false` turns off the left swipe (a finished task has nothing to move to tomorrow).
export function useSwipe(onSwipe: ((action: SwipeAction) => void) | undefined, { left = true } = {}) {
  const [x] = useState(() => new Animated.Value(0))
  const width = useRef(360)
  const latest = useRef(onSwipe)
  const allowLeft = useRef(left)
  const committing = useRef(false) // a swipe is sliding off: a new touch does not start another one
  const lastSwipe = useRef(0) // when the last swipe moved the row, so the tap that ends it is not taken as a press
  const armed = useRef(false) // past the commit point: a tap is felt once each way across it
  useEffect(() => {
    latest.current = onSwipe
    allowLeft.current = left
  }, [onSwipe, left])

  // The handlers read the refs only when a gesture fires, never while rendering, which the hooks rule cannot see.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        !!latest.current && !committing.current && isHorizontal(g.dx, g.dy) && (g.dx > 0 || allowLeft.current),
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        !!latest.current && !committing.current && isHorizontal(g.dx, g.dy) && (g.dx > 0 || allowLeft.current),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        lastSwipe.current = Date.now()
      },
      onPanResponderMove: (_e, g) => {
        lastSwipe.current = Date.now()
        const dx = allowLeft.current ? g.dx : Math.max(0, g.dx)
        x.setValue(follow(dx, width.current))
        const past = swipeDecision(dx, 0, width.current) !== null
        if (past !== armed.current) {
          armed.current = past
          haptic.select()
        }
      },
      onPanResponderRelease: (_e, g) => {
        armed.current = false
        const action = swipeDecision(allowLeft.current ? g.dx : Math.max(0, g.dx), g.vx, width.current)
        const native = Platform.OS !== 'web'
        if (!action) {
          Animated.spring(x, { toValue: 0, useNativeDriver: native, bounciness: 0, speed: 20 }).start()
          return
        }
        const out = (g.dx > 0 ? 1 : -1) * width.current
        committing.current = true
        const done = () => {
          committing.current = false
          latest.current?.(action)
          x.setValue(0)
        }
        if (prefersReducedMotion()) done()
        else Animated.timing(x, { toValue: out, duration: 180, easing: EASE, useNativeDriver: native }).start(done)
      },
      onPanResponderTerminate: () => x.setValue(0),
    }),
  )

  return {
    x,
    handlers: onSwipe ? responder.panHandlers : {},
    onLayout: (w: number) => {
      width.current = w
    },
    // True right after a swipe: the press that ends a drag should not open the task.
    justSwiped: () => Date.now() - lastSwipe.current < 350,
  }
}
