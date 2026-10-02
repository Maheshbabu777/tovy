import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../theme'
import { type } from '../tokens'

// Style guide, Section header: the label in text, the count in mono text-3, a hairline under it, and an optional
// underlined action at the right (Reschedule).
export function SectionHeader({
  title,
  count,
  action,
  danger = false,
}: {
  title: string
  count?: number
  action?: { label: string; onPress: () => void; testID?: string }
  danger?: boolean // the title in red (Overdue)
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        paddingTop: 24,
        paddingBottom: 8,
        // The hairline runs as wide as the rows' lines (they reach 8 px past the column for their hover fill).
        marginHorizontal: -8,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      }}
    >
      <Text accessibilityRole="header" style={[type.label, { color: danger ? c.red : c.text }]}>
        {title}
      </Text>
      {count !== undefined ? <Text style={[type.monoS, { color: c.text3 }]}>{count}</Text> : null}
      <View style={{ flex: 1 }} />
      {action ? (
        <Pressable testID={action.testID} accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={[type.label, { color: c.text, textDecorationLine: 'underline' }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
