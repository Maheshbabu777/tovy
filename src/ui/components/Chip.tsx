import { Pressable, Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../theme'
import { type } from '../tokens'
import { transition, useFocusRing, useHover } from './web'

// Design 7.3: height 32, pill, 1 px ink-3 border, 13 px medium. Active: accent border, accent-soft fill, accent text.
export function Chip({
  label,
  onPress,
  active = false,
  icon: Icon,
  dot,
  testID,
}: {
  label: string
  onPress?: () => void
  active?: boolean
  icon?: LucideIcon
  dot?: string // a project colour for the leading 6 px dot
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  const tint = active ? c.accent : c.ink7
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        {
          height: 32,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: active ? c.accent : c.ink3,
          backgroundColor: active ? c.accentSoft : hovered && onPress ? c.ink1 : 'transparent',
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        transition('background-color'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} /> : null}
      {Icon ? <Icon size={14} color={tint} strokeWidth={1.75} /> : null}
      <Text style={[type.label, { color: tint }]}>{label}</Text>
    </Pressable>
  )
}
