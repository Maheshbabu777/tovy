import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../theme'
import { fonts, radius, type } from '../tokens'
import { transition, useFocusRing, useHover } from './web'

// Design 7.16. A group: an optional title (13/500 ink-6, sentence case) over a container with a 1 px ink-3 outline,
// radius 22 and 1 px dividers between rows.
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  const { theme } = useTheme()
  const c = theme.colors
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean) as ReactNode[]
  return (
    <View style={{ marginTop: 24 }}>
      {title ? <Text style={[type.label, { color: c.ink6, marginLeft: 4, marginBottom: 8 }]}>{title}</Text> : null}
      <View style={{ borderWidth: 1, borderColor: c.ink3, borderRadius: radius.xl, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.ink3 } : undefined}>
            {row}
          </View>
        ))}
      </View>
    </View>
  )
}

// A row at least 56 tall: an optional 19 px icon, the label, an optional value, then a chevron (it opens something) or a
// control on the right.
export function Row({
  label,
  icon: Icon,
  value,
  onPress,
  danger = false,
  chevron = true,
  control,
  testID,
  valueTestID,
}: {
  label: string
  icon?: LucideIcon
  value?: string
  onPress?: () => void
  danger?: boolean
  chevron?: boolean // false for an action (Sign out) that does not open a page
  control?: ReactNode
  testID?: string
  valueTestID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  const tint = danger ? c.bad : c.ink
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value && onPress ? `${label}, ${value}` : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          minHeight: 56,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: hovered && onPress ? c.ink1 : 'transparent',
        },
        transition('background-color'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      {Icon ? <Icon size={19} color={danger ? c.bad : c.ink6} strokeWidth={1.75} /> : null}
      <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: tint }}>{label}</Text>
      {value ? (
        <Text testID={valueTestID} style={{ fontFamily: fonts.sans, fontSize: 14, color: c.ink6 }}>
          {value}
        </Text>
      ) : null}
      {control}
      {onPress && chevron && !control ? <ChevronRight size={16} color={c.ink5} strokeWidth={1.75} /> : null}
    </Pressable>
  )
}
