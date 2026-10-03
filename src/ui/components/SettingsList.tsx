import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Icons, type ToolkitIcon } from '../icons'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'
import { transition, useFocusRing, useHover } from './web'

// Style guide, Settings: an optional title (13/500 text-2, sentence case) over grouped rows in a hairline box, radius
// 12, with hairlines between rows.
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  const { theme } = useTheme()
  const c = theme.colors
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean) as ReactNode[]
  return (
    <View style={{ marginTop: 24 }}>
      {title ? <Text style={[type.label, { color: c.text2, marginLeft: 4, marginBottom: 8 }]}>{title}</Text> : null}
      <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : undefined}>
            {row}
          </View>
        ))}
      </View>
    </View>
  )
}

// A row at least 52 tall: the label, an optional value, then a chevron (it opens something) or a
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
  icon?: ToolkitIcon
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
  const ring = useFocusRing(c.primary)
  const tint = danger ? c.red : c.text
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value && onPress ? `${label}, ${value}` : undefined}
      onPress={onPress}
      // A row with a control (the theme switch) is not itself a button, but it must not mark itself disabled either:
      // that would mark the control inside it disabled for screen readers too.
      disabled={!onPress && !control}
      focusable={!!onPress}
      style={[
        {
          minHeight: 52,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: hovered && onPress ? c.hover : 'transparent',
        },
        transition('background-color'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      {/* Paper, Components: settings rows are words only, the label and its value. */}
      <Text style={[type.body, { flex: 1, color: tint }]}>{label}</Text>
      {value ? (
        <Text testID={valueTestID} style={[type.bodyS, { color: c.text2 }]}>
          {value}
        </Text>
      ) : null}
      {control}
      {onPress && chevron && !control ? <Icons.forward size={16} color={c.text3} /> : null}
    </Pressable>
  )
}
