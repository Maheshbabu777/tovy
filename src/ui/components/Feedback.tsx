import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing, Platform, Text, View } from 'react-native'
import { Icons, type ToolkitIcon } from '../icons'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'

// Empty state: centred, at most 320 wide, a 32 px icon in text-3, an 18 px title and a 14 px body in text-2.
export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: ToolkitIcon
  title: string
  body: string
  children?: ReactNode
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      testID="empty-state"
      style={{ alignSelf: 'center', maxWidth: 320, paddingVertical: 64, alignItems: 'center' }}
    >
      <Icon size={32} color={c.text3} />
      <Text style={[type.title, { color: c.text, marginTop: 16, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.bodyS, { color: c.text2, marginTop: 4, textAlign: 'center' }]}>{body}</Text>
      {children ? <View style={{ marginTop: 20 }}>{children}</View> : null}
    </View>
  )
}

// Rows of a 20 px circle and two bars split by hairlines, pulsing 1 to 0.5 to 1 over 1.4 s. Only on the first load of a list.
export function Skeleton({ rows = 5 }: { rows?: number }) {
  const { theme } = useTheme()
  const c = theme.colors
  const [pulse] = useState(() => new Animated.Value(1))
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])
  const widths = ['72%', '60%', '88%', '66%', '80%']
  return (
    <Animated.View testID="skeleton" style={{ opacity: pulse }} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: c.line,
          }}
        >
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.hover }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                height: 14,
                width: widths[i % widths.length] as `${number}%`,
                borderRadius: radius.sm,
                backgroundColor: c.hover,
              }}
            />
            <View style={{ height: 10, width: '33%', borderRadius: radius.sm, backgroundColor: c.panel }} />
          </View>
        </View>
      ))}
    </Animated.View>
  )
}

// A hairline box, radius 10, padding 8 by 12, 13 px text, a 16 px icon. Offline is neutral, a sync error is red.
export function Banner({ kind, children }: { kind: 'offline' | 'error'; children: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  const error = kind === 'error'
  return (
    <View
      testID={`banner-${kind}`}
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: radius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: error ? c.badSoft : c.panel,
        borderWidth: 1,
        borderColor: error ? c.badSoft : c.line,
      }}
    >
      <Icons.offline size={16} color={error ? c.red : c.text2} />
      <Text style={[type.label, { color: error ? c.red : c.text2, flexShrink: 1 }]}>{children}</Text>
    </View>
  )
}
