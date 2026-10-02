import { Text, View } from 'react-native'
import { useTheme } from '../theme'
import { fonts } from '../tokens'

// A primary circle with the initials in on-primary, 40% of the size, weight 500.
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
        backgroundColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: size * 0.4, color: c.onPrimary }}>{initials || '?'}</Text>
    </View>
  )
}
