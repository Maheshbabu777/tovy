import { Pressable } from 'react-native'
import { type ToolkitIcon } from '../icons'
import { useTheme } from '../theme'
import { radius } from '../tokens'
import { transition, useFocusRing, useHover } from './web'

// Design 7.2: 40 by 40, radius 10, icon 20 in ink-6. It always has an accessible label (a tooltip on the web).
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
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      // @ts-expect-error `title` is the web tooltip, not in the native types
      title={label}
      onPress={onPress}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hovered ? c.ink2 : 'transparent',
        },
        transition('background-color'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      <Icon size={20} color={hovered ? c.ink : (color ?? c.ink6)} strokeWidth={1.75} />
    </Pressable>
  )
}
