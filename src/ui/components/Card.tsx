import type { ReactNode } from 'react'
import { Pressable, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { radius } from '../tokens'
import { transition, useFocusRing, useHover } from './web'

// Design 7.17: radius 14, 1 px ink-3 outline, padding 16. The hero card is surface coloured, radius 22, padding 20.
export function Card({
  children,
  hero = false,
  onPress,
  style,
  testID,
}: {
  children: ReactNode
  hero?: boolean
  onPress?: () => void
  style?: ViewStyle
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  const base: ViewStyle = {
    borderRadius: hero ? radius.xl : radius.lg,
    borderWidth: 1,
    borderColor: c.ink3,
    padding: hero ? 20 : 16,
    backgroundColor: hero ? c.surface : hovered && onPress ? c.ink1 : c.bg,
  }
  if (!onPress) {
    return (
      <View testID={testID} style={[base, style]}>
        {children}
      </View>
    )
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[base, transition('background-color'), ring.style, style]}
      {...hover}
      {...ring.handlers}
    >
      {children}
    </Pressable>
  )
}
