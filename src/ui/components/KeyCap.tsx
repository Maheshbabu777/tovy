import { Text, View } from 'react-native'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'

// A keyboard key hint (web): mono 11 in a hairline box. `inverse` sits on a primary fill.
export function KeyCap({ label, inverse = false }: { label: string; inverse?: boolean }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        borderRadius: radius.xs,
        borderWidth: 1,
        borderColor: inverse ? c.onPrimary : c.line,
        opacity: inverse ? 0.6 : 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[type.monoXs, { color: inverse ? c.onPrimary : c.text2 }]}>{label}</Text>
    </View>
  )
}
