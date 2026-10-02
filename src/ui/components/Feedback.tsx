import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing, Platform, Text, View } from 'react-native'
import { Cloud, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'

// Design 7.22: centred, at most 320 wide, a 56 px ink-1 circle with a 24 px icon, a 17 px title, a 14 px body.
export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon
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
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.ink1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={c.ink6} strokeWidth={1.75} />
      </View>
      <Text style={[type.title, { color: c.ink, marginTop: 16, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.bodyS, { color: c.ink6, marginTop: 4, textAlign: 'center' }]}>{body}</Text>
      {children ? <View style={{ marginTop: 20 }}>{children}</View> : null}
    </View>
  )
}

// Design 7.23: rows of a 24 px circle and two bars, pulsing 1 to 0.5 to 1 over 1.4 s. Only on the first load of a list.
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
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 }}
        >
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.ink2 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                height: 14,
                width: widths[i % widths.length] as `${number}%`,
                borderRadius: radius.sm,
                backgroundColor: c.ink2,
              }}
            />
            <View style={{ height: 10, width: '33%', borderRadius: radius.sm, backgroundColor: c.ink1 }} />
          </View>
        </View>
      ))}
    </Animated.View>
  )
}

// Design 7.24: radius 10, padding 8 by 12, 13 px text, a 16 px cloud. Offline is neutral, a sync error is red.
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
        backgroundColor: error ? c.badSoft : c.ink1,
      }}
    >
      <Cloud size={16} color={error ? c.bad : c.ink7} strokeWidth={1.75} />
      <Text style={[type.label, { color: error ? c.bad : c.ink7, flexShrink: 1, fontFamily: undefined }]}>
        {children}
      </Text>
    </View>
  )
}
