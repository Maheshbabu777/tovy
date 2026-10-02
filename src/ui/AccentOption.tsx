import { Pressable, Text, View } from 'react-native'
import { useTheme } from './theme'
import { fonts, radius } from './tokens'
import { transition, useFocusRing } from './components/web'

// Design 11.18: an option card (radius 14, 1 px ink-3 outline, the chosen one 2 px accent) with a 32 tall swatch and the name.
export function AccentOption({
  label,
  swatch,
  selected,
  onPress,
  testID,
}: {
  label: string
  swatch: string
  selected: boolean
  onPress: () => void
  testID: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        {
          flex: 1,
          borderRadius: radius.lg,
          padding: selected ? 11 : 12,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? c.accent : c.ink3,
          gap: 8,
        },
        transition('border-color'),
        ring.style,
      ]}
      {...ring.handlers}
    >
      <View style={{ height: 32, borderRadius: radius.md, backgroundColor: swatch }} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: c.ink }}>{label}</Text>
    </Pressable>
  )
}
