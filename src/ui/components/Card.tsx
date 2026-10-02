import type { ReactNode } from 'react'
import { Pressable, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { radius } from '../tokens'
import { transition, useFocusRing, useHover } from './web'

// Style guide: radius 12, a hairline, padding 16. The hero card is on panel, padding 20.
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
  const ring = useFocusRing(c.primary)
  const base: ViewStyle = {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.line,
    padding: hero ? 20 : 16,
    backgroundColor: hero ? c.panel : hovered && onPress ? c.hover : c.bg,
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
