import { Pressable, Text, View, type ViewStyle } from 'react-native'
import { type ToolkitIcon } from '../icons'
import { useTheme, useThemedStyles } from '../theme'
import { fonts, radius } from '../tokens'
import { transition, useFocusRing, useHover, webStyle } from './web'

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger'

// Design 7.1. At most one primary button per view. Disabled buttons are for the rare case: validate on submit instead.
export function Button({
  label,
  onPress,
  variant = 'primary',
  small = false,
  icon: Icon,
  disabled = false,
  bordered = false,
  fullWidth = false,
  testID,
  accessibilityLabel,
}: {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  small?: boolean
  icon?: ToolkitIcon
  disabled?: boolean
  bordered?: boolean // a ghost button with a 1 px outline ("Continue with Google")
  fullWidth?: boolean
  testID?: string
  accessibilityLabel?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  const s = useThemedStyles((col) => ({
    base: {
      minHeight: 44,
      paddingHorizontal: 20,
      borderRadius: radius.pill,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    small: { minHeight: 32, paddingHorizontal: 12 },
    label: { fontFamily: fonts.medium, fontSize: 15 },
    labelSmall: { fontSize: 13 },
    primary: { backgroundColor: col.accent },
    soft: { backgroundColor: col.accentSoft },
    ghost: { backgroundColor: col.ink1 },
    danger: { backgroundColor: col.bad },
  }))

  const fill: Record<ButtonVariant, string> = {
    primary: c.accent,
    soft: hovered ? c.accentHover : c.accentSoft,
    ghost: hovered ? c.hover : bordered ? c.bg : 'transparent',
    danger: c.bad,
  }
  const textColor: Record<ButtonVariant, string> = {
    primary: c.onAccent,
    soft: c.accent,
    ghost: c.text,
    danger: c.bg,
  }
  const style: ViewStyle[] = [
    s.base,
    small ? s.small : {},
    { backgroundColor: fill[variant] },
    variant === 'ghost' && bordered ? { borderWidth: 1, borderColor: c.ink3 } : {},
    fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
    disabled ? { opacity: 0.4 } : {},
    variant === 'primary' && hovered ? { opacity: 0.9 } : {},
    transition('transform, box-shadow, background-color, opacity'),
    ring.style,
  ]
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ...style,
        // pressed: back to rest, no shadow (7.1)
        pressed ? { transform: [{ translateY: 0 }], ...webStyle({ boxShadow: 'none' }) } : {},
      ]}
      {...hover}
      {...ring.handlers}
    >
      {Icon ? <Icon size={small ? 14 : 18} color={textColor[variant]} strokeWidth={1.75} /> : null}
      <Text style={[s.label, small ? s.labelSmall : {}, { color: textColor[variant] }]}>{label}</Text>
      <View />
    </Pressable>
  )
}
