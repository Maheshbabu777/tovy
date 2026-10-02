import { Pressable, Text, View } from 'react-native'
import { type ToolkitIcon } from '../icons'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'
import { transition, useFocusRing, useHover } from './web'

// Style guide, Quick add chips: height 32, radius 6, 13 px medium. An empty one is outlined with a hairline; a set one is
// filled with hover and has no border.
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
  icon?: ToolkitIcon
  dot?: string // a project colour for the leading 6 px dot
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.primary)
  const tint = active ? c.text : c.text2
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        {
          height: 32,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: active ? c.hover : c.line,
          backgroundColor: active || (hovered && onPress) ? c.hover : 'transparent',
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
      {Icon ? <Icon size={14} color={tint} /> : null}
      <Text style={[type.label, { color: tint }]}>{label}</Text>
    </Pressable>
  )
}
