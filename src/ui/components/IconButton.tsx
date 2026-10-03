import { Pressable } from 'react-native'
import { type ToolkitIcon } from '../icons'
import { useTheme } from '../theme'
import { radius } from '../tokens'
import { pressScale, transition, useFocusRing, useHover } from './web'

// Style guide, Buttons: icon button 40 round, icon 20 in text-2, hover fill. It always has an accessible label (a tooltip on the web).
export function IconButton({
  icon: Icon,
  label,
  onPress,
  color,
  testID,
}: {
  icon: ToolkitIcon
  label: string
  onPress?: () => void
  color?: string
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      // @ts-expect-error `title` is the web tooltip, not in the native types
      title={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hovered ? c.hover : 'transparent',
        },
        transition('background-color'),
        ring.style,
        pressScale(pressed, 0.92),
      ]}
      {...hover}
      {...ring.handlers}
    >
      <Icon size={20} color={hovered ? c.text : (color ?? c.text2)} />
    </Pressable>
  )
}
