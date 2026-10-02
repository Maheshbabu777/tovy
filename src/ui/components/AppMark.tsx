import { Text, View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { useTheme } from '../theme'
import { type } from '../tokens'

// Design 7.25: a rounded square (radius 10) in ink-1 with a 1 px ink-3 border and the app's first letter.
export function AppMark({ name, size = 24 }: { name: string; size?: number }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size <= 24 ? 7 : 10,
        backgroundColor: c.ink1,
        borderWidth: 1,
        borderColor: c.ink3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: size * 0.42, color: c.ink }}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}

// Design 7.4: 18 tall, radius 6, accent-soft fill, accent text, a small spark and "AI" (or the app name).
export function AIBadge({ label = 'AI' }: { label?: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      style={{
        height: 18,
        borderRadius: 6,
        paddingHorizontal: 6,
        backgroundColor: c.accentSoft,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Sparkles size={11} color={c.accent} strokeWidth={1.75} />
      <Text style={[type.micro, { color: c.accent }]}>{label}</Text>
    </View>
  )
}
