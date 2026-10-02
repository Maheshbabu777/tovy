import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native'
import { motion } from './tokens'

// Motion of the design system: one curve, short durations, no bounce. Everything here uses React Native `Animated`,
// which runs the same on the web and on a phone. With Reduce Motion on, every animation shows its end state at once.

export const EASE = Easing.bezier(...motion.easing)
const native = Platform.OS !== 'web'

let reduced = false
const listeners = new Set<(on: boolean) => void>()
function setReduced(on: boolean) {
  reduced = on
  listeners.forEach((l) => l(on))
}
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = query.matches
  query.addEventListener?.('change', (e) => setReduced(e.matches))
} else {
  void AccessibilityInfo.isReduceMotionEnabled?.().then(setReduced)
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced)
}

export const prefersReducedMotion = () => reduced

export function useReducedMotion(): boolean {
  const [on, setOn] = useState(reduced)
  useEffect(() => {
    listeners.add(setOn)
    return () => {
      listeners.delete(setOn)
    }
  }, [])
  return on
}

// Runs one timing to `to`, or jumps there when motion is reduced.
export function animate(value: Animated.Value, to: number, duration: number, delay = 0) {
  if (reduced) {
    value.setValue(to)
    return
  }
  Animated.timing(value, { toValue: to, duration, delay, easing: EASE, useNativeDriver: native }).start()
}

// Fade and rise in once, when the component mounts. `distance` is how far it rises, in px.
export function useEnter({ delay = 0, duration = 220, distance = 8 } = {}) {
  const [t] = useState(() => new Animated.Value(reduced ? 1 : 0))
  useEffect(() => {
    animate(t, 1, duration, delay)
  }, [t, duration, delay])
  return {
    opacity: t,
    transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  }
}

// Slide in from the right (the task panel and pushed pages).
export function useSlideIn({ duration = 220, distance = 24 } = {}) {
  const [t] = useState(() => new Animated.Value(reduced ? 1 : 0))
  useEffect(() => {
    animate(t, 1, duration)
  }, [t, duration])
  return {
    opacity: t,
    transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  }
}

// Pop in from 0.96 (menus, the palette).
export function usePop(duration = 140) {
  const [t] = useState(() => new Animated.Value(reduced ? 1 : 0))
  useEffect(() => {
    animate(t, 1, duration)
  }, [t, duration])
  return {
    opacity: t,
    transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
  }
}
