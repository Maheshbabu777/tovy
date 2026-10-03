import { Platform, type ViewStyle } from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from '../tokens'

export const isWeb = Platform.OS === 'web'

// Web only style bits (hover transitions, focus outline) are not in React Native's types.
export const webStyle = (style: Record<string, unknown>): ViewStyle => (isWeb ? (style as ViewStyle) : {})

export const transition = (properties: string, ms: number = motion.hover): ViewStyle =>
  webStyle({
    transitionProperty: properties,
    transitionDuration: `${ms}ms`,
    transitionTimingFunction: `cubic-bezier(${motion.easing.join(',')})`,
  })

// Whether the last thing the person did was press a key (so a focus ring is wanted) rather than click or tap.
let keyboardUser = false
if (isWeb && typeof window !== 'undefined') {
  window.addEventListener('keydown', () => (keyboardUser = true), true)
  window.addEventListener('pointerdown', () => (keyboardUser = false), true)
}

// The 2 px accent ring with a 2 px offset on every interactive element reached by keyboard (section 9).
export function useFocusRing(accent: string) {
  const [focused, setFocused] = useState(false)
  useEffect(() => () => setFocused(false), [])
  return {
    handlers: {
      onFocus: () => setFocused(keyboardUser),
      onBlur: () => setFocused(false),
    },
    style: focused
      ? webStyle({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: accent, outlineOffset: 2 })
      : ({} as ViewStyle),
  }
}

export function useHover() {
  const [hovered, setHovered] = useState(false)
  return { hovered, handlers: { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) } }
}

// Hover over a group of pressables (a task row and its action buttons): moving from one to the next fires "out" then
// "in", so "out" waits a moment and is cancelled by the next "in". The row's actions then stay put under the pointer.
export function useGroupHover() {
  const [hovered, setHovered] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onHoverIn = useCallback(() => {
    clearTimeout(timer.current)
    setHovered(true)
  }, [])
  const onHoverOut = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHovered(false), 60)
  }, [])
  return { hovered, handlers: { onHoverIn, onHoverOut } }
}

// A pressed control gives a little (scale 0.97, Paper "06 Motion"), so a touch is answered at once.
export const pressScale = (pressed: boolean, to = 0.97): ViewStyle => ({
  transform: [{ scale: pressed ? to : 1 }],
  ...webStyle({ transitionProperty: 'transform, background-color, opacity', transitionDuration: `${motion.press}ms` }),
})

// Shadows of the style guide (Space and shape): only what floats has one.
export const SHADOWS = {
  lift: '0 1px 2px rgba(0,0,0,0.06)',
  raisedS: '0 1px 2px rgba(0,0,0,0.06)',
  menu: '0 12px 32px rgba(0,0,0,0.08)',
  overlay: '0 12px 32px rgba(0,0,0,0.08)',
  toast: '0 12px 32px rgba(0,0,0,0.18)',
  fab: '0 8px 24px rgba(0,0,0,0.20)',
  card: '0 30px 60px rgba(0,0,0,0.22), 0 8px 16px rgba(0,0,0,0.12)', // the profile ID card
}
export const shadow = (value: string): ViewStyle => ({ boxShadow: value }) as ViewStyle
