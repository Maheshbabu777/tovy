import { Platform, type ViewStyle } from 'react-native'
import { useEffect, useState } from 'react'
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

// Shadows of the style guide (Space and shape): only what floats has one.
export const SHADOWS = {
  lift: '0 1px 2px rgba(0,0,0,0.06)',
  raisedS: '0 1px 2px rgba(0,0,0,0.06)',
  menu: '0 12px 32px rgba(0,0,0,0.08)',
  overlay: '0 12px 32px rgba(0,0,0,0.08)',
  toast: '0 12px 32px rgba(0,0,0,0.18)',
  fab: '0 8px 24px rgba(0,0,0,0.20)',
}
export const shadow = (value: string): ViewStyle => ({ boxShadow: value }) as ViewStyle
