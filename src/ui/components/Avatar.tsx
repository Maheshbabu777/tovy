import { Text, View } from 'react-native'
import { useTheme } from '../theme'
import { fonts } from '../tokens'

// Design 7.25: a circle in the accent colour with the initials in on-accent, 40% of the size, weight 500.
export function Avatar({ initials, size = 64 }: { initials: string; size?: number }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: size * 0.4, color: c.onAccent }}>{initials || '?'}</Text>
    </View>
  )
}
